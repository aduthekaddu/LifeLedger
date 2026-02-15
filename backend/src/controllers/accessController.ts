import { Request, Response } from 'express';
import pool from '../config/database';
import logger from '../config/logger';
import { AuthRequest } from '../middleware/auth';
import { 
  sendAccessRequestNotification, 
  sendAccessResponseNotification, 
  sendEmergencyAccessNotification,
  sendAccessRequestSMS,
  sendEmergencyAccessSMS
} from '../utils/notifications';

export const requestAccess = async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();
  
  try {
    const doctorId = req.user!.id;
    const { patientId, reason, isEmergency } = req.body;

    // Check if request already exists
    const existing = await client.query(
      `SELECT id, status FROM access_requests 
       WHERE doctor_id = $1 AND patient_id = $2 AND status IN ('pending', 'approved')`,
      [doctorId, patientId]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ 
        error: 'Access request already exists',
        status: existing.rows[0].status 
      });
    }

    // Get patient and doctor details for notification
    const patientResult = await client.query(
      'SELECT email, first_name, last_name, phone_number FROM users WHERE id = $1',
      [patientId]
    );
    
    const doctorResult = await client.query(
      'SELECT first_name, last_name FROM users WHERE id = $1',
      [doctorId]
    );

    const patient = patientResult.rows[0];
    const doctor = doctorResult.rows[0];

    // Create access request
    const result = await client.query(
      `INSERT INTO access_requests (doctor_id, patient_id, reason, is_emergency, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, doctor_id, patient_id, status, is_emergency, requested_at`,
      [doctorId, patientId, reason, isEmergency || false, isEmergency ? 'approved' : 'pending']
    );

    // Create notification for patient
    await client.query(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES ($1, $2, $3, $4)`,
      [
        patientId,
        isEmergency ? 'Emergency Access Granted' : 'New Access Request',
        `Dr. ${doctor.first_name} ${doctor.last_name} has ${isEmergency ? 'accessed your records in an emergency' : 'requested access to your medical records'}`,
        isEmergency ? 'emergency' : 'access_request'
      ]
    );

    // Log action
    await client.query(
      `INSERT INTO access_logs (user_id, patient_id, action, access_type)
       VALUES ($1, $2, $3, $4)`,
      [doctorId, patientId, 'REQUEST_ACCESS', isEmergency ? 'emergency' : 'normal']
    );

    // Send email notification
    if (!isEmergency) {
      const emailSent = await sendAccessRequestNotification(
        patient.email,
        `${patient.first_name} ${patient.last_name}`,
        `${doctor.first_name} ${doctor.last_name}`,
        reason
      );
      logger.info(`Access request email sent: ${emailSent}`);
      
      // Send SMS notification if phone number available
      if (patient.phone_number) {
        const smsSent = await sendAccessRequestSMS(
          patient.phone_number,
          `${patient.first_name} ${patient.last_name}`,
          `${doctor.first_name} ${doctor.last_name}`
        );
        logger.info(`Access request SMS sent: ${smsSent}`);
      }
    }

    logger.info(`Access request created by doctor ${doctorId} for patient ${patientId}`);

    res.status(201).json({
      message: isEmergency ? 'Emergency access granted' : 'Access request sent',
      request: result.rows[0],
    });
  } catch (error) {
    logger.error('Request access error:', error);
    res.status(500).json({ error: 'Failed to request access' });
  } finally {
    client.release();
  }
};

export const respondToRequest = async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();
  
  try {
    const patientId = req.user!.id;
    const { requestId, status } = req.body;

    if (!['approved', 'denied'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Verify request belongs to patient and get doctor details
    const requestResult = await client.query(
      `SELECT ar.doctor_id, d.email as doctor_email, d.first_name as doctor_first_name, d.last_name as doctor_last_name,
              p.first_name as patient_first_name, p.last_name as patient_last_name
       FROM access_requests ar
       JOIN users d ON ar.doctor_id = d.id
       JOIN users p ON ar.patient_id = p.id
       WHERE ar.id = $1 AND ar.patient_id = $2`,
      [requestId, patientId]
    );

    if (requestResult.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const { doctor_id, doctor_email, doctor_first_name, doctor_last_name, patient_first_name, patient_last_name } = requestResult.rows[0];

    // Update request
    await client.query(
      `UPDATE access_requests 
       SET status = $1, responded_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [status, requestId]
    );

    // Create consent record if approved
    if (status === 'approved') {
      await client.query(
        `INSERT INTO consents (patient_id, doctor_id, granted, granted_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
        [patientId, doctor_id, true]
      );
    }

    // Notify doctor
    await client.query(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES ($1, $2, $3, $4)`,
      [
        doctor_id,
        `Access Request ${status === 'approved' ? 'Approved' : 'Denied'}`,
        `Your access request has been ${status}`,
        'access_response'
      ]
    );

    // Send email notification
    await sendAccessResponseNotification(
      doctor_email,
      `${doctor_first_name} ${doctor_last_name}`,
      `${patient_first_name} ${patient_last_name}`,
      status as 'approved' | 'denied'
    );

    logger.info(`Access request ${requestId} ${status} by patient ${patientId}`);

    res.json({ message: `Access request ${status}` });
  } catch (error) {
    logger.error('Respond to request error:', error);
    res.status(500).json({ error: 'Failed to respond to request' });
  } finally {
    client.release();
  }
};

