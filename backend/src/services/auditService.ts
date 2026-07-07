import type { PoolClient } from 'pg';
import { v4 as uuid } from 'uuid';
import { query } from '../db/client';

interface AuditInput {
  actorId?: string | null;
  patientId?: string | null;
  recordId?: string | null;
  action: string;
  purpose: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export async function writeAuditEvent(input: AuditInput, client?: PoolClient): Promise<void> {
  const sql =
    `INSERT INTO audit_events (
      id, actor_id, patient_id, record_id, action, purpose, metadata, ip_address, user_agent
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`;
  const values = [
    uuid(),
    input.actorId ?? null,
    input.patientId ?? null,
    input.recordId ?? null,
    input.action,
    input.purpose,
    JSON.stringify(input.metadata ?? {}),
    input.ipAddress,
    input.userAgent,
  ];

  if (client) {
    await client.query(sql, values);
    return;
  }

  await query(sql, values);
}
