import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { query, withTransaction } from '../db/client';
import { requireAuth } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { scopeForRecordCategory } from '../domain/policy';
import { assertPatientAccessWithClient, assertPatientAccess } from '../services/accessService';
import { savePrivateFile, resolveStoredFile, validateUpload } from '../services/fileStorage';
import { writeAuditEvent } from '../services/auditService';
import { asyncHandler } from '../utils/asyncHandler';
import { badRequest, notFound } from '../utils/errors';
import type { RecordCategory } from '../types/domain';

const router = Router();

type RecordRow = {
  id: string;
  patient_id: string;
  uploaded_by: string;
  title: string;
  category: RecordCategory;
  description: string | null;
  original_file_name: string;
  storage_key: string;
  mime_type: string;
  file_size_bytes: number;
  checksum_sha256: string;
  fhir_resource: unknown;
  created_at: string;
};

function requestedPatientId(actorId: string, bodyPatientId?: string): string {
  return bodyPatientId || actorId;
}

router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const patientId = String(req.query.patientId ?? user.id);
    await assertPatientAccess(user, patientId, 'documents');

    const result = await query<RecordRow>(
      `SELECT id, patient_id, uploaded_by, title, category, description, original_file_name,
              storage_key, mime_type, file_size_bytes, checksum_sha256, fhir_resource, created_at
       FROM records
       WHERE patient_id = $1
       ORDER BY created_at DESC
       LIMIT 100`,
      [patientId],
    );

    res.json({ records: result.rows });
  }),
);

router.post(
  '/',
  requireAuth,
  upload.single('file'),
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const file = validateUpload(req.file);
    const patientId = requestedPatientId(user.id, req.body.patientId);
    const category = (req.body.category ?? 'document') as RecordCategory;
    const title = String(req.body.title ?? file.originalname);
    const description = req.body.description ? String(req.body.description) : null;
    const requiredScope = scopeForRecordCategory(category);

    const record = await withTransaction(async (client) => {
      await assertPatientAccessWithClient(client, user, patientId, requiredScope);
      const stored = await savePrivateFile(file);
      const id = uuid();
      const fhirResource = {
        resourceType: 'DocumentReference',
        id,
        status: 'current',
        type: { text: category },
        description: title,
        content: [
          {
            attachment: {
              contentType: stored.mimeType,
              title,
              size: stored.size,
              hash: stored.checksumSha256,
            },
          },
        ],
      };

      const result = await client.query<RecordRow>(
        `INSERT INTO records (
          id, patient_id, uploaded_by, title, category, description, original_file_name,
          storage_key, mime_type, file_size_bytes, checksum_sha256, fhir_resource
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id, patient_id, uploaded_by, title, category, description, original_file_name,
                  storage_key, mime_type, file_size_bytes, checksum_sha256, fhir_resource, created_at`,
        [
          id,
          patientId,
          user.id,
          title,
          category,
          description,
          file.originalname,
          stored.storageKey,
          stored.mimeType,
          stored.size,
          stored.checksumSha256,
          JSON.stringify(fhirResource),
        ],
      );

      await writeAuditEvent(
        {
          actorId: user.id,
          patientId,
          recordId: id,
          action: 'record_uploaded',
          purpose: user.role === 'doctor' ? 'care_team_upload' : 'patient_upload',
          metadata: { category, fileName: file.originalname },
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        },
        client,
      );

      return result.rows[0];
    });

    res.status(201).json({ record });
  }),
);

router.get(
  '/timeline',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const patientId = String(req.query.patientId ?? user.id);
    await assertPatientAccess(user, patientId, 'documents');

    const records = await query(
      `SELECT id, title, category AS type, created_at, 'record' AS source
       FROM records WHERE patient_id = $1`,
      [patientId],
    );
    const entries = await query(
      `SELECT id, title, type, created_at, 'clinical_entry' AS source
       FROM clinical_entries WHERE patient_id = $1`,
      [patientId],
    );

    const timeline = [...records.rows, ...entries.rows].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    res.json({ timeline });
  }),
);

router.get(
  '/:recordId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const result = await query<RecordRow>(
      `SELECT id, patient_id, uploaded_by, title, category, description, original_file_name,
              storage_key, mime_type, file_size_bytes, checksum_sha256, fhir_resource, created_at
       FROM records
       WHERE id = $1`,
      [req.params.recordId],
    );

    const record = result.rows[0];
    if (!record) {
      throw notFound('Record not found');
    }

    await assertPatientAccess(user, record.patient_id, scopeForRecordCategory(record.category));
    await writeAuditEvent({
      actorId: user.id,
      patientId: record.patient_id,
      recordId: record.id,
      action: 'record_metadata_viewed',
      purpose: 'record_review',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({ record });
  }),
);

router.get(
  '/:recordId/download',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const result = await query<RecordRow>(
      `SELECT id, patient_id, category, original_file_name, storage_key, mime_type
       FROM records WHERE id = $1`,
      [req.params.recordId],
    );

    const record = result.rows[0];
    if (!record) {
      throw notFound('Record not found');
    }

    await assertPatientAccess(user, record.patient_id, scopeForRecordCategory(record.category));
    const absolutePath = await resolveStoredFile(record.storage_key);
    await writeAuditEvent({
      actorId: user.id,
      patientId: record.patient_id,
      recordId: record.id,
      action: 'record_downloaded',
      purpose: 'record_review',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.download(absolutePath, record.original_file_name);
  }),
);

router.post(
  '/:recordId/ai-queue',
  requireAuth,
  asyncHandler(async (_req, _res) => {
    throw badRequest('AI extraction is intentionally queued through /ai/visit-prep in this rebuild');
  }),
);

export default router;
