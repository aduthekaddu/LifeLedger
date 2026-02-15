import { Request, Response } from 'express';
import pool from '../config/database';
import logger from '../config/logger';
import { AuthRequest } from '../middleware/auth';

export const searchPatients = async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();
  
  try {
    const query = req.query.query as string;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Search query required' });
    }

    const searchTerm = query.toLowerCase();

    const result = await client.query(
      `SELECT id, first_name, last_name, email, phone_number, patient_id
       FROM users
       WHERE role = 'patient' 
       AND (
         CAST(id AS TEXT) LIKE $1 
         OR LOWER(patient_id) LIKE $2
         OR LOWER(first_name) LIKE $2 
         OR LOWER(last_name) LIKE $2
         OR LOWER(email) LIKE $2
       )
       LIMIT 20`,
      [`%${query}%`, `%${searchTerm}%`]
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

    const result = await client.query(
      `SELECT DISTINCT p.id, p.first_name, p.last_name, p.email, p.phone_number, ar.status
       FROM users p
       JOIN access_requests ar ON p.id = ar.patient_id
       WHERE ar.doctor_id = $1 AND ar.status = 'approved'
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
