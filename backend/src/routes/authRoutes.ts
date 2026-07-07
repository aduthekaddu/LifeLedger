import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { query, withTransaction } from '../db/client';
import {
  attachSessionCookie,
  clearSessionCookie,
  requireAuth,
  signSession,
} from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { badRequest, conflict, unauthorized } from '../utils/errors';
import type { AuthUser, Role } from '../types/domain';
import { writeAuditEvent } from '../services/auditService';

const router = Router();

function publicUser(row: {
  id: string;
  email: string;
  role: Role;
  full_name: string;
  phone: string | null;
}): AuthUser & { phone: string | null } {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    fullName: row.full_name,
    phone: row.phone,
  };
}

router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const { email, password, fullName, phone, dateOfBirth, bloodType } = req.body ?? {};

    if (!email || !password || !fullName) {
      throw badRequest('email, password, and fullName are required');
    }

    if (String(password).length < 12) {
      throw badRequest('Password must be at least 12 characters');
    }

    const id = uuid();
    const passwordHash = await bcrypt.hash(String(password), 12);

    const user = await withTransaction(async (client) => {
      const existing = await client.query('SELECT id FROM users WHERE email = $1', [
        String(email).toLowerCase(),
      ]);
      if (existing.rowCount) {
        throw conflict('An account already exists for this email');
      }

      const created = await client.query<{
        id: string;
        email: string;
        role: Role;
        full_name: string;
        phone: string | null;
      }>(
        `INSERT INTO users (id, email, password_hash, role, full_name, phone)
         VALUES ($1, $2, $3, 'patient', $4, $5)
         RETURNING id, email, role, full_name, phone`,
        [id, String(email).toLowerCase(), passwordHash, fullName, phone ?? null],
      );

      await client.query(
        `INSERT INTO patient_profiles (user_id, date_of_birth, blood_type)
         VALUES ($1, $2, $3)`,
        [id, dateOfBirth ?? null, bloodType ?? null],
      );

      await writeAuditEvent(
        {
          actorId: id,
          patientId: id,
          action: 'patient_registered',
          purpose: 'account_setup',
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        },
        client,
      );

      return publicUser(created.rows[0]);
    });

    const token = signSession(user);
    attachSessionCookie(res, token);
    res.status(201).json({ user });
  }),
);

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body ?? {};
    if (!email || !password) {
      throw badRequest('email and password are required');
    }

    const result = await query<{
      id: string;
      email: string;
      role: Role;
      full_name: string;
      phone: string | null;
      password_hash: string;
    }>(
      `SELECT id, email, role, full_name, phone, password_hash
       FROM users
       WHERE email = $1`,
      [String(email).toLowerCase()],
    );

    const row = result.rows[0];
    if (!row || !(await bcrypt.compare(String(password), row.password_hash))) {
      throw unauthorized('Invalid email or password');
    }

    const user = publicUser(row);
    const token = signSession(user);
    attachSessionCookie(res, token);
    await writeAuditEvent({
      actorId: user.id,
      patientId: user.role === 'patient' ? user.id : null,
      action: 'session_started',
      purpose: 'authentication',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
    res.json({ user });
  }),
);

router.post('/logout', (_req, res) => {
  clearSessionCookie(res);
  res.status(204).send();
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;
