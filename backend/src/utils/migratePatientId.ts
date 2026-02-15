import pool from '../config/database';
import logger from '../config/logger';

// Generate patient ID in format PT-YYYY-NNNN
const generatePatientId = (id: number, year: number): string => {
  const paddedId = id.toString().padStart(4, '0');
  return `PT-${year}-${paddedId}`;
};

export const migratePatientIds = async () => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Add patient_id column if it doesn't exist
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS patient_id VARCHAR(20) UNIQUE,
      ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS verification_token TEXT
    `);

    // Get all patients without patient_id
    const patients = await client.query(`
      SELECT id, created_at 
      FROM users 
      WHERE role = 'patient' AND patient_id IS NULL
      ORDER BY id
    `);

    logger.info(`Found ${patients.rows.length} patients without patient_id`);

    // Generate patient IDs
    for (const patient of patients.rows) {
      const year = new Date(patient.created_at).getFullYear();
      const patientId = generatePatientId(patient.id, year);
      
      await client.query(
        'UPDATE users SET patient_id = $1 WHERE id = $2',
        [patientId, patient.id]
      );
      
      logger.info(`Generated patient ID ${patientId} for user ${patient.id}`);
    }

    await client.query('COMMIT');
    logger.info('Patient ID migration completed successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Patient ID migration error:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Run migration if called directly
if (require.main === module) {
  migratePatientIds()
    .then(() => {
      logger.info('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Migration failed:', error);
      process.exit(1);
    });
}
