import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { query, withTransaction } from '../db/client';
import { requireAuth } from '../middleware/auth';
import { normalizeScopes } from '../domain/policy';
import { writeAuditEvent } from '../services/auditService';
import { asyncHandler } from '../utils/asyncHandler';
import { badRequest, forbidden, notFound } from '../utils/errors';

const router = Router();

router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const patientId = String(req.query.patientId ?? user.id);

    if (user.role === 'patient' && patientId !== user.id) {
      throw forbidden();
    }

    const where =
      user.role === 'doctor'
        ? 'WHERE grantee_id = $1'
        : user.role === 'patient'
          ? 'WHERE patient_id = $1'
          : 'WHERE ($1::uuid IS NULL OR patient_id = $1)';
    const params = user.role === 'admin' ? [req.query.patientId ?? null] : [user.id];

    const result = await query(
      `SELECT c.id, c.patient_id, c.grantee_id, c.grantee_email, c.purpose, c.scopes,
              c.status, c.starts_at, c.expires_at, c.revoked_at, c.created_at,
              p.full_name AS patient_name, g.full_name AS grantee_name
       FROM consents c
       JOIN users p ON p.id = c.patient_id
       LEFT JOIN users g ON g.id = c.grantee_id
       ${where}
       ORDER BY c.created_at DESC
       LIMIT 100`,
      params,
    );

    res.json({ consents: result.rows });
  }),
);

router.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = req.user!;
    if (user.role !== 'patient') {
      throw forbidden('Only patients can create active consent grants');
    }

    const { granteeId, granteeEmail, purpose, scopes = ['documents'], expiresAt } = req.body ?? {};
    if (!purpose || !expiresAt || (!granteeId && !granteeEmail)) {
      throw badRequest('granteeId or granteeEmail, purpose, and expiresAt are required');
    }

    const normalizedScopes = normalizeScopes(scopes);
    const consent = await withTransaction(async (client) => {
      const result = await client.query(
        `INSERT INTO consents (
          id, patient_id, grantee_id, grantee_email, purpose, scopes, status, expires_at, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, 'active', $7, $8)
        RETURNING id, patient_id, grantee_id, grantee_email, purpose, scopes,
                  status, starts_at, expires_at, revoked_at`,
        [
          uuid(),
          user.id,
          granteeId ?? null,
          granteeEmail ? String(granteeEmail).toLowerCase() : null,
          purpose,
          normalizedScopes,
          expiresAt,
          user.id,
        ],
      );

      await writeAuditEvent(
        {
          actorId: user.id,
          patientId: user.id,
          action: 'consent_granted',
          purpose: 'data_sharing',
          metadata: { scopes: normalizedScopes, granteeId, granteeEmail },
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        },
        client,
      );

      return result.rows[0];
    });

    res.status(201).json({ consent });
  }),
);

router.post(
  '/requests',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = req.user!;
    if (user.role !== 'doctor') {
      throw forbidden('Only doctors can request consent');
    }

    const { patientId, purpose, scopes = ['documents'], expiresAt } = req.body ?? {};
    if (!patientId || !purpose || !expiresAt) {
      throw badRequest('patientId, purpose, and expiresAt are required');
    }

    const normalizedScopes = normalizeScopes(scopes);
    const consent = await withTransaction(async (client) => {
      const result = await client.query(
        `INSERT INTO consents (
          id, patient_id, grantee_id, grantee_email, purpose, scopes, status, expires_at, created_by
        ) VALUES ($1, $2, $3, NULL, $4, $5, 'pending', $6, $7)
        RETURNING id, patient_id, grantee_id, purpose, scopes, status, starts_at, expires_at`,
        [uuid(), patientId, user.id, purpose, normalizedScopes, expiresAt, user.id],
      );

      await writeAuditEvent(
        {
          actorId: user.id,
          patientId,
          action: 'consent_requested',
          purpose: 'care_access_request',
          metadata: { scopes: normalizedScopes },
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        },
        client,
      );

      return result.rows[0];
    });

    res.status(201).json({
      consent,
      note: 'Emergency access cannot be requested from this endpoint.',
    });
  }),
);

router.patch(
  '/:consentId/approve',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = req.user!;
    if (user.role !== 'patient') {
      throw forbidden('Only patients can approve consent requests');
    }

    const result = await withTransaction(async (client) => {
      const updated = await client.query(
        `UPDATE consents
         SET status = 'active', updated_at = now()
         WHERE id = $1 AND patient_id = $2 AND status = 'pending'
         RETURNING id, patient_id, grantee_id, purpose, scopes, status, starts_at, expires_at`,
        [req.params.consentId, user.id],
      );

      if (!updated.rows[0]) {
        throw notFound('Pending consent request not found');
      }

      await writeAuditEvent(
        {
          actorId: user.id,
          patientId: user.id,
          action: 'consent_request_approved',
          purpose: 'data_sharing',
          metadata: { consentId: req.params.consentId },
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        },
        client,
      );

      return updated.rows[0];
    });

    res.json({ consent: result });
  }),
);

router.patch(
  '/:consentId/revoke',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const result = await withTransaction(async (client) => {
      const updated = await client.query(
        `UPDATE consents
         SET status = 'revoked', revoked_at = now(), updated_at = now()
         WHERE id = $1 AND ($2::text = 'admin' OR patient_id = $3)
         RETURNING id, patient_id, grantee_id, purpose, scopes, status, starts_at, expires_at, revoked_at`,
        [req.params.consentId, user.role, user.id],
      );

      if (!updated.rows[0]) {
        throw notFound('Consent grant not found');
      }

      await writeAuditEvent(
        {
          actorId: user.id,
          patientId: updated.rows[0].patient_id,
          action: 'consent_revoked',
          purpose: 'data_sharing',
          metadata: { consentId: req.params.consentId },
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        },
        client,
      );

      return updated.rows[0];
    });

    res.json({ consent: result });
  }),
);

export default router;
