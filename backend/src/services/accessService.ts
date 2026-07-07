import type { PoolClient } from 'pg';
import { query } from '../db/client';
import { canAccessPatientData } from '../domain/policy';
import type { AuthUser, ConsentGrant, DataScope } from '../types/domain';
import { forbidden } from '../utils/errors';

type ConsentRow = {
  id: string;
  patient_id: string;
  grantee_id: string | null;
  grantee_email: string | null;
  scopes: string[];
  status: 'pending' | 'active' | 'revoked' | 'expired';
  starts_at: Date;
  expires_at: Date;
  revoked_at: Date | null;
};

function toGrant(row: ConsentRow): ConsentGrant {
  return {
    id: row.id,
    patientId: row.patient_id,
    granteeId: row.grantee_id,
    granteeEmail: row.grantee_email,
    scopes: row.scopes as DataScope[],
    status: row.status,
    startsAt: new Date(row.starts_at),
    expiresAt: new Date(row.expires_at),
    revokedAt: row.revoked_at ? new Date(row.revoked_at) : null,
  };
}

export async function grantsForActor(actor: AuthUser, patientId: string): Promise<ConsentGrant[]> {
  if (actor.role !== 'doctor') {
    return [];
  }

  const result = await query<ConsentRow>(
    `SELECT id, patient_id, grantee_id, grantee_email, scopes, status, starts_at, expires_at, revoked_at
     FROM consents
     WHERE patient_id = $1 AND grantee_id = $2`,
    [patientId, actor.id],
  );

  return result.rows.map(toGrant);
}

export async function assertPatientAccess(
  actor: AuthUser,
  patientId: string,
  requiredScope: DataScope,
): Promise<void> {
  const grants = await grantsForActor(actor, patientId);
  if (!canAccessPatientData({ actor, patientId, requiredScope, grants })) {
    throw forbidden('A current consent grant is required for this data');
  }
}

export async function assertPatientAccessWithClient(
  client: PoolClient,
  actor: AuthUser,
  patientId: string,
  requiredScope: DataScope,
): Promise<void> {
  if (actor.role !== 'doctor') {
    await assertPatientAccess(actor, patientId, requiredScope);
    return;
  }

  const result = await client.query<ConsentRow>(
    `SELECT id, patient_id, grantee_id, grantee_email, scopes, status, starts_at, expires_at, revoked_at
     FROM consents
     WHERE patient_id = $1 AND grantee_id = $2`,
    [patientId, actor.id],
  );

  const grants = result.rows.map(toGrant);
  if (!canAccessPatientData({ actor, patientId, requiredScope, grants })) {
    throw forbidden('A current consent grant is required for this data');
  }
}
