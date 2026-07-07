import type { DataScope } from '../types/domain';

export interface FhirPatientRow {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  date_of_birth: string | Date | null;
  blood_type: string | null;
}

export interface FhirRecordRow {
  id: string;
  title: string;
  category: string;
  mime_type: string;
  file_size_bytes: number;
  checksum_sha256: string;
  created_at: string | Date;
}

export interface FhirClinicalEntryRow {
  id: string;
  type: string;
  title: string;
  status: string;
  onset_date: string | Date | null;
  value_text: string | null;
  unit: string | null;
  code_system: string | null;
  code: string | null;
  notes: string | null;
  created_at: string | Date;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function toFhirDate(value: string | Date | null): string | null {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    return value.includes('T') ? value.slice(0, 10) : value;
  }

  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

export function toFhirDateTime(value: string | Date | null): string | null {
  if (!value) {
    return null;
  }

  return typeof value === 'string' ? value : value.toISOString();
}

function patientResource(patient: FhirPatientRow) {
  return {
    resourceType: 'Patient',
    id: patient.id,
    name: [{ text: patient.full_name }],
    telecom: [
      { system: 'email', value: patient.email },
      ...(patient.phone ? [{ system: 'phone', value: patient.phone }] : []),
    ],
    birthDate: toFhirDate(patient.date_of_birth),
    extension: patient.blood_type
      ? [
          {
            url: 'http://lifeledger.local/fhir/StructureDefinition/blood-type',
            valueString: patient.blood_type,
          },
        ]
      : [],
  };
}

function documentReference(record: FhirRecordRow) {
  return {
    resourceType: 'DocumentReference',
    id: record.id,
    status: 'current',
    type: { text: record.category },
    description: record.title,
    date: toFhirDateTime(record.created_at),
    content: [
      {
        attachment: {
          contentType: record.mime_type,
          title: record.title,
          size: record.file_size_bytes,
          hash: record.checksum_sha256,
        },
      },
    ],
  };
}

function clinicalResource(entry: FhirClinicalEntryRow) {
  const code = {
    text: entry.title,
    ...(entry.code
      ? {
          coding: [
            {
              system: entry.code_system,
              code: entry.code,
              display: entry.title,
            },
          ],
        }
      : {}),
  };

  if (entry.type === 'medication') {
    return {
      resourceType: 'MedicationStatement',
      id: entry.id,
      status: entry.status,
      medicationCodeableConcept: code,
      effectiveDateTime: toFhirDate(entry.onset_date),
      note: entry.notes ? [{ text: entry.notes }] : [],
    };
  }

  if (entry.type === 'allergy') {
    return {
      resourceType: 'AllergyIntolerance',
      id: entry.id,
      clinicalStatus: { text: entry.status },
      code,
      recordedDate: toFhirDateTime(entry.created_at),
      note: entry.notes ? [{ text: entry.notes }] : [],
    };
  }

  if (entry.type === 'condition') {
    return {
      resourceType: 'Condition',
      id: entry.id,
      clinicalStatus: { text: entry.status },
      code,
      onsetDateTime: toFhirDate(entry.onset_date),
      note: entry.notes ? [{ text: entry.notes }] : [],
    };
  }

  if (entry.type === 'immunization') {
    return {
      resourceType: 'Immunization',
      id: entry.id,
      status: entry.status === 'active' ? 'completed' : entry.status,
      vaccineCode: code,
      occurrenceDateTime: toFhirDate(entry.onset_date) ?? toFhirDateTime(entry.created_at),
      note: entry.notes ? [{ text: entry.notes }] : [],
    };
  }

  return {
    resourceType: 'Observation',
    id: entry.id,
    status: entry.status,
    code,
    effectiveDateTime: toFhirDate(entry.onset_date) ?? toFhirDateTime(entry.created_at),
    valueString: entry.value_text,
    unit: entry.unit,
    note: entry.notes ? [{ text: entry.notes }] : [],
  };
}

export function buildFhirBundle(input: {
  patient: FhirPatientRow;
  records: FhirRecordRow[];
  clinicalEntries: FhirClinicalEntryRow[];
  scopes: DataScope[];
}) {
  const resources = [
    patientResource(input.patient),
    ...(input.scopes.includes('documents') ? input.records.map(documentReference) : []),
    ...input.clinicalEntries.map(clinicalResource),
  ];

  return {
    resourceType: 'Bundle',
    type: 'collection',
    timestamp: new Date().toISOString(),
    entry: resources.map((resource) => ({
      fullUrl: `urn:uuid:${resource.id}`,
      resource,
    })),
  };
}
