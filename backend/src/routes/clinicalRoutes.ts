import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { query, withTransaction } from '../db/client';
import { requireAuth } from '../middleware/auth';
import { scopeForClinicalType } from '../domain/policy';
import { assertPatientAccess, assertPatientAccessWithClient } from '../services/accessService';
import { writeAuditEvent } from '../services/auditService';
import { asyncHandler } from '../utils/asyncHandler';
import { badRequest } from '../utils/errors';
import type { ClinicalEntryType } from '../types/domain';

const router = Router();

const allowedTypes: ClinicalEntryType[] = [
  'allergy',
  'condition',
  'medication',
  'observation',
  'immunization',
  'procedure',
  'care_plan',
];

router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const patientId = String(req.query.patientId ?? user.id);
    const type = req.query.type ? String(req.query.type) : undefined;
    await assertPatientAccess(user, patientId, type ? scopeForClinicalType(type) : 'documents');

    const params: unknown[] = [patientId];
    let typeFilter = '';
    if (type) {
      params.push(type);
      typeFilter = 'AND type = $2';
    }

    const result = await query(
      `SELECT id, patient_id, type, title, status, onset_date, value_text, unit,
              code_system, code, source_record_id, notes, created_by, created_at
       FROM clinical_entries
       WHERE patient_id = $1 ${typeFilter}
       ORDER BY created_at DESC`,
      params,
    );

    res.json({ entries: result.rows });
  }),
);

router.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const {
      patientId = user.id,
      type,
      title,
      status = 'active',
      onsetDate,
      valueText,
      unit,
      codeSystem,
      code,
      sourceRecordId,
      notes,
    } = req.body ?? {};

    if (!allowedTypes.includes(type)) {
      throw badRequest('type must be a supported clinical entry type', { allowedTypes });
    }

    if (!title) {
      throw badRequest('title is required');
    }

    const entry = await withTransaction(async (client) => {
      await assertPatientAccessWithClient(client, user, patientId, scopeForClinicalType(type));
      const id = uuid();
      const result = await client.query(
        `INSERT INTO clinical_entries (
          id, patient_id, type, title, status, onset_date, value_text, unit,
          code_system, code, source_record_id, notes, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING id, patient_id, type, title, status, onset_date, value_text, unit,
                  code_system, code, source_record_id, notes, created_by, created_at`,
        [
          id,
          patientId,
          type,
          title,
          status,
          onsetDate ?? null,
          valueText ?? null,
          unit ?? null,
          codeSystem ?? null,
          code ?? null,
          sourceRecordId ?? null,
          notes ?? null,
          user.id,
        ],
      );

      await writeAuditEvent(
        {
          actorId: user.id,
          patientId,
          action: 'clinical_entry_created',
          purpose: user.role === 'doctor' ? 'care_documentation' : 'patient_entry',
          metadata: { type, title },
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        },
        client,
      );

      return result.rows[0];
    });

    res.status(201).json({ entry });
  }),
);

export default router;
