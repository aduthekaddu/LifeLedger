export type Role = 'patient' | 'doctor' | 'admin';

export type ClinicalEntryType =
  | 'allergy'
  | 'condition'
  | 'medication'
  | 'observation'
  | 'immunization'
  | 'procedure'
  | 'care_plan';

export type RecordCategory =
  | 'document'
  | 'lab'
  | 'imaging'
  | 'visit_note'
  | 'prescription'
  | 'insurance'
  | 'other';

export type ConsentStatus = 'pending' | 'active' | 'revoked' | 'expired';

export type DataScope =
  | 'documents'
  | 'labs'
  | 'medications'
  | 'allergies'
  | 'conditions'
  | 'immunizations'
  | 'procedures'
  | 'care_plans'
  | 'emergency'
  | 'audit';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  fullName: string;
}

export interface ConsentGrant {
  id: string;
  patientId: string;
  granteeId: string | null;
  granteeEmail: string | null;
  scopes: DataScope[];
  status: ConsentStatus;
  startsAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
}

export interface AccessDecisionInput {
  actor: AuthUser;
  patientId: string;
  requiredScope: DataScope;
  grants: ConsentGrant[];
  now?: Date;
}
