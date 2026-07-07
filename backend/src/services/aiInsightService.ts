import { v4 as uuid } from 'uuid';
import { query } from '../db/client';

export async function createVisitPrepInsight(patientId: string): Promise<string> {
  const records = await query<{
    id: string;
    title: string;
    category: string;
    created_at: string;
  }>(
    `SELECT id, title, category, created_at
     FROM records
     WHERE patient_id = $1
     ORDER BY created_at DESC
     LIMIT 5`,
    [patientId],
  );

  const entries = await query<{
    id: string;
    type: string;
    title: string;
    created_at: string;
  }>(
    `SELECT id, type, title, created_at
     FROM clinical_entries
     WHERE patient_id = $1
     ORDER BY created_at DESC
     LIMIT 8`,
    [patientId],
  );

  const citations = [
    ...records.rows.map((record) => ({
      sourceType: 'DocumentReference',
      sourceId: record.id,
      label: record.title,
      date: record.created_at,
    })),
    ...entries.rows.map((entry) => ({
      sourceType: entry.type,
      sourceId: entry.id,
      label: entry.title,
      date: entry.created_at,
    })),
  ];

  const summary =
    citations.length === 0
      ? 'No patient-entered records are available yet. Add recent medications, allergies, labs, or visit notes before generating visit prep.'
      : `Visit prep is based on ${records.rows.length} recent document(s) and ${entries.rows.length} structured clinical item(s). Review the cited sources with a clinician before making care decisions.`;

  const id = uuid();
  await query(
    `INSERT INTO ai_insights (id, patient_id, title, summary, citations, risk_level, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      id,
      patientId,
      'Visit prep with source citations',
      summary,
      JSON.stringify(citations),
      'informational',
      'needs_review',
    ],
  );

  return id;
}
