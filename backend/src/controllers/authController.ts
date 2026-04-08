import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/database';
import logger from '../config/logger';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { sendVerificationEmail, sendWelcomeEmail, sendWelcomeSMS } from '../utils/notifications';

const generatePatientIdBySerial = (year: number, serial: number): string => {
  return `PT-${year}-${String(serial).padStart(4, '0')}`;
};

const getNextPatientSerialForYear = async (client: any, year: number): Promise<number> => {
  const pattern = `^PT-${year}-(\\d+)$`;
  const result = await client.query(
    `
      SELECT COALESCE(MAX((regexp_match(patient_id, $1))[1]::INTEGER), 0) AS max_serial
      FROM users
      WHERE role = 'patient' AND patient_id ~ $1
    `,
    [pattern]
  );

  return Number(result.rows[0]?.max_serial || 0) + 1;
};

const resolvePatientIdForResponse = (user: any) => {
  if (user.patient_id) {
    return user.patient_id;
  }

  if (user.role !== 'patient') {
    return null;
  }

  if (user.blockchain_identity && String(user.blockchain_identity).trim().length > 0) {
    return user.blockchain_identity;
  }

  const createdYear = new Date(user.created_at || Date.now()).getFullYear();
  const numericTail = String(user.id || '').replace(/\D/g, '').slice(-4);
  const serial = numericTail.length ? numericTail : '0001';
  return `PT-${createdYear}-${serial.padStart(4, '0')}`;
};

type UsersSchema = {
  columns: Set<string>;
  passwordColumn: 'password' | 'password_hash';
  phoneColumn: 'phone' | 'phone_number' | null;
};

