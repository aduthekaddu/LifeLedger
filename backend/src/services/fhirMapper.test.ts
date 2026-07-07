import assert from 'node:assert/strict';
import test from 'node:test';
import { buildFhirBundle, toFhirDate, toFhirDateTime } from './fhirMapper';

test('toFhirDate returns date-only strings without timezone noise', () => {
  assert.equal(toFhirDate('1988-04-12'), '1988-04-12');
  assert.equal(toFhirDate('1988-04-12T00:00:00.000Z'), '1988-04-12');
  assert.equal(toFhirDate(new Date(1988, 3, 12)), '1988-04-12');
});

test('toFhirDateTime preserves timestamp semantics', () => {
  assert.equal(
    toFhirDateTime(new Date('2026-07-07T07:00:00.000Z')),
    '2026-07-07T07:00:00.000Z',
  );
});

test('FHIR bundle maps patient birthDate and clinical onset as date-only values', () => {
  const bundle = buildFhirBundle({
    patient: {
      id: 'patient-1',
      email: 'patient@example.com',
      full_name: 'Patient One',
      phone: null,
      date_of_birth: '1988-04-12',
      blood_type: 'O+',
    },
    records: [],
    clinicalEntries: [
      {
        id: 'med-1',
        type: 'medication',
        title: 'Albuterol',
        status: 'active',
        onset_date: '2026-07-07',
        value_text: '2 puffs',
        unit: null,
        code_system: null,
        code: null,
        notes: null,
        created_at: new Date('2026-07-07T07:00:00.000Z'),
      },
    ],
    scopes: ['medications'],
  });

  const patient = bundle.entry[0].resource as { birthDate: string };
  const medication = bundle.entry[1].resource as { effectiveDateTime: string };

  assert.equal(patient.birthDate, '1988-04-12');
  assert.equal(medication.effectiveDateTime, '2026-07-07');
});
