import type { AccessDecisionInput, ConsentGrant, DataScope, RecordCategory } from '../types/domain';

const categoryToScope: Record<RecordCategory, DataScope> = {
  document: 'documents',
  lab: 'labs',
  imaging: 'documents',
  visit_note: 'documents',
  prescription: 'medications',
  insurance: 'documents',
  other: 'documents',
};

const clinicalTypeToScope: Record<string, DataScope> = {
  allergy: 'allergies',
  condition: 'conditions',
  medication: 'medications',
  observation: 'labs',
  immunization: 'immunizations',
  procedure: 'procedures',
  care_plan: 'care_plans',
};

export function scopeForRecordCategory(category: RecordCategory): DataScope {
  return categoryToScope[category] ?? 'documents';
}

export function scopeForClinicalType(type: string): DataScope {
  return clinicalTypeToScope[type] ?? 'documents';
}

export function isGrantActive(grant: ConsentGrant, now = new Date()): boolean {
  return (
    grant.status === 'active' &&
    !grant.revokedAt &&
    grant.startsAt <= now &&
    grant.expiresAt > now
  );
}

export function grantCoversScope(grant: ConsentGrant, scope: DataScope): boolean {
  return grant.scopes.includes(scope) || grant.scopes.includes('emergency');
}

export function canAccessPatientData(input: AccessDecisionInput): boolean {
  const now = input.now ?? new Date();

  if (input.actor.role === 'admin') {
    return true;
  }

  if (input.actor.role === 'patient') {
    return input.actor.id === input.patientId;
  }

  return input.grants.some(
    (grant) =>
      grant.patientId === input.patientId &&
      grant.granteeId === input.actor.id &&
      isGrantActive(grant, now) &&
      grantCoversScope(grant, input.requiredScope),
  );
}

export function normalizeScopes(scopes: string[]): DataScope[] {
  const allowed = new Set<DataScope>([
    'documents',
    'labs',
    'medications',
    'allergies',
    'conditions',
    'immunizations',
    'procedures',
    'care_plans',
    'emergency',
    'audit',
  ]);

  const unique = [...new Set(scopes)].filter((scope): scope is DataScope =>
    allowed.has(scope as DataScope),
  );

  return unique.length > 0 ? unique : ['documents'];
}

export function emergencyPacketScopes(scopes: string[]): DataScope[] {
  const allowedEmergency = new Set<DataScope>([
    'allergies',
    'conditions',
    'medications',
    'immunizations',
    'care_plans',
    'emergency',
  ]);

  return normalizeScopes(scopes).filter((scope) => allowedEmergency.has(scope));
}
