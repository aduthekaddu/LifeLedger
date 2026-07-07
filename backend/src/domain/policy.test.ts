import assert from 'node:assert/strict';
import test from 'node:test';
import { canAccessPatientData, emergencyPacketScopes, normalizeScopes } from './policy';
import type { AuthUser, ConsentGrant } from '../types/domain';

const patient: AuthUser = {
  id: 'patient-1',
  email: 'patient@example.com',
  fullName: 'Pat Ient',
  role: 'patient',
};

const doctor: AuthUser = {
  id: 'doctor-1',
  email: 'doctor@example.com',
  fullName: 'Doc Tor',
  role: 'doctor',
};

const activeGrant: ConsentGrant = {
  id: 'grant-1',
  patientId: patient.id,
  granteeId: doctor.id,
  granteeEmail: null,
  scopes: ['documents', 'labs'],
  status: 'active',
  startsAt: new Date('2026-01-01T00:00:00Z'),
  expiresAt: new Date('2026-01-02T00:00:00Z'),
  revokedAt: null,
};

test('patients can access their own data', () => {
  assert.equal(
    canAccessPatientData({
      actor: patient,
      patientId: patient.id,
      requiredScope: 'documents',
      grants: [],
    }),
    true,
  );
});

test('doctors need an active grant with the requested scope', () => {
  assert.equal(
    canAccessPatientData({
      actor: doctor,
      patientId: patient.id,
      requiredScope: 'labs',
      grants: [activeGrant],
      now: new Date('2026-01-01T12:00:00Z'),
    }),
    true,
  );

  assert.equal(
    canAccessPatientData({
      actor: doctor,
      patientId: patient.id,
      requiredScope: 'medications',
      grants: [activeGrant],
      now: new Date('2026-01-01T12:00:00Z'),
    }),
    false,
  );
});

test('expired grants do not authorize access', () => {
  assert.equal(
    canAccessPatientData({
      actor: doctor,
      patientId: patient.id,
      requiredScope: 'documents',
      grants: [activeGrant],
      now: new Date('2026-01-03T00:00:00Z'),
    }),
    false,
  );
});

test('normal scope parsing removes unsupported values', () => {
  assert.deepEqual(normalizeScopes(['documents', 'unsupported-scope', 'labs', 'labs']), [
    'documents',
    'labs',
  ]);
});

test('emergency packets are restricted to emergency-safe categories', () => {
  assert.deepEqual(emergencyPacketScopes(['documents', 'labs', 'allergies', 'medications']), [
    'allergies',
    'medications',
  ]);
});
