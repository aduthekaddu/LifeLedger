import { Request, Response } from 'express';
import pool from '../config/database';
import logger from '../config/logger';
import bcrypt from 'bcryptjs';
import { AuthRequest } from '../middleware/auth';

export const getDoctors = async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();
  
  try {
    const result = await client.query(
      `SELECT id, email, first_name, last_name, phone_number, is_active, created_at
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

    // Check if doctor exists
    const existing = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Doctor already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert doctor
    const result = await client.query(
      `INSERT INTO users (email, password, first_name, last_name, phone_number, role)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, first_name, last_name, phone_number, created_at`,
      [email, hashedPassword, firstName, lastName, phoneNumber, 'doctor']
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

    const result = await client.query(
      `UPDATE users
       SET first_name = $1, last_name = $2, phone_number = $3, is_active = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 AND role = 'doctor'
       RETURNING id, email, first_name, last_name, phone_number, is_active`,
      [firstName, lastName, phoneNumber, isActive, id]
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
    // Get counts
    const patientsCount = await client.query('SELECT COUNT(*) FROM users WHERE role = $1', ['patient']);
    const doctorsCount = await client.query('SELECT COUNT(*) FROM users WHERE role = $1', ['doctor']);
    const recordsCount = await client.query('SELECT COUNT(*) FROM medical_records');
    const accessRequestsCount = await client.query('SELECT COUNT(*) FROM access_requests WHERE status = $1', ['pending']);

    // Get recent activity
    const recentLogs = await client.query(
      `SELECT al.action, al.access_type, al.created_at,
              u.first_name as user_first_name, u.last_name as user_last_name, u.role,
              p.first_name as patient_first_name, p.last_name as patient_last_name
       FROM access_logs al
       JOIN users u ON al.user_id = u.id
       JOIN users p ON al.patient_id = p.id
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
    const result = await client.query(
      `SELECT id, email, first_name, last_name, phone_number, date_of_birth, created_at
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