const getUsersSchema = async (client: any): Promise<UsersSchema> => {
  const result = await client.query(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'users'
    `
  );

  const columns = new Set<string>(result.rows.map((row: { column_name: string }) => row.column_name));
  const passwordColumn = columns.has('password_hash')
    ? 'password_hash'
    : columns.has('password')
    ? 'password'
    : null;
  const phoneColumn = columns.has('phone')
    ? 'phone'
    : columns.has('phone_number')
    ? 'phone_number'
    : null;

  if (!passwordColumn) {
    throw new Error('Cannot authenticate users: neither password nor password_hash column exists on users table');
  }

  return {
    columns,
    passwordColumn,
    phoneColumn,
  };
};

export const register = async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    const { email, password, firstName, lastName, phoneNumber, dateOfBirth, address, emergencyContact } = req.body;
    const usersSchema = await getUsersSchema(client);
    const hasColumn = (columnName: string) => usersSchema.columns.has(columnName);

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

    const insertUserRow: Record<string, unknown> = {
      email,
      first_name: firstName,
      last_name: lastName,
      role,
      [usersSchema.passwordColumn]: hashedPassword,
    };

    if (usersSchema.phoneColumn && phoneNumber) {
      insertUserRow[usersSchema.phoneColumn] = phoneNumber;
    }

    if (hasColumn('date_of_birth') && dateOfBirth) {
      insertUserRow.date_of_birth = dateOfBirth;
    }

    if (hasColumn('address') && address) {
      insertUserRow.address = address;
    }

    if (hasColumn('emergency_contact') && emergencyContact) {
      insertUserRow.emergency_contact = emergencyContact;
    }

    if (hasColumn('qr_code')) {
      insertUserRow.qr_code = qrCode;
    }

    if (hasColumn('verification_token')) {
      insertUserRow.verification_token = verificationToken;
    }

    if (hasColumn('email_verified')) {
      insertUserRow.email_verified = false;
    }

    const entries = Object.entries(insertUserRow).filter(([, value]) => value !== undefined);
    const columns = entries.map(([key]) => key);
    const values = entries.map(([, value]) => value);
    const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');

    // Insert user and fetch id
    const result = await client.query(
      `INSERT INTO users (${columns.join(', ')}) VALUES (${placeholders}) RETURNING id`,
      values
    );

    const insertedUserId = result.rows[0].id;

    const userSelectFields = [
      'id',
      'email',
      'first_name',
      'last_name',
      'role',
      hasColumn('qr_code') ? 'qr_code' : 'NULL AS qr_code',
      hasColumn('created_at') ? 'created_at' : 'CURRENT_TIMESTAMP AS created_at',
      hasColumn('email_verified') ? 'email_verified' : 'true AS email_verified',
    ];

    const userResult = await client.query(
      `SELECT ${userSelectFields.join(', ')} FROM users WHERE id = $1`,
      [insertedUserId]
    );

    const user = userResult.rows[0];

    // Generate patient ID
    let patientId: string | null = null;
    if (hasColumn('patient_id')) {
      const year = new Date(user.created_at).getFullYear();
      const nextSerial = await getNextPatientSerialForYear(client, year);
      patientId = generatePatientIdBySerial(year, nextSerial);

      // Retry once if there is a race creating the same patient_id.
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          await client.query(
            'UPDATE users SET patient_id = $1 WHERE id = $2',
            [patientId, user.id]
          );
          break;
        } catch (error: any) {
          if (error?.code !== '23505' || attempt === 1) {
            throw error;
          }

          const retrySerial = await getNextPatientSerialForYear(client, year);
          patientId = generatePatientIdBySerial(year, retrySerial);
        }
      }
    }

    if (hasColumn('verification_token') && hasColumn('email_verified')) {
      const verificationSent = await sendVerificationEmail(email, `${firstName} ${lastName}`, verificationToken);
      logger.info(`Verification email sent: ${verificationSent}`);
    }

    // Send welcome email
    const welcomeSent = await sendWelcomeEmail(email, `${firstName} ${lastName}`, patientId || 'N/A');
    logger.info(`Welcome email sent: ${welcomeSent}`);
    
    // Send welcome SMS if phone number provided
    if (phoneNumber) {
      const smsSent = await sendWelcomeSMS(phoneNumber, `${firstName} ${lastName}`, patientId || 'N/A');
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
      message:
        hasColumn('verification_token') && hasColumn('email_verified')
          ? 'User registered successfully. Please check your email to verify your account.'
          : 'User registered successfully.',
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
    const usersSchema = await getUsersSchema(client);
    const hasColumn = (columnName: string) => usersSchema.columns.has(columnName);

    // Find user
    const selectFields = [
      'id',
      'email',
      `${usersSchema.passwordColumn} AS password_hash`,
      'first_name',
      'last_name',
      'role',
      hasColumn('is_active') ? 'is_active' : 'true AS is_active',
      hasColumn('qr_code') ? 'qr_code' : 'NULL AS qr_code',
      hasColumn('patient_id') ? 'patient_id' : 'NULL AS patient_id',
      hasColumn('blockchain_identity') ? 'blockchain_identity' : 'NULL AS blockchain_identity',
      hasColumn('email_verified') ? 'email_verified' : 'true AS email_verified',
      hasColumn('created_at') ? 'created_at' : 'CURRENT_TIMESTAMP AS created_at',
    ];

    const result = await client.query(
      `SELECT ${selectFields.join(', ')} FROM users WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const resolvedPatientId = resolvePatientIdForResponse(user);

    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
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
        patientId: resolvedPatientId,
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
    const usersSchema = await getUsersSchema(client);
    const hasColumn = (columnName: string) => usersSchema.columns.has(columnName);
    const phoneColumn = usersSchema.phoneColumn;

    const selectFields = [
      'id',
      'email',
      'first_name',
      'last_name',
      'role',
      phoneColumn ? `${phoneColumn} AS phone_number` : 'NULL AS phone_number',
      hasColumn('date_of_birth') ? 'date_of_birth' : 'NULL AS date_of_birth',
      hasColumn('address') ? 'address' : 'NULL AS address',
      hasColumn('emergency_contact') ? 'emergency_contact' : 'NULL AS emergency_contact',
      hasColumn('qr_code') ? 'qr_code' : 'NULL AS qr_code',
      hasColumn('patient_id') ? 'patient_id' : 'NULL AS patient_id',
      hasColumn('blockchain_identity') ? 'blockchain_identity' : 'NULL AS blockchain_identity',
      hasColumn('email_verified') ? 'email_verified' : 'true AS email_verified',
      hasColumn('created_at') ? 'created_at' : 'CURRENT_TIMESTAMP AS created_at',
    ];

    const result = await client.query(
      `SELECT ${selectFields.join(', ')} FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    const resolvedPatientId = resolvePatientIdForResponse(user);

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
        patientId: resolvedPatientId,
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
    const usersSchema = await getUsersSchema(client);
    const hasColumn = (columnName: string) => usersSchema.columns.has(columnName);
    const phoneColumn = usersSchema.phoneColumn;

    const parsedDOB = !dateOfBirth || dateOfBirth.trim() === "" ? null : dateOfBirth;

    const updateSegments: string[] = [];
    const updateValues: unknown[] = [];

    updateValues.push(firstName);
    updateSegments.push(`first_name = $${updateValues.length}`);

    updateValues.push(lastName);
    updateSegments.push(`last_name = $${updateValues.length}`);

    if (phoneColumn) {
      updateValues.push(phoneNumber);
      updateSegments.push(`${phoneColumn} = $${updateValues.length}`);
    }

    if (hasColumn('date_of_birth')) {
      updateValues.push(parsedDOB);
      updateSegments.push(`date_of_birth = $${updateValues.length}`);
    }

    if (hasColumn('address')) {
      updateValues.push(address);
      updateSegments.push(`address = $${updateValues.length}`);
    }

    if (hasColumn('emergency_contact')) {
      updateValues.push(emergencyContact);
      updateSegments.push(`emergency_contact = $${updateValues.length}`);
    }

    if (hasColumn('updated_at')) {
      updateSegments.push('updated_at = CURRENT_TIMESTAMP');
    }

    updateValues.push(userId);
    const userIdPlaceholder = `$${updateValues.length}`;

    const returnFields = [
      'id',
      'email',
      'first_name',
      'last_name',
      'role',
      phoneColumn ? `${phoneColumn} AS phone_number` : 'NULL AS phone_number',
      hasColumn('date_of_birth') ? 'date_of_birth' : 'NULL AS date_of_birth',
      hasColumn('address') ? 'address' : 'NULL AS address',
      hasColumn('emergency_contact') ? 'emergency_contact' : 'NULL AS emergency_contact',
    ];

    const result = await client.query(
      `UPDATE users
       SET ${updateSegments.join(', ')}
       WHERE id = ${userIdPlaceholder}
       RETURNING ${returnFields.join(', ')}`,
      updateValues
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
    const usersSchema = await getUsersSchema(client);

    // Only patients can generate QR codes
    if (role !== 'patient') {
      return res.status(403).json({ error: 'Only patients can generate QR codes' });
    }

    if (!usersSchema.columns.has('qr_code')) {
      return res.status(400).json({ error: 'QR code feature is not enabled in current database schema' });
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
    const usersSchema = await getUsersSchema(client);
    const passwordColumn = usersSchema.passwordColumn;

    // Get current password
    const userResult = await client.query(
      `SELECT ${passwordColumn} AS password_hash FROM users WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, userResult.rows[0].password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await client.query(
      `UPDATE users SET ${passwordColumn} = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
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
    const usersSchema = await getUsersSchema(client);

    if (!usersSchema.columns.has('verification_token') || !usersSchema.columns.has('email_verified')) {
      return res.status(400).json({ error: 'Email verification is not enabled in current database schema' });
    }

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
    const usersSchema = await getUsersSchema(client);

    if (!usersSchema.columns.has('verification_token') || !usersSchema.columns.has('email_verified')) {
      return res.status(400).json({ error: 'Email verification is not enabled in current database schema' });
    }

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
