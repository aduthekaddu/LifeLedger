import crypto from 'crypto';
import type { PoolClient, QueryResultRow } from 'pg';
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

interface AuditHashPayload {
  sequenceId: number;
  id: string;
  actorId: string | null;
  patientId: string | null;
  recordId: string | null;
  action: string;
  purpose: string;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  previousHash: string | null;
}

interface AuditVerificationRow {
  sequence_id: number;
  id: string;
  actor_id: string | null;
  patient_id: string | null;
  record_id: string | null;
  action: string;
  purpose: string;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: Date;
  previous_hash: string | null;
  event_hash: string | null;
}

export interface AuditVerificationResult {
  valid: boolean;
  checkedEvents: number;
  legacyUnsealedEvents: number;
  firstInvalidSequenceId: number | null;
  reason: string | null;
  latestHash: string | null;
}

function canonicalize(value: unknown): unknown {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, canonicalize(item)]),
  );
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

export function hashAuditPayload(payload: AuditHashPayload): string {
  return crypto.createHash('sha256').update(canonicalJson(payload)).digest('hex');
}

function chainLockKey(patientId: string | null | undefined): string {
  return `audit-chain:${patientId ?? 'system'}`;
}

async function runQuery<T extends QueryResultRow>(
  client: PoolClient | undefined,
  text: string,
  params: unknown[] = [],
) {
  if (client) {
    return client.query<T>(text, params);
  }
  return query<T>(text, params);
}

export async function writeAuditEvent(input: AuditInput, client?: PoolClient): Promise<void> {
  await runQuery(client, 'SELECT pg_advisory_xact_lock(hashtext($1))', [
    chainLockKey(input.patientId),
  ]);

  const latest = await runQuery<{ event_hash: string | null }>(
    client,
    `SELECT event_hash
     FROM audit_events
     WHERE patient_id IS NOT DISTINCT FROM $1 AND event_hash IS NOT NULL
     ORDER BY sequence_id DESC
     LIMIT 1`,
    [input.patientId ?? null],
  );

  const sequence = await runQuery<{ sequence_id: string }>(
    client,
    `SELECT nextval('audit_events_sequence_id_seq')::text AS sequence_id`,
  );

  const id = uuid();
  const createdAt = new Date();
  const sequenceId = Number(sequence.rows[0].sequence_id);
  const metadata = input.metadata ?? {};
  const previousHash = latest.rows[0]?.event_hash ?? null;
  const actorId = input.actorId ?? null;
  const patientId = input.patientId ?? null;
  const recordId = input.recordId ?? null;
  const ipAddress = input.ipAddress ?? null;
  const userAgent = input.userAgent ?? null;

  const eventHash = hashAuditPayload({
    sequenceId,
    id,
    actorId,
    patientId,
    recordId,
    action: input.action,
    purpose: input.purpose,
    metadata,
    ipAddress,
    userAgent,
    createdAt: createdAt.toISOString(),
    previousHash,
  });

  const sql =
    `INSERT INTO audit_events (
      id, sequence_id, actor_id, patient_id, record_id, action, purpose, metadata,
      ip_address, user_agent, created_at, previous_hash, event_hash
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`;
  const values = [
    id,
    sequenceId,
    actorId,
    patientId,
    recordId,
    input.action,
    input.purpose,
    JSON.stringify(metadata),
    ipAddress,
    userAgent,
    createdAt,
    previousHash,
    eventHash,
  ];

  await runQuery(client, sql, values);
}

function payloadFromRow(row: AuditVerificationRow): AuditHashPayload {
  return {
    sequenceId: Number(row.sequence_id),
    id: row.id,
    actorId: row.actor_id,
    patientId: row.patient_id,
    recordId: row.record_id,
    action: row.action,
    purpose: row.purpose,
    metadata: row.metadata ?? {},
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    createdAt: new Date(row.created_at).toISOString(),
    previousHash: row.previous_hash,
  };
}

export function verifyAuditRows(rows: AuditVerificationRow[]): AuditVerificationResult {
  let expectedPreviousHash: string | null = null;
  let checkedEvents = 0;
  let legacyUnsealedEvents = 0;
  let latestHash: string | null = null;

  for (const row of rows) {
    if (!row.event_hash) {
      legacyUnsealedEvents += 1;
      continue;
    }

    if (row.previous_hash !== expectedPreviousHash) {
      return {
        valid: false,
        checkedEvents,
        legacyUnsealedEvents,
        firstInvalidSequenceId: Number(row.sequence_id),
        reason: 'previous_hash_mismatch',
        latestHash,
      };
    }

    const expectedHash = hashAuditPayload(payloadFromRow(row));
    if (row.event_hash !== expectedHash) {
      return {
        valid: false,
        checkedEvents,
        legacyUnsealedEvents,
        firstInvalidSequenceId: Number(row.sequence_id),
        reason: 'event_hash_mismatch',
        latestHash,
      };
    }

    checkedEvents += 1;
    expectedPreviousHash = row.event_hash;
    latestHash = row.event_hash;
  }

  return {
    valid: true,
    checkedEvents,
    legacyUnsealedEvents,
    firstInvalidSequenceId: null,
    reason: null,
    latestHash,
  };
}

export async function verifyPatientAuditChain(
  patientId: string,
): Promise<AuditVerificationResult> {
  const result = await query<AuditVerificationRow>(
    `SELECT sequence_id, id, actor_id, patient_id, record_id, action, purpose,
            metadata, ip_address, user_agent, created_at, previous_hash, event_hash
     FROM audit_events
     WHERE patient_id = $1
     ORDER BY sequence_id ASC`,
    [patientId],
  );

  return verifyAuditRows(result.rows);
}