export const getAccessRequests = async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();
  
  try {
    const userId = req.user!.id;
    const role = req.user!.role;

    let query = '';
    let params: any[] = [];

    if (role === 'patient') {
      query = `
        SELECT ar.id, ar.status, ar.reason, ar.is_emergency, ar.requested_at, ar.responded_at,
               d.first_name as doctor_first_name, d.last_name as doctor_last_name, d.email as doctor_email
        FROM access_requests ar
        JOIN users d ON ar.doctor_id = d.id
        WHERE ar.patient_id = $1
        ORDER BY ar.requested_at DESC
      `;
      params = [userId];
    } else if (role === 'doctor') {
      query = `
        SELECT ar.id, ar.status, ar.reason, ar.is_emergency, ar.requested_at, ar.responded_at,
               p.first_name as patient_first_name, p.last_name as patient_last_name, p.email as patient_email
        FROM access_requests ar
        JOIN users p ON ar.patient_id = p.id
        WHERE ar.doctor_id = $1
        ORDER BY ar.requested_at DESC
      `;
      params = [userId];
    } else {
      return res.status(403).json({ error: 'Admins cannot view access requests' });
    }

    const result = await client.query(query, params);

    res.json({ requests: result.rows });
  } catch (error) {
    logger.error('Get access requests error:', error);
    res.status(500).json({ error: 'Failed to get access requests' });
  } finally {
    client.release();
  }
};

