CREATE SEQUENCE IF NOT EXISTS audit_events_sequence_id_seq AS bigint;

ALTER TABLE audit_events
  ADD COLUMN IF NOT EXISTS sequence_id bigint,
  ADD COLUMN IF NOT EXISTS previous_hash text,
  ADD COLUMN IF NOT EXISTS event_hash text;

WITH ordered AS (
  SELECT id, row_number() OVER (ORDER BY created_at, id) AS sequence_id
  FROM audit_events
  WHERE sequence_id IS NULL
)
UPDATE audit_events a
SET sequence_id = ordered.sequence_id
FROM ordered
WHERE a.id = ordered.id;

SELECT setval(
  'audit_events_sequence_id_seq',
  GREATEST((SELECT COALESCE(MAX(sequence_id), 0) FROM audit_events), 1),
  true
);

ALTER TABLE audit_events
  ALTER COLUMN sequence_id SET DEFAULT nextval('audit_events_sequence_id_seq'),
  ALTER COLUMN sequence_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_audit_events_sequence_id
  ON audit_events(sequence_id);

CREATE INDEX IF NOT EXISTS idx_audit_events_patient_sequence
  ON audit_events(patient_id, sequence_id);

CREATE INDEX IF NOT EXISTS idx_audit_events_hash
  ON audit_events(event_hash);
