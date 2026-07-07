CREATE TYPE user_role AS ENUM ('patient', 'doctor', 'admin');
CREATE TYPE consent_status AS ENUM ('pending', 'active', 'revoked', 'expired');
CREATE TYPE clinical_entry_type AS ENUM (
  'allergy',
  'condition',
  'medication',
  'observation',
  'immunization',
  'procedure',
  'care_plan'
);
CREATE TYPE record_category AS ENUM (
  'document',
  'lab',
  'imaging',
  'visit_note',
  'prescription',
  'insurance',
  'other'
);

CREATE TABLE users (
  id uuid PRIMARY KEY,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role user_role NOT NULL,
  full_name text NOT NULL,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  verified_at timestamptz
);

CREATE TABLE patient_profiles (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  date_of_birth date,
  blood_type text,
  emergency_summary text,
  care_directives text,
  preferred_language text NOT NULL DEFAULT 'en',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE provider_profiles (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  organization text NOT NULL,
  specialty text,
  npi text,
  verification_status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE emergency_contacts (
  id uuid PRIMARY KEY,
  patient_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  relationship text NOT NULL,
  phone text NOT NULL,
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE records (
  id uuid PRIMARY KEY,
  patient_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL REFERENCES users(id),
  title text NOT NULL,
  category record_category NOT NULL DEFAULT 'document',
  description text,
  original_file_name text NOT NULL,
  storage_key text NOT NULL UNIQUE,
  mime_type text NOT NULL,
  file_size_bytes integer NOT NULL,
  checksum_sha256 text NOT NULL,
  fhir_resource jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE clinical_entries (
  id uuid PRIMARY KEY,
  patient_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type clinical_entry_type NOT NULL,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  onset_date date,
  value_text text,
  unit text,
  code_system text,
  code text,
  source_record_id uuid REFERENCES records(id) ON DELETE SET NULL,
  notes text,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE consents (
  id uuid PRIMARY KEY,
  patient_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  grantee_id uuid REFERENCES users(id) ON DELETE SET NULL,
  grantee_email text,
  purpose text NOT NULL,
  scopes text[] NOT NULL,
  status consent_status NOT NULL,
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  created_by uuid NOT NULL REFERENCES users(id),
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (grantee_id IS NOT NULL OR grantee_email IS NOT NULL)
);

CREATE TABLE audit_events (
  id uuid PRIMARY KEY,
  actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  patient_id uuid REFERENCES users(id) ON DELETE SET NULL,
  record_id uuid REFERENCES records(id) ON DELETE SET NULL,
  action text NOT NULL,
  purpose text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE emergency_tokens (
  id uuid PRIMARY KEY,
  patient_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  scopes text[] NOT NULL,
  label text NOT NULL,
  expires_at timestamptz NOT NULL,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE ai_insights (
  id uuid PRIMARY KEY,
  patient_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  summary text NOT NULL,
  citations jsonb NOT NULL DEFAULT '[]'::jsonb,
  risk_level text NOT NULL DEFAULT 'informational',
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_records_patient_created ON records(patient_id, created_at DESC);
CREATE INDEX idx_clinical_entries_patient_type ON clinical_entries(patient_id, type, created_at DESC);
CREATE INDEX idx_consents_patient_status ON consents(patient_id, status, expires_at);
CREATE INDEX idx_consents_grantee_status ON consents(grantee_id, status, expires_at);
CREATE INDEX idx_audit_patient_created ON audit_events(patient_id, created_at DESC);
CREATE INDEX idx_emergency_tokens_patient ON emergency_tokens(patient_id, expires_at DESC);