export const revokeAccess = async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();
  
  try {
    const patientId = req.user!.id;
    const { doctorId } = req.body;

    // Update access request
    await client.query(
      `UPDATE access_requests 
       SET status = 'revoked'
       WHERE patient_id = $1 AND doctor_id = $2 AND status = 'approved'`,
      [patientId, doctorId]
    );

    // Update consent
    await client.query(
      `UPDATE consents 
       SET granted = false, revoked_at = CURRENT_TIMESTAMP
       WHERE patient_id = $1 AND doctor_id = $2`,
      [patientId, doctorId]
    );

    // Notify doctor
    await client.query(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES ($1, $2, $3, $4)`,
      [doctorId, 'Access Revoked', 'A patient has revoked your access to their records', 'access_revoked']
    );

    logger.info(`Access revoked by patient ${patientId} for doctor ${doctorId}`);

    res.json({ message: 'Access revoked successfully' });
  } catch (error) {
    logger.error('Revoke access error:', error);
    res.status(500).json({ error: 'Failed to revoke access' });
  } finally {
    client.release();
  }
};

export const getAccessLogs = async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();
  
  try {
    const userId = req.user!.id;
    const role = req.user!.role;

    let query = '';
    let params: any[] = [];

    if (role === 'patient') {
      query = `
        SELECT al.id, al.action, al.access_type, al.created_at,
               u.first_name, u.last_name, u.email, u.role
        FROM access_logs al
        JOIN users u ON al.user_id = u.id
        WHERE al.patient_id = $1
        ORDER BY al.created_at DESC
        LIMIT 100
      `;
      params = [userId];
    } else if (role === 'doctor') {
      query = `
        SELECT al.id, al.action, al.access_type, al.created_at,
               p.first_name as patient_first_name, p.last_name as patient_last_name
        FROM access_logs al
        JOIN users p ON al.patient_id = p.id
        WHERE al.user_id = $1
        ORDER BY al.created_at DESC
        LIMIT 100
      `;
      params = [userId];
    } else if (role === 'admin') {
      query = `
        SELECT al.id, al.action, al.access_type, al.created_at,
               u.first_name as user_first_name, u.last_name as user_last_name, u.role,
               p.first_name as patient_first_name, p.last_name as patient_last_name
        FROM access_logs al
        JOIN users u ON al.user_id = u.id
        JOIN users p ON al.patient_id = p.id
        ORDER BY al.created_at DESC
        LIMIT 200
      `;
      params = [];
    }

    const result = await client.query(query, params);

    res.json({ logs: result.rows });
  } catch (error) {
    logger.error('Get access logs error:', error);
    res.status(500).json({ error: 'Failed to get access logs' });
  } finally {
    client.release();
  }
};

export const emergencyAccess = async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();
  
  try {
    const doctorId = req.user!.id;
    const { qrCode, reason } = req.body;

    // Find patient by QR code
    const patientResult = await client.query(
      'SELECT id, first_name, last_name, email FROM users WHERE qr_code = $1 AND role = $2',
      [qrCode, 'patient']
    );

    if (patientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid QR code' });
    }

    const patient = patientResult.rows[0];

    // Get doctor details
    const doctorResult = await client.query(
      'SELECT first_name, last_name FROM users WHERE id = $1',
      [doctorId]
    );
    
    const doctor = doctorResult.rows[0];

    // Create emergency access request (auto-approved)
    await client.query(
      `INSERT INTO access_requests (doctor_id, patient_id, reason, is_emergency, status)
       VALUES ($1, $2, $3, $4, $5)`,
      [doctorId, patient.id, reason, true, 'approved']
    );

    // Log emergency access
    await client.query(
      `INSERT INTO access_logs (user_id, patient_id, action, access_type)
       VALUES ($1, $2, $3, $4)`,
      [doctorId, patient.id, 'EMERGENCY_ACCESS', 'qr_code']
    );

    // Notify patient
    await client.query(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES ($1, $2, $3, $4)`,
      [patient.id, 'Emergency Access', `Dr. ${doctor.first_name} ${doctor.last_name} accessed your records via QR code in an emergency`, 'emergency']
    );

    // Send emergency email notification
    await sendEmergencyAccessNotification(
      patient.email,
      `${patient.first_name} ${patient.last_name}`,
      `${doctor.first_name} ${doctor.last_name}`,
      reason
    );
    
    // Send emergency SMS notification if phone number available
    if (patient.email) {
      const patientPhone = await client.query(
        'SELECT phone_number FROM users WHERE id = $1',
        [patient.id]
      );
      
      if (patientPhone.rows[0]?.phone_number) {
        await sendEmergencyAccessSMS(
          patientPhone.rows[0].phone_number,
          `${patient.first_name} ${patient.last_name}`,
          `${doctor.first_name} ${doctor.last_name}`
        );
      }
    }

    logger.info(`Emergency access granted to doctor ${doctorId} for patient ${patient.id}`);

    res.json({
      message: 'Emergency access granted',
      patient: {
        id: patient.id,
        firstName: patient.first_name,
        lastName: patient.last_name,
      },
    });
  } catch (error) {
    logger.error('Emergency access error:', error);
    res.status(500).json({ error: 'Failed to grant emergency access' });
  } finally {
    client.release();
  }
};
