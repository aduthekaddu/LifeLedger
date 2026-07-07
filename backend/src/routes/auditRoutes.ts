import { Router } from 'express';
import { query } from '../db/client';
import { requireAuth } from '../middleware/auth';
import { assertPatientAccess } from '../services/accessService';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const patientId = String(req.query.patientId ?? user.id);
    await assertPatientAccess(user, patientId, 'audit');

    const result = await query(
      `SELECT a.id, a.actor_id, actor.full_name AS actor_name, a.patient_id,
              a.record_id, a.action, a.purpose, a.metadata, a.ip_address,
              a.user_agent, a.created_at
       FROM audit_events a
       LEFT JOIN users actor ON actor.id = a.actor_id
       WHERE a.patient_id = $1
       ORDER BY a.created_at DESC
       LIMIT 200`,
      [patientId],
    );

    res.json({ auditEvents: result.rows });
  }),
);

export default router;
