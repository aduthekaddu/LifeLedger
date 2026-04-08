import { Request, Response } from 'express';
import pool from '../config/database';
import logger from '../config/logger';
import bcrypt from 'bcryptjs';
import { AuthRequest } from '../middleware/auth';

type ColumnInfo = {
  column_name: string;
  data_type: string;
};

const getTableColumns = async (client: any, tableName: string) => {
  const result = await client.query(
    `
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
    `,
    [tableName]
  );

  return new Map<string, string>(
    result.rows.map((row: ColumnInfo) => [row.column_name, row.data_type])
  );
};

const getUsersSchema = async (client: any) => {
  const usersColumns = await getTableColumns(client, 'users');
  const hasUserColumn = (column: string) => usersColumns.has(column);

  const phoneColumn = hasUserColumn('phone')
    ? 'phone'
    : hasUserColumn('phone_number')
    ? 'phone_number'
    : null;

  const passwordColumn = hasUserColumn('password_hash')
    ? 'password_hash'
    : hasUserColumn('password')
    ? 'password'
    : null;

  return {
    usersColumns,
    hasUserColumn,
    phoneColumn,
    passwordColumn,
  };
};

export const getDoctors = async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();
  
  try {
    const { hasUserColumn, phoneColumn } = await getUsersSchema(client);
    const selectFields = [
      'id',
      'email',
      'first_name',
      'last_name',
      phoneColumn ? `${phoneColumn} AS phone_number` : 'NULL AS phone_number',
      hasUserColumn('is_active') ? 'is_active' : 'true AS is_active',
      hasUserColumn('created_at') ? 'created_at' : 'CURRENT_TIMESTAMP AS created_at',
    ];

    const result = await client.query(
      `SELECT ${selectFields.join(', ')}
       FROM users
       WHERE role = 'doctor'
       ORDER BY created_at DESC`
    );

    res.json({ doctors: result.rows });
  } catch (error) {
    logger.error('Get doctors error:', error);
    res.status(500).json({ error: 'Failed to get doctors' });
  } finally {
    client.release();
  }
};

export const addDoctor = async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();
  
  try {
    const { email, password, firstName, lastName, phoneNumber } = req.body;
    const { hasUserColumn, phoneColumn, passwordColumn } = await getUsersSchema(client);

    if (!passwordColumn) {
      throw new Error('Cannot add doctor: neither password nor password_hash column exists');
    }

    // Check if doctor exists
    const existing = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Doctor already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const doctorRow: Record<string, unknown> = {
      email,
      first_name: firstName,
      last_name: lastName,
      role: 'doctor',
      [passwordColumn]: hashedPassword,
    };

    if (phoneColumn && phoneNumber) {
      doctorRow[phoneColumn] = phoneNumber;
    }

    if (hasUserColumn('is_active')) {
      doctorRow.is_active = true;
    }

    if (hasUserColumn('email_verified')) {
      doctorRow.email_verified = true;
    }

    const entries = Object.entries(doctorRow).filter(([, value]) => value !== undefined);
    const columns = entries.map(([key]) => key);
    const values = entries.map(([, value]) => value);
    const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');

    const returningFields = [
      'id',
      'email',
      'first_name',
      'last_name',
      phoneColumn ? `${phoneColumn} AS phone_number` : 'NULL AS phone_number',
      hasUserColumn('created_at') ? 'created_at' : 'CURRENT_TIMESTAMP AS created_at',
    ];

    // Insert doctor
    const result = await client.query(
      `INSERT INTO users (${columns.join(', ')})
       VALUES (${placeholders})
       RETURNING ${returningFields.join(', ')}`,
      values
    );

    logger.info(`Doctor added by admin ${req.user!.id}: ${email}`);

    res.status(201).json({
      message: 'Doctor added successfully',
      doctor: result.rows[0],
    });
  } catch (error) {
    logger.error('Add doctor error:', error);
    res.status(500).json({ error: 'Failed to add doctor' });
  } finally {
    client.release();
  }
};

