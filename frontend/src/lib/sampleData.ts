export type Role = 'patient' | 'doctor' | 'admin';

export const patient = {
  id: 'patient-demo',
  name: 'Maya Srinivasan',
  dateOfBirth: '1988-04-12',
  bloodType: 'O+',
  language: 'English',
  emergencySummary: 'Severe penicillin allergy. Carries albuterol inhaler.',
};

export const timeline = [
  {
    id: 't1',
    date: '2026-06-18',
    type: 'Lab',
    title: 'Lipid panel',
    source: 'Northstar Lab',
    scope: 'labs',
    status: 'Needs review',
    detail: 'LDL 132 mg/dL, HDL 58 mg/dL, triglycerides 141 mg/dL.',
  },
  {
    id: 't2',
    date: '2026-05-27',
    type: 'Medication',
    title: 'Albuterol inhaler',
    source: 'Patient entered',
    scope: 'medications',
    status: 'Active',
    detail: '2 puffs as needed for exercise-induced asthma symptoms.',
  },
  {
    id: 't3',
    date: '2026-05-04',
    type: 'Visit note',
    title: 'Annual physical',
    source: 'Dr. Elias Hart',
    scope: 'documents',
    status: 'Signed',
    detail: 'Preventive care visit, cholesterol follow-up planned.',
  },
  {
    id: 't4',
    date: '2026-02-12',
    type: 'Allergy',
    title: 'Penicillin',
    source: 'Patient entered',
    scope: 'allergies',
    status: 'Critical',
    detail: 'Hives and shortness of breath. Avoid beta-lactam antibiotics unless evaluated.',
  },
];

export const labTrend = [
  { month: 'Jan', ldl: 148, hdl: 52 },
  { month: 'Feb', ldl: 144, hdl: 54 },
  { month: 'Mar', ldl: 139, hdl: 55 },
  { month: 'Apr', ldl: 136, hdl: 57 },
  { month: 'May', ldl: 134, hdl: 57 },
  { month: 'Jun', ldl: 132, hdl: 58 },
];

export const consents = [
  {
    id: 'c1',
    grantee: 'Dr. Elias Hart',
    organization: 'Northstar Family Clinic',
    scopes: ['documents', 'labs', 'medications', 'allergies', 'conditions', 'audit'],
    purpose: 'Primary care visit prep',
    expires: '2026-08-06',
    status: 'Active',
  },
  {
    id: 'c2',
    grantee: 'Arun Srinivasan',
    organization: 'Family caregiver',
    scopes: ['emergency', 'medications', 'allergies'],
    purpose: 'Emergency support',
    expires: '2026-07-21',
    status: 'Active',
  },
];

export const auditEvents = [
  {
    id: 'a1',
    actor: 'Maya Srinivasan',
    action: 'FHIR bundle exported',
    purpose: 'Patient export',
    time: 'Today, 9:42 AM',
  },
  {
    id: 'a2',
    actor: 'Dr. Elias Hart',
    action: 'Lab result viewed',
    purpose: 'Primary care visit prep',
    time: 'Yesterday, 4:18 PM',
  },
  {
    id: 'a3',
    actor: 'Emergency QR',
    action: 'Emergency packet viewed',
    purpose: 'Emergency QR view',
    time: 'Jul 5, 8:13 PM',
  },
];

export const emergencyItems = [
  'Penicillin allergy',
  'Albuterol inhaler',
  'Exercise-induced asthma',
  'Spouse emergency contact',
  'Blood type O+',
];

export const adminSignals = [
  { label: 'Active consents', value: 42, tone: 'green' },
  { label: 'Provider reviews', value: 7, tone: 'amber' },
  { label: 'Audit events 7d', value: 381, tone: 'blue' },
  { label: 'AI outputs needing review', value: 12, tone: 'rose' },
];

export const fhirBundlePreview = {
  resourceType: 'Bundle',
  type: 'collection',
  entry: [
    { resource: { resourceType: 'Patient', id: patient.id } },
    { resource: { resourceType: 'DocumentReference', id: 't1' } },
    { resource: { resourceType: 'MedicationStatement', id: 't2' } },
    { resource: { resourceType: 'AllergyIntolerance', id: 't4' } },
  ],
};
