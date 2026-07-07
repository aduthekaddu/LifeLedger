import crypto from 'crypto';
import { Router } from 'express';
import QRCode from 'qrcode';
import { v4 as uuid } from 'uuid';
import { env } from '../config/env';
import { query, withTransaction } from '../db/client';
import { emergencyPacketScopes } from '../domain/policy';
import { requireAuth } from '../middleware/auth';
import { writeAuditEvent } from '../services/auditService';
import { asyncHandler } from '../utils/asyncHandler';
import { badRequest, forbidden, notFound } from '../utils/errors';

const router = Router();

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function newToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

async function findEmergencyToken(rawToken: string) {
  const result = await query<{
    id: string;
    patient_id: string;
    scopes: string[];
    label: string;
    expires_at: string;
    revoked_at: string | null;
  }>(
    `SELECT id, patient_id, scopes, label, expires_at, revoked_at
     FROM emergency_tokens
     WHERE token_hash = $1`,
    [hashToken(rawToken)],
  );

  const token = result.rows[0];
  if (!token || token.revoked_at || new Date(token.expires_at) <= new Date()) {
    throw notFound('Emergency packet is unavailable or expired');
  }

  return token;
}

async function buildEmergencyPacket(patientId: string, scopes: string[]) {
  const emergencyScopes = emergencyPacketScopes(scopes);
  const profile = await query(
    `SELECT u.id, u.full_name, u.phone, p.date_of_birth, p.blood_type,
            p.emergency_summary, p.care_directives, p.preferred_language
     FROM users u
     JOIN patient_profiles p ON p.user_id = u.id
     WHERE u.id = $1`,
    [patientId],
  );

  const contacts = await query(
    `SELECT name, relationship, phone, email
     FROM emergency_contacts
     WHERE patient_id = $1
     ORDER BY created_at DESC
     LIMIT 5`,
    [patientId],
  );

  const entries = await query(
    `SELECT id, type, title, status, onset_date, value_text, unit, notes, created_at
     FROM clinical_entries
     WHERE patient_id = $1
       AND (
         ($2::text[] @> ARRAY['allergies'] AND type = 'allergy') OR
         ($2::text[] @> ARRAY['conditions'] AND type = 'condition') OR
         ($2::text[] @> ARRAY['medications'] AND type = 'medication') OR
         ($2::text[] @> ARRAY['immunizations'] AND type = 'immunization') OR
         ($2::text[] @> ARRAY['care_plans'] AND type = 'care_plan')
       )
     ORDER BY created_at DESC
     LIMIT 40`,
    [patientId, emergencyScopes],
  );

  return {
    profile: profile.rows[0],
    emergencyContacts: contacts.rows,
    entries: entries.rows,
    scopes: emergencyScopes,
    disclaimer:
      'Emergency packet data is patient-controlled and should be verified with the patient, caregiver, or treating clinician when possible.',
  };
}

router.post(
  '/tokens',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = req.user!;
    if (user.role !== 'patient') {
      throw forbidden('Only patients can create emergency tokens');
    }

    const { label = 'Emergency card', scopes = ['allergies', 'conditions', 'medications'] } =
      req.body ?? {};
    const expiresInHours = Math.min(Number(req.body?.expiresInHours ?? 24), 72);
    if (!Number.isFinite(expiresInHours) || expiresInHours <= 0) {
      throw badRequest('expiresInHours must be a positive number');
    }

    const rawToken = newToken();
    const emergencyScopes = emergencyPacketScopes(scopes);
    if (emergencyScopes.length === 0) {
      throw badRequest('Emergency tokens must include at least one emergency-safe scope');
    }

    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);
    const packetUrl = `${env.frontendUrl}/emergency/${rawToken}`;
    const qrDataUrl = await QRCode.toDataURL(packetUrl);

    const token = await withTransaction(async (client) => {
      const result = await client.query(
        `INSERT INTO emergency_tokens (id, patient_id, token_hash, scopes, label, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, patient_id, scopes, label, expires_at, created_at`,
        [uuid(), user.id, hashToken(rawToken), emergencyScopes, label, expiresAt],
      );

      await writeAuditEvent(
        {
          actorId: user.id,
          patientId: user.id,
          action: 'emergency_token_created',
          purpose: 'emergency_preparedness',
          metadata: { scopes: emergencyScopes, label, expiresAt },
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        },
        client,
      );

      return result.rows[0];
    });

    res.status(201).json({ token, rawToken, packetUrl, qrDataUrl });
  }),
);

router.get(
  '/tokens',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = req.user!;
    if (user.role !== 'patient') {
      throw forbidden('Only patients can list emergency tokens');
    }

    const result = await query(
      `SELECT id, label, scopes, expires_at, last_used_at, revoked_at, created_at
       FROM emergency_tokens
       WHERE patient_id = $1
       ORDER BY created_at DESC`,
      [user.id],
    );

    res.json({ tokens: result.rows });
  }),
);

router.patch(
  '/tokens/:tokenId/revoke',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = req.user!;
    if (user.role !== 'patient') {
      throw forbidden('Only patients can revoke emergency tokens');
    }

    const result = await query(
      `UPDATE emergency_tokens
       SET revoked_at = now()
       WHERE id = $1 AND patient_id = $2
       RETURNING id, label, scopes, expires_at, revoked_at`,
      [req.params.tokenId, user.id],
    );

    if (!result.rows[0]) {
      throw notFound('Emergency token not found');
    }

    await writeAuditEvent({
      actorId: user.id,
      patientId: user.id,
      action: 'emergency_token_revoked',
      purpose: 'emergency_preparedness',
      metadata: { tokenId: req.params.tokenId },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({ token: result.rows[0] });
  }),
);

router.get(
  '/packet/:token',
  asyncHandler(async (req, res) => {
    const token = await findEmergencyToken(req.params.token);
    const packet = await buildEmergencyPacket(token.patient_id, token.scopes);

    await query(`UPDATE emergency_tokens SET last_used_at = now() WHERE id = $1`, [token.id]);
    await writeAuditEvent({
      actorId: null,
      patientId: token.patient_id,
      action: 'emergency_packet_viewed',
      purpose: 'emergency_qr_view',
      metadata: { tokenId: token.id, scopes: token.scopes },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json(packet);
  }),
);

router.post(
  '/break-glass/:token',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = req.user!;
    if (user.role !== 'doctor' && user.role !== 'admin') {
      throw forbidden('Only verified care-team users can break glass');
    }

    const { reason, location } = req.body ?? {};
    if (!reason || String(reason).trim().length < 10) {
      throw badRequest('A specific emergency reason is required');
    }

    const token = await findEmergencyToken(req.params.token);
    const expiresAt = new Date(Date.now() + env.emergencyAccessTtlMinutes * 60 * 1000);

    const consent = await withTransaction(async (client) => {
      const result = await client.query(
        `INSERT INTO consents (
          id, patient_id, grantee_id, purpose, scopes, status, expires_at, created_by
        ) VALUES ($1, $2, $3, $4, $5, 'active', $6, $7)
        RETURNING id, patient_id, grantee_id, purpose, scopes, status, starts_at, expires_at`,
        [
          uuid(),
          token.patient_id,
          user.id,
          `Emergency break-glass: ${reason}`,
          emergencyPacketScopes(token.scopes),
          expiresAt,
          user.id,
        ],
      );

      await writeAuditEvent(
        {
          actorId: user.id,
          patientId: token.patient_id,
          action: 'break_glass_access_granted',
          purpose: 'emergency_access',
          metadata: {
            tokenId: token.id,
            reason,
            location,
            expiresAt,
          },
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

export default router;
