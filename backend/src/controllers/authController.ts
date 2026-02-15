import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/database';
import logger from '../config/logger';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { sendVerificationEmail, sendWelcomeEmail, sendWelcomeSMS } from '../utils/notifications';

// Generate patient ID in format PT-YYYY-NNNN
const generatePatientId = (id: number, year: number): string => {
  const paddedId = id.toString().padStart(4, '0');
  return `PT-${year}-${paddedId}`;
};

export const register = async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    const { email, password, firstName, lastName, phoneNumber, dateOfBirth, address, emergencyContact } = req.body;

    // Only allow patient registration from public form
    const role = 'patient';

    // Check if user exists
    const existingUser = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate QR code and verification token for patients
    const qrCode = uuidv4();
    const verificationToken = uuidv4();

    // Insert user
    const result = await client.query(
      `INSERT INTO users (email, password, first_name, last_name, role, phone_number, date_of_birth, address, emergency_contact, qr_code, verification_token, email_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id, email, first_name, last_name, role, qr_code, created_at`,
      [email, hashedPassword, firstName, lastName, role, phoneNumber, dateOfBirth, address, emergencyContact, qrCode, verificationToken, false]
    );

    const user = result.rows[0];

    // Generate patient ID
    const year = new Date(user.created_at).getFullYear();
    const patientId = generatePatientId(user.id, year);
    
    await client.query(
      'UPDATE users SET patient_id = $1 WHERE id = $2',
      [patientId, user.id]
    );

    // Send verification email
    const verificationSent = await sendVerificationEmail(email, `${firstName} ${lastName}`, verificationToken);
    logger.info(`Verification email sent: ${verificationSent}`);

    // Send welcome email
    const welcomeSent = await sendWelcomeEmail(email, `${firstName} ${lastName}`, patientId);
    logger.info(`Welcome email sent: ${welcomeSent}`);
    
    // Send welcome SMS if phone number provided
    if (phoneNumber) {
      const smsSent = await sendWelcomeSMS(phoneNumber, `${firstName} ${lastName}`, patientId);
      logger.info(`Welcome SMS sent: ${smsSent}`);
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    logger.info(`User registered: ${email} (${role}) - Patient ID: ${patientId}`);

    res.status(201).json({
      message: 'User registered successfully. Please check your email to verify your account.',
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        qrCode: user.qr_code,
        patientId: patientId,
        emailVerified: false,
      },
    });
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  } finally {
    client.release();
  }
};

export const login = async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    const { email, password } = req.body;

    // Find user
    const result = await client.query(
      'SELECT id, email, password, first_name, last_name, role, is_active, qr_code, patient_id, email_verified FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    logger.info(`User logged in: ${email}`);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        qrCode: user.qr_code,
        patientId: user.patient_id,
        emailVerified: user.email_verified,
      },
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  } finally {
    client.release();
  }
};

export const getProfile = async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    const userId = (req as any).user.id;

    const result = await client.query(
      `SELECT id, email, first_name, last_name, role, phone_number, date_of_birth, 
              address, emergency_contact, qr_code, patient_id, email_verified, created_at
       FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    // Return camelCase for frontend consistency
    res.json({ 
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        phoneNumber: user.phone_number,
        dateOfBirth: user.date_of_birth,
        address: user.address,
        emergencyContact: user.emergency_contact,
        qrCode: user.qr_code,
        patientId: user.patient_id,
        emailVerified: user.email_verified,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  } finally {
    client.release();
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    const userId = (req as any).user.id;
    const { firstName, lastName, phoneNumber, dateOfBirth, address, emergencyContact } = req.body;

    const result = await client.query(
      `UPDATE users 
       SET first_name = $1, last_name = $2, phone_number = $3, date_of_birth = $4, 
           address = $5, emergency_contact = $6, updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING id, email, first_name, last_name, role, phone_number, date_of_birth, address, emergency_contact`,
      [firstName, lastName, phoneNumber, dateOfBirth, address, emergencyContact, userId]
    );

    logger.info(`Profile updated for user: ${userId}`);

    res.json({
      message: 'Profile updated successfully',
      user: result.rows[0],
    });
  } catch (error) {
    logger.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  } finally {
    client.release();
  }
};

export const generateQRCode = async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    const userId = (req as any).user.id;
    const role = (req as any).user.role;

    // Only patients can generate QR codes
    if (role !== 'patient') {
      return res.status(403).json({ error: 'Only patients can generate QR codes' });
    }

    // Generate new UUID QR code
    const qrCode = uuidv4();

    // Update user's QR code
    await client.query(
      'UPDATE users SET qr_code = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [qrCode, userId]
    );

    logger.info(`New QR code generated for user: ${userId}`);

    res.json({
      message: 'QR code generated successfully',
      qrCode: qrCode,
    });
  } catch (error) {
    logger.error('Generate QR code error:', error);
    res.status(500).json({ error: 'Failed to generate QR code' });
  } finally {
    client.release();
  }
};
export const changePassword = async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    const userId = (req as any).user.id;
    const { currentPassword, newPassword } = req.body;

    // Get current password
    const userResult = await client.query(
      'SELECT password FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, userResult.rows[0].password);
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await client.query(
      'UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hashedPassword, userId]
    );

    logger.info(`Password changed for user: ${userId}`);

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    logger.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  } finally {
    client.release();
  }
};


export const verifyEmail = async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    const { token } = req.body;

    // Find user by verification token
    const result = await client.query(
      'SELECT id, email, first_name, last_name FROM users WHERE verification_token = $1',
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    const user = result.rows[0];

    // Update user as verified
    await client.query(
      'UPDATE users SET email_verified = true, verification_token = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    logger.info(`Email verified for user: ${user.email}`);

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    logger.error('Email verification error:', error);
    res.status(500).json({ error: 'Failed to verify email' });
  } finally {
    client.release();
  }
};

export const resendVerification = async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    const userId = (req as any).user.id;

    // Get user details
    const result = await client.query(
      'SELECT email, first_name, last_name, email_verified FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    if (user.email_verified) {
      return res.status(400).json({ error: 'Email already verified' });
    }

    // Generate new verification token
    const verificationToken = uuidv4();
    
    await client.query(
      'UPDATE users SET verification_token = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [verificationToken, userId]
    );

    // Send verification email
    await sendVerificationEmail(user.email, `${user.first_name} ${user.last_name}`, verificationToken);

    logger.info(`Verification email resent to: ${user.email}`);

    res.json({ message: 'Verification email sent' });
  } catch (error) {
    logger.error('Resend verification error:', error);
    res.status(500).json({ error: 'Failed to resend verification email' });
  } finally {
    client.release();
  }
};
