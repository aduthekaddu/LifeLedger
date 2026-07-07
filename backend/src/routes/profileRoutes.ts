import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { query, withTransaction } from '../db/client';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { badRequest } from '../utils/errors';
import { writeAuditEvent } from '../services/auditService';

const router = Router();

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const profile =
      user.role === 'patient'
        ? await query(
            `SELECT date_of_birth, blood_type, emergency_summary, care_directives, preferred_language
             FROM patient_profiles WHERE user_id = $1`,
            [user.id],
          )
        : await query(
            `SELECT organization, specialty, npi, verification_status
             FROM provider_profiles WHERE user_id = $1`,
            [user.id],
          );

    const contacts =
      user.role === 'patient'
        ? await query(
            `SELECT id, name, relationship, phone, email
             FROM emergency_contacts WHERE patient_id = $1 ORDER BY created_at DESC`,
            [user.id],
          )
        : { rows: [] };

    res.json({ user, profile: profile.rows[0] ?? null, emergencyContacts: contacts.rows });
  }),
);

router.patch(
  '/patient',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = req.user!;
    if (user.role !== 'patient') {
      throw badRequest('Only patients can update a patient profile');
    }

    const { dateOfBirth, bloodType, emergencySummary, careDirectives, preferredLanguage } =
      req.body ?? {};

    const result = await query(
      `UPDATE patient_profiles
       SET date_of_birth = COALESCE($2, date_of_birth),
           blood_type = COALESCE($3, blood_type),
           emergency_summary = COALESCE($4, emergency_summary),
           care_directives = COALESCE($5, care_directives),
           preferred_language = COALESCE($6, preferred_language),
           updated_at = now()
       WHERE user_id = $1
       RETURNING date_of_birth, blood_type, emergency_summary, care_directives, preferred_language`,
      [user.id, dateOfBirth, bloodType, emergencySummary, careDirectives, preferredLanguage],
    );

    await writeAuditEvent({
      actorId: user.id,
      patientId: user.id,
      action: 'patient_profile_updated',
      purpose: 'patient_profile',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({ profile: result.rows[0] });
  }),
);

router.post(
  '/emergency-contacts',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = req.user!;
    if (user.role !== 'patient') {
      throw badRequest('Only patients can manage emergency contacts');
    }

    const { name, relationship, phone, email } = req.body ?? {};
    if (!name || !relationship || !phone) {
      throw badRequest('name, relationship, and phone are required');
    }

    const contact = await withTransaction(async (client) => {
      const result = await client.query(
        `INSERT INTO emergency_contacts (id, patient_id, name, relationship, phone, email)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, name, relationship, phone, email`,
        [uuid(), user.id, name, relationship, phone, email ?? null],
      );
      await writeAuditEvent(
        {
          actorId: user.id,
          patientId: user.id,
          action: 'emergency_contact_added',
          purpose: 'emergency_preparedness',
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        },
        client,
      );
      return result.rows[0];
    });

    res.status(201).json({ contact });
  }),
);

export default router;
