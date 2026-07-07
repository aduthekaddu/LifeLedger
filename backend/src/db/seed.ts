import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { pool, withTransaction } from './client';
import { logger } from '../config/logger';
import { writeAuditEvent } from '../services/auditService';

const demoPassword = 'LifeLedgerDemo!2026';

async function upsertUser(input: {
  email: string;
  fullName: string;
  role: 'patient' | 'doctor' | 'admin';
  phone?: string;
}) {
  const existing = await pool.query<{ id: string }>('SELECT id FROM users WHERE email = $1', [
    input.email,
  ]);
  if (existing.rows[0]) {
    return existing.rows[0].id;
  }

  const id = uuid();
  const passwordHash = await bcrypt.hash(demoPassword, 12);
  await pool.query(
    `INSERT INTO users (id, email, password_hash, role, full_name, phone, verified_at)
     VALUES ($1, $2, $3, $4, $5, $6, now())`,
    [id, input.email, passwordHash, input.role, input.fullName, input.phone ?? null],
  );
  return id;
}

async function seed(): Promise<void> {
  await withTransaction(async (client) => {
    const patientId = await upsertUser({
      email: 'patient@lifeledger.dev',
      fullName: 'Maya Srinivasan',
      role: 'patient',
      phone: '+1-555-0101',
    });
    const doctorId = await upsertUser({
      email: 'doctor@lifeledger.dev',
      fullName: 'Dr. Elias Hart',
      role: 'doctor',
      phone: '+1-555-0175',
    });
    const adminId = await upsertUser({
      email: 'admin@lifeledger.dev',
      fullName: 'Avery Compliance',
      role: 'admin',
      phone: '+1-555-0199',
    });

    await client.query(
      `INSERT INTO patient_profiles (user_id, date_of_birth, blood_type, emergency_summary, care_directives)
       VALUES ($1, '1988-04-12', 'O+', 'Severe penicillin allergy. Carries albuterol inhaler.', 'Contact spouse before non-emergency procedures.')
       ON CONFLICT (user_id) DO NOTHING`,
      [patientId],
    );

    await client.query(
      `INSERT INTO provider_profiles (user_id, organization, specialty, npi, verification_status)
       VALUES ($1, 'Northstar Family Clinic', 'Internal Medicine', '1234567890', 'verified')
       ON CONFLICT (user_id) DO NOTHING`,
      [doctorId],
    );

    await client.query(
      `INSERT INTO emergency_contacts (id, patient_id, name, relationship, phone, email)
       VALUES ($1, $2, 'Arun Srinivasan', 'Spouse', '+1-555-0120', 'arun@example.com')
       ON CONFLICT DO NOTHING`,
      [uuid(), patientId],
    );

    const nowPlus30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await client.query(
      `INSERT INTO consents (id, patient_id, grantee_id, purpose, scopes, status, expires_at, created_by)
       VALUES ($1, $2, $3, 'Primary care visit prep', ARRAY['documents','labs','medications','allergies','conditions','audit'], 'active', $4, $2)
       ON CONFLICT DO NOTHING`,
      [uuid(), patientId, doctorId, nowPlus30],
    );

    await client.query(
      `INSERT INTO clinical_entries (
        id, patient_id, type, title, status, onset_date, value_text, unit, notes, created_by
      ) VALUES
        ($1, $4, 'allergy', 'Penicillin', 'active', '2004-08-01', 'Hives and shortness of breath', NULL, 'Avoid beta-lactam antibiotics unless evaluated.', $4),
        ($2, $4, 'medication', 'Albuterol inhaler', 'active', '2024-02-14', '2 puffs as needed', NULL, 'Used for exercise-induced asthma symptoms.', $4),
        ($3, $4, 'observation', 'LDL cholesterol', 'final', '2026-06-18', '132', 'mg/dL', 'Imported from demo lab panel.', $4)
       ON CONFLICT DO NOTHING`,
      [uuid(), uuid(), uuid(), patientId],
    );

    await writeAuditEvent(
      {
        actorId: adminId,
        patientId,
        action: 'demo_seeded',
        purpose: 'demo_fixture',
        metadata: { doctorId },
      },
      client,
    );
  });

  logger.info('Seeded demo users', {
    password: demoPassword,
    users: ['patient@lifeledger.dev', 'doctor@lifeledger.dev', 'admin@lifeledger.dev'],
  });
}

if (require.main === module) {
  seed()
    .then(async () => {
      await pool.end();
    })
    .catch(async (error) => {
      logger.error('Seed failed', { error });
      await pool.end();
      process.exit(1);
    });
}
