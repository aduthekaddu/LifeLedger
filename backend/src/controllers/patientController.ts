import { Request, Response } from 'express';
import pool from '../config/database';
import logger from '../config/logger';
import { AuthRequest } from '../middleware/auth';

type ColumnInfo = {
  column_name: string;
};

const getUsersColumns = async (client: any) => {
  const result = await client.query(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'users'
    `
  );

  return new Set<string>(result.rows.map((row: ColumnInfo) => row.column_name));
};

const resolveUsersPhoneColumn = (usersColumns: Set<string>) => {
  if (usersColumns.has('phone')) return 'phone';
  if (usersColumns.has('phone_number')) return 'phone_number';
  return null;
};

export const searchPatients = async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();
  
  try {
    const query = req.query.query as string;
    const usersColumns = await getUsersColumns(client);
    const phoneColumn = resolveUsersPhoneColumn(usersColumns);
    const hasPatientId = usersColumns.has('patient_id');

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Search query required' });
    }

    const searchTerm = query.toLowerCase();

    const patientIdSelect = hasPatientId ? 'patient_id' : 'NULL AS patient_id';
    const patientIdPredicate = hasPatientId ? 'LOWER(patient_id) LIKE $1 OR' : '';

    const result = await client.query(
      `SELECT id, first_name, last_name, email,
              ${phoneColumn ? `${phoneColumn} AS phone_number` : 'NULL AS phone_number'},
              ${patientIdSelect}
       FROM users
       WHERE role = 'patient' 
       AND (
         ${patientIdPredicate}
         LOWER(first_name) LIKE $1 
         OR LOWER(last_name) LIKE $1
         OR LOWER(email) LIKE $1
       )
       LIMIT 20`,
      [`%${searchTerm}%`]
    );

    res.json({ patients: result.rows });
  } catch (error) {
    logger.error('Search patients error:', error);
    res.status(500).json({ error: 'Failed to search patients' });
  } finally {
    client.release();
  }
};

export const getMyPatients = async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();
  
  try {
    const doctorId = req.user!.id;
    const usersColumns = await getUsersColumns(client);
    const phoneColumn = resolveUsersPhoneColumn(usersColumns);
    const hasPatientId = usersColumns.has('patient_id');

    const result = await client.query(
      `SELECT DISTINCT p.id, p.first_name, p.last_name, p.email,
              ${phoneColumn ? `p.${phoneColumn} AS phone_number` : 'NULL AS phone_number'},
              ${hasPatientId ? 'p.patient_id' : 'NULL AS patient_id'},
              ar.status
       FROM users p
       JOIN access_requests ar ON p.id::text = ar.patient_id::text
       WHERE ar.doctor_id::text = $1::text AND ar.status = 'approved'
       ORDER BY p.last_name, p.first_name`,
      [doctorId]
    );

    res.json({ patients: result.rows });
  } catch (error) {
    logger.error('Get my patients error:', error);
    res.status(500).json({ error: 'Failed to get patients' });
  } finally {
    client.release();
  }
};

export const getConsentStats = async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();
  
  try {
    const patientId = req.user!.id;

    const totalDoctors = await client.query(
      'SELECT COUNT(DISTINCT doctor_id) FROM access_requests WHERE patient_id = $1',
      [patientId]
    );

    const approvedDoctors = await client.query(
      'SELECT COUNT(DISTINCT doctor_id) FROM access_requests WHERE patient_id = $1 AND status = $2',
      [patientId, 'approved']
    );

    const pendingRequests = await client.query(
      'SELECT COUNT(*) FROM access_requests WHERE patient_id = $1 AND status = $2',
      [patientId, 'pending']
    );

    res.json({
      stats: {
        totalDoctors: parseInt(totalDoctors.rows[0].count),
        approvedDoctors: parseInt(approvedDoctors.rows[0].count),
        pendingRequests: parseInt(pendingRequests.rows[0].count),
      },
    });
  } catch (error) {
    logger.error('Get consent stats error:', error);
    res.status(500).json({ error: 'Failed to get consent stats' });
  } finally {
    client.release();
  }
};
