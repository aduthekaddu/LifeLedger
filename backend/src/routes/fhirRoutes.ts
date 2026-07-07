import { Router } from 'express';
import { query } from '../db/client';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { assertPatientAccess } from '../services/accessService';
import {
  buildFhirBundle,
  type FhirClinicalEntryRow,
  type FhirPatientRow,
  type FhirRecordRow,
} from '../services/fhirMapper';
import { writeAuditEvent } from '../services/auditService';
import { notFound } from '../utils/errors';
import { normalizeScopes } from '../domain/policy';

const router = Router();

router.get(
  '/export',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const patientId = String(req.query.patientId ?? user.id);
    const scopes = normalizeScopes(
      String(req.query.scopes ?? 'documents,labs,medications,allergies,conditions,immunizations')
        .split(',')
        .map((scope) => scope.trim()),
    );

    await assertPatientAccess(user, patientId, scopes[0] ?? 'documents');

    const patient = await query<FhirPatientRow>(
      `SELECT u.id, u.email, u.full_name, u.phone, p.date_of_birth, p.blood_type
       FROM users u
       JOIN patient_profiles p ON p.user_id = u.id
       WHERE u.id = $1`,
      [patientId],
    );

    if (!patient.rows[0]) {
      throw notFound('Patient not found');
    }

    const records = scopes.includes('documents')
      ? await query<FhirRecordRow>(
          `SELECT id, title, category, mime_type, file_size_bytes, checksum_sha256, created_at
           FROM records
           WHERE patient_id = $1
           ORDER BY created_at DESC`,
          [patientId],
        )
      : { rows: [] };

    const entries = await query<FhirClinicalEntryRow>(
      `SELECT id, type, title, status, onset_date, value_text, unit,
              code_system, code, notes, created_at
       FROM clinical_entries
       WHERE patient_id = $1
       ORDER BY created_at DESC`,
      [patientId],
    );

    const bundle = buildFhirBundle({
      patient: patient.rows[0],
      records: records.rows,
      clinicalEntries: entries.rows,
      scopes,
    });

    await writeAuditEvent({
      actorId: user.id,
      patientId,
      action: 'fhir_bundle_exported',
      purpose: 'patient_export',
      metadata: { scopes },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json(bundle);
  }),
);

export default router;
