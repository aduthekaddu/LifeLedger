import pool from '../config/database';
import logger from '../config/logger';

export const initializeDatabase = async () => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const ensureMedicalRecordsSchema = async () => {
      await client.query(`
        ALTER TABLE medical_records
        ADD COLUMN IF NOT EXISTS ai_insights TEXT,
        ADD COLUMN IF NOT EXISTS extracted_text TEXT,
        ADD COLUMN IF NOT EXISTS ipfs_cid TEXT
      `);
    };

    const ensureUniquePatientIds = async () => {
      const usersColumnsResult = await client.query(
        `
          SELECT column_name
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'users'
        `
      );
      const usersColumns = new Set<string>(usersColumnsResult.rows.map((row: { column_name: string }) => row.column_name));

      if (!usersColumns.has('patient_id')) {
        await client.query('ALTER TABLE users ADD COLUMN patient_id VARCHAR(20)');
      }

      const duplicateCountResult = await client.query(
        `
          SELECT COUNT(*)::INTEGER AS count
          FROM (
            SELECT patient_id
            FROM users
            WHERE role = 'patient' AND patient_id IS NOT NULL
            GROUP BY patient_id
            HAVING COUNT(*) > 1
          ) duplicates
        `
      );

      const nullCountResult = await client.query(
        `
          SELECT COUNT(*)::INTEGER AS count
          FROM users
          WHERE role = 'patient' AND patient_id IS NULL
        `
      );

      const duplicateCount = Number(duplicateCountResult.rows[0]?.count || 0);
      const nullCount = Number(nullCountResult.rows[0]?.count || 0);

      if (duplicateCount > 0 || nullCount > 0) {
        await client.query(
          `
            WITH ordered_patients AS (
              SELECT
                id,
                EXTRACT(YEAR FROM COALESCE(created_at, CURRENT_TIMESTAMP))::INTEGER AS year,
                ROW_NUMBER() OVER (
                  PARTITION BY EXTRACT(YEAR FROM COALESCE(created_at, CURRENT_TIMESTAMP))::INTEGER
                  ORDER BY COALESCE(created_at, CURRENT_TIMESTAMP), id
                ) AS serial
              FROM users
              WHERE role = 'patient'
            )
            UPDATE users AS u
            SET patient_id = CONCAT('PT-', op.year, '-', LPAD(op.serial::TEXT, 4, '0'))
            FROM ordered_patients op
            WHERE u.id = op.id
          `
        );

        logger.warn(`Rebuilt patient IDs for ${duplicateCount} duplicate groups and ${nullCount} null entries`);
      }

      await client.query(
        `
          CREATE UNIQUE INDEX IF NOT EXISTS uq_users_patient_id
          ON users(patient_id)
          WHERE role = 'patient' AND patient_id IS NOT NULL
        `
      );
    };

    const createIndexIfColumnExists = async (indexName: string, tableName: string, columnName: string) => {
      const isValidIdentifier = (value: string) => /^[a-z_][a-z0-9_]*$/i.test(value);
      if (!isValidIdentifier(indexName) || !isValidIdentifier(tableName) || !isValidIdentifier(columnName)) {
        throw new Error(`Invalid identifier for index creation: ${indexName}, ${tableName}, ${columnName}`);
      }

      const columnExistsResult = await client.query(
        `
          SELECT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = $1
              AND column_name = $2
          ) AS exists
        `,
        [tableName, columnName]
      );

      if (columnExistsResult.rows[0]?.exists) {
        await client.query(`CREATE INDEX IF NOT EXISTS ${indexName} ON ${tableName}(${columnName})`);
      }
    };

    const usersTableExistsResult = await client.query(`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'users'
      ) AS exists
    `);

    let userIdType = 'INTEGER';
    if (usersTableExistsResult.rows[0]?.exists) {
      const usersIdTypeResult = await client.query(`
        SELECT data_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'users'
          AND column_name = 'id'
      `);

      if (usersIdTypeResult.rows[0]?.data_type === 'uuid') {
        userIdType = 'UUID';
      }
    }

    // Users table
    if (usersTableExistsResult.rows[0]?.exists) {
      logger.info(`Users table already exists with id type: ${userIdType}`);
    } else {
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          first_name VARCHAR(100) NOT NULL,
          last_name VARCHAR(100) NOT NULL,
          role VARCHAR(20) NOT NULL CHECK (role IN ('patient', 'doctor', 'admin')),
          phone_number VARCHAR(20),
          date_of_birth DATE,
          address TEXT,
          emergency_contact VARCHAR(255),
          qr_code TEXT,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }

    // Medical records table
    await client.query(`
      CREATE TABLE IF NOT EXISTS medical_records (
        id SERIAL PRIMARY KEY,
        patient_id ${userIdType} REFERENCES users(id) ON DELETE CASCADE,
        doctor_id ${userIdType} REFERENCES users(id) ON DELETE SET NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        record_type VARCHAR(50),
        record_date DATE NOT NULL,
        file_path TEXT,
        file_hash TEXT,
        ipfs_hash TEXT,
        blockchain_hash TEXT,
        is_encrypted BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Access requests table
    await client.query(`
      CREATE TABLE IF NOT EXISTS access_requests (
        id SERIAL PRIMARY KEY,
        doctor_id ${userIdType} REFERENCES users(id) ON DELETE CASCADE,
        patient_id ${userIdType} REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'revoked')),
        reason TEXT,
        is_emergency BOOLEAN DEFAULT false,
        requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        responded_at TIMESTAMP,
        expires_at TIMESTAMP
      )
    `);

    // Access logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS access_logs (
        id SERIAL PRIMARY KEY,
        user_id ${userIdType} REFERENCES users(id) ON DELETE CASCADE,
        patient_id ${userIdType} REFERENCES users(id) ON DELETE CASCADE,
        record_id INTEGER REFERENCES medical_records(id) ON DELETE SET NULL,
        action VARCHAR(50) NOT NULL,
        ip_address VARCHAR(45),
        user_agent TEXT,
        access_type VARCHAR(20) CHECK (access_type IN ('normal', 'emergency', 'qr_code')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Consents table
    await client.query(`
      CREATE TABLE IF NOT EXISTS consents (
        id SERIAL PRIMARY KEY,
        patient_id ${userIdType} REFERENCES users(id) ON DELETE CASCADE,
        doctor_id ${userIdType} REFERENCES users(id) ON DELETE CASCADE,
        granted BOOLEAN DEFAULT false,
        granted_at TIMESTAMP,
        revoked_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Notifications table
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id ${userIdType} REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50),
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes only when the target columns exist
    await createIndexIfColumnExists('idx_users_email', 'users', 'email');
    await createIndexIfColumnExists('idx_users_role', 'users', 'role');
    await createIndexIfColumnExists('idx_medical_records_patient', 'medical_records', 'patient_id');
    await createIndexIfColumnExists('idx_medical_records_doctor', 'medical_records', 'doctor_id');
    await createIndexIfColumnExists('idx_access_requests_doctor', 'access_requests', 'doctor_id');
    await createIndexIfColumnExists('idx_access_requests_patient', 'access_requests', 'patient_id');
    await createIndexIfColumnExists('idx_access_logs_user', 'access_logs', 'user_id');
    await createIndexIfColumnExists('idx_access_logs_patient', 'access_logs', 'patient_id');
    await ensureMedicalRecordsSchema();
    await createIndexIfColumnExists('idx_medical_records_ipfs_cid', 'medical_records', 'ipfs_cid');
    await ensureUniquePatientIds();

    await client.query('COMMIT');
    logger.info('Database initialized successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error initializing database:', error);
    throw error;
  } finally {
    client.release();
  }
};
