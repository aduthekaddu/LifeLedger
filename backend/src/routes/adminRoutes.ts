import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { query, withTransaction } from '../db/client';
import { requireAuth, requireRole } from '../middleware/auth';
import { writeAuditEvent } from '../services/auditService';
import { asyncHandler } from '../utils/asyncHandler';
import { badRequest, conflict } from '../utils/errors';
import type { Role } from '../types/domain';

const router = Router();

router.use(requireAuth, requireRole('admin'));

router.get(
  '/dashboard',
  asyncHandler(async (_req, res) => {
    const [users, activeConsents, auditEvents, records] = await Promise.all([
      query(`SELECT role, count(*)::int AS count FROM users GROUP BY role`),
      query(`SELECT count(*)::int AS count FROM consents WHERE status = 'active' AND expires_at > now()`),
      query(`SELECT count(*)::int AS count FROM audit_events WHERE created_at > now() - interval '7 days'`),
      query(`SELECT count(*)::int AS count FROM records`),
    ]);

    res.json({
      users: users.rows,
      activeConsents: activeConsents.rows[0]?.count ?? 0,
      auditEventsLast7Days: auditEvents.rows[0]?.count ?? 0,
      records: records.rows[0]?.count ?? 0,
    });
  }),
);

router.post(
  '/providers',
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const { email, password, fullName, phone, organization, specialty, npi } = req.body ?? {};
    if (!email || !password || !fullName || !organization) {
      throw badRequest('email, password, fullName, and organization are required');
    }

    if (String(password).length < 12) {
      throw badRequest('Password must be at least 12 characters');
    }

    const provider = await withTransaction(async (client) => {
      const existing = await client.query('SELECT id FROM users WHERE email = $1', [
        String(email).toLowerCase(),
      ]);
      if (existing.rowCount) {
        throw conflict('An account already exists for this email');
      }

      const id = uuid();
      const passwordHash = await bcrypt.hash(String(password), 12);
      const created = await client.query<{
        id: string;
        email: string;
        role: Role;
        full_name: string;
        phone: string | null;
      }>(
        `INSERT INTO users (id, email, password_hash, role, full_name, phone, verified_at)
         VALUES ($1, $2, $3, 'doctor', $4, $5, now())
         RETURNING id, email, role, full_name, phone`,
        [id, String(email).toLowerCase(), passwordHash, fullName, phone ?? null],
      );

      await client.query(
        `INSERT INTO provider_profiles (user_id, organization, specialty, npi, verification_status)
         VALUES ($1, $2, $3, $4, 'verified')`,
        [id, organization, specialty ?? null, npi ?? null],
      );

      await writeAuditEvent(
        {
          actorId: user.id,
          action: 'provider_created',
          purpose: 'provider_verification',
          metadata: { providerId: id, organization },
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        },
        client,
      );

      return created.rows[0];
    });

    res.status(201).json({ provider });
  }),
);

router.patch(
  '/providers/:providerId/verification',
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const { status } = req.body ?? {};
    if (!['pending', 'verified', 'suspended'].includes(status)) {
      throw badRequest('status must be pending, verified, or suspended');
    }

    const result = await withTransaction(async (client) => {
      const updated = await client.query(
        `UPDATE provider_profiles
         SET verification_status = $2, updated_at = now()
         WHERE user_id = $1
         RETURNING user_id, organization, specialty, npi, verification_status`,
        [req.params.providerId, status],
      );

      await writeAuditEvent(
        {
          actorId: user.id,
          action: 'provider_verification_changed',
          purpose: 'provider_verification',
          metadata: { providerId: req.params.providerId, status },
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        },
        client,
      );

      return updated.rows[0];
    });

    res.json({ provider: result });
  }),
);

export default router;
