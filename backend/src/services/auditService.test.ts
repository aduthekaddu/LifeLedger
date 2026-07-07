import assert from 'node:assert/strict';
import test from 'node:test';

process.env.DATABASE_URL ??= 'postgresql://postgres:postgres@localhost:5432/lifeledger_test';
process.env.JWT_SECRET ??= 'test-secret-that-is-long-enough-for-env-validation';

const { hashAuditPayload, verifyAuditRows } = require('./auditService') as typeof import('./auditService');

function sealedRow(input: {
  sequenceId: number;
  id: string;
  action: string;
  purpose: string;
  metadata?: Record<string, unknown>;
  previousHash: string | null;
}) {
  const base = {
    sequence_id: input.sequenceId,
    id: input.id,
    actor_id: 'actor-1',
    patient_id: 'patient-1',
    record_id: null,
    action: input.action,
    purpose: input.purpose,
    metadata: input.metadata ?? {},
    ip_address: '127.0.0.1',
    user_agent: 'node-test',
    created_at: new Date(`2026-01-01T00:00:0${input.sequenceId}.000Z`),
    previous_hash: input.previousHash,
    event_hash: null,
  };

  return {
    ...base,
    event_hash: hashAuditPayload({
      sequenceId: input.sequenceId,
      id: input.id,
      actorId: base.actor_id,
      patientId: base.patient_id,
      recordId: base.record_id,
      action: base.action,
      purpose: base.purpose,
      metadata: base.metadata,
      ipAddress: base.ip_address,
      userAgent: base.user_agent,
      createdAt: base.created_at.toISOString(),
      previousHash: input.previousHash,
    }),
  };
}

test('audit verifier accepts a valid sealed chain', () => {
  const first = sealedRow({
    sequenceId: 1,
    id: 'event-1',
    action: 'record_downloaded',
    purpose: 'record_review',
    previousHash: null,
  });
  const second = sealedRow({
    sequenceId: 2,
    id: 'event-2',
    action: 'fhir_bundle_exported',
    purpose: 'patient_export',
    metadata: { scopes: ['documents', 'labs'] },
    previousHash: first.event_hash,
  });

  assert.deepEqual(verifyAuditRows([first, second]), {
    valid: true,
    checkedEvents: 2,
    legacyUnsealedEvents: 0,
    firstInvalidSequenceId: null,
    reason: null,
    latestHash: second.event_hash,
  });
});

test('audit verifier detects tampered metadata', () => {
  const row = sealedRow({
    sequenceId: 1,
    id: 'event-1',
    action: 'record_downloaded',
    purpose: 'record_review',
    metadata: { file: 'original.pdf' },
    previousHash: null,
  });

  const tampered = {
    ...row,
    metadata: { file: 'changed.pdf' },
  };

  const result = verifyAuditRows([tampered]);
  assert.equal(result.valid, false);
  assert.equal(result.reason, 'event_hash_mismatch');
  assert.equal(result.firstInvalidSequenceId, 1);
});

test('audit verifier counts legacy unsealed rows', () => {
  const result = verifyAuditRows([
    {
      sequence_id: 1,
      id: 'legacy-event',
      actor_id: 'actor-1',
      patient_id: 'patient-1',
      record_id: null,
      action: 'legacy',
      purpose: 'legacy',
      metadata: {},
      ip_address: null,
      user_agent: null,
      created_at: new Date('2026-01-01T00:00:00.000Z'),
      previous_hash: null,
      event_hash: null,
    },
  ]);

  assert.equal(result.valid, true);
  assert.equal(result.checkedEvents, 0);
  assert.equal(result.legacyUnsealedEvents, 1);
});
