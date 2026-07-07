import { Router } from 'express';
import { query } from '../db/client';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { assertPatientAccess } from '../services/accessService';
import { createVisitPrepInsight } from '../services/aiInsightService';
import { writeAuditEvent } from '../services/auditService';

const router = Router();

router.post(
  '/visit-prep',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const patientId = String(req.body?.patientId ?? user.id);
    await assertPatientAccess(user, patientId, 'documents');

    const insightId = await createVisitPrepInsight(patientId);
    const insight = await query(
      `SELECT id, patient_id, title, summary, citations, risk_level, status, created_at
       FROM ai_insights
       WHERE id = $1`,
      [insightId],
    );

    await writeAuditEvent({
      actorId: user.id,
      patientId,
      action: 'visit_prep_generated',
      purpose: 'ai_assisted_record_organization',
      metadata: { insightId },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(201).json({ insight: insight.rows[0] });
  }),
);

router.get(
  '/insights',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const patientId = String(req.query.patientId ?? user.id);
    await assertPatientAccess(user, patientId, 'documents');

    const result = await query(
      `SELECT id, patient_id, title, summary, citations, risk_level, status, created_at
       FROM ai_insights
       WHERE patient_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [patientId],
    );

    res.json({
      insights: result.rows,
      guardrail:
        'AI output is an organizing aid with citations. It is not diagnosis or treatment advice.',
    });
  }),
);

export default router;