export const updateDoctor = async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    const { firstName, lastName, phoneNumber, isActive } = req.body;
    const { hasUserColumn, phoneColumn } = await getUsersSchema(client);

    const updates: string[] = [];
    const values: unknown[] = [];

    values.push(firstName);
    updates.push(`first_name = $${values.length}`);

    values.push(lastName);
    updates.push(`last_name = $${values.length}`);

    if (phoneColumn) {
      values.push(phoneNumber);
      updates.push(`${phoneColumn} = $${values.length}`);
    }

    if (hasUserColumn('is_active')) {
      values.push(isActive);
      updates.push(`is_active = $${values.length}`);
    }

    if (hasUserColumn('updated_at')) {
      updates.push('updated_at = CURRENT_TIMESTAMP');
    }

    values.push(id);
    const idPlaceholder = `$${values.length}`;

    const returningFields = [
      'id',
      'email',
      'first_name',
      'last_name',
      phoneColumn ? `${phoneColumn} AS phone_number` : 'NULL AS phone_number',
      hasUserColumn('is_active') ? 'is_active' : 'true AS is_active',
    ];

    const result = await client.query(
      `UPDATE users
       SET ${updates.join(', ')}
       WHERE id = ${idPlaceholder} AND role = 'doctor'
       RETURNING ${returningFields.join(', ')}`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    logger.info(`Doctor ${id} updated by admin ${req.user!.id}`);

    res.json({
      message: 'Doctor updated successfully',
      doctor: result.rows[0],
    });
  } catch (error) {
    logger.error('Update doctor error:', error);
    res.status(500).json({ error: 'Failed to update doctor' });
  } finally {
    client.release();
  }
};

export const deleteDoctor = async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;

    // Soft delete by deactivating
    const result = await client.query(
      `UPDATE users
       SET is_active = false, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND role = 'doctor'
       RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    logger.info(`Doctor ${id} deactivated by admin ${req.user!.id}`);

    res.json({ message: 'Doctor deactivated successfully' });
  } catch (error) {
    logger.error('Delete doctor error:', error);
    res.status(500).json({ error: 'Failed to delete doctor' });
  } finally {
    client.release();
  }
};

export const getDashboardStats = async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();
  
  try {
    const accessLogsColumns = await getTableColumns(client, 'access_logs');
    const hasAccessLogsColumn = (column: string) => accessLogsColumns.has(column);

    // Get counts
    const patientsCount = await client.query('SELECT COUNT(*) FROM users WHERE role = $1', ['patient']);
    const doctorsCount = await client.query('SELECT COUNT(*) FROM users WHERE role = $1', ['doctor']);
    const recordsCount = await client.query('SELECT COUNT(*) FROM medical_records');
    const accessRequestsCount = await client.query('SELECT COUNT(*) FROM access_requests WHERE status = $1', ['pending']);

    // Get recent activity
    const accessTypeSelect = hasAccessLogsColumn('access_type') ? 'al.access_type' : 'NULL AS access_type';
    const joinUser = hasAccessLogsColumn('user_id')
      ? 'LEFT JOIN users u ON al.user_id::text = u.id::text'
      : 'LEFT JOIN users u ON FALSE';
    const joinPatient = hasAccessLogsColumn('patient_id')
      ? 'LEFT JOIN users p ON al.patient_id::text = p.id::text'
      : 'LEFT JOIN users p ON FALSE';

    const recentLogs = await client.query(
      `SELECT al.action, ${accessTypeSelect}, al.created_at,
              u.first_name as user_first_name, u.last_name as user_last_name, u.role,
              p.first_name as patient_first_name, p.last_name as patient_last_name
       FROM access_logs al
       ${joinUser}
       ${joinPatient}
       ORDER BY al.created_at DESC
       LIMIT 10`
    );

    res.json({
      stats: {
        patients: parseInt(patientsCount.rows[0].count),
        doctors: parseInt(doctorsCount.rows[0].count),
        records: parseInt(recordsCount.rows[0].count),
        pendingRequests: parseInt(accessRequestsCount.rows[0].count),
      },
      recentActivity: recentLogs.rows,
    });
  } catch (error) {
    logger.error('Get dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to get dashboard stats' });
  } finally {
    client.release();
  }
};

export const getPatients = async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();
  
  try {
    const { phoneColumn } = await getUsersSchema(client);

    const result = await client.query(
      `SELECT id, email, first_name, last_name,
              ${phoneColumn ? `${phoneColumn} AS phone_number` : 'NULL AS phone_number'},
              date_of_birth, created_at
       FROM users
       WHERE role = 'patient'
       ORDER BY created_at DESC
       LIMIT 100`
    );

    res.json({ patients: result.rows });
  } catch (error) {
    logger.error('Get patients error:', error);
    res.status(500).json({ error: 'Failed to get patients' });
  } finally {
    client.release();
  }
};
