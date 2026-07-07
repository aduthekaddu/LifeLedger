# LifeLedger

LifeLedger is a FHIR-first personal health wallet. It helps a patient organize records, maintain structured clinical data, share scoped access with a doctor or caregiver, prepare an emergency packet, export a standards-style FHIR bundle, and review an access ledger.

The rebuild intentionally removes blockchain and IPFS from the product path. The current priority is safer healthcare fundamentals: private files, consent scopes, short-lived emergency access, audit events, environment validation, migrations, tests, and honest product positioning.

## What Is Built

- Next.js app router frontend with patient, doctor, and admin workspaces.
- Express + TypeScript backend with PostgreSQL.
- Workspace lockfile and root scripts.
- SQL migrations instead of startup schema mutation.
- Patient registration and httpOnly cookie sessions.
- Private file upload/download with MIME and signature validation.
- Structured clinical entries for allergies, medications, labs, conditions, immunizations, procedures, and care plans.
- Consent grants and doctor access requests with scopes and expiry.
- Emergency QR packets with restricted scopes and break-glass TTL.
- FHIR-style bundle export.
- Audit ledger for sensitive access and sharing events.
- Conservative AI visit prep with citations and review status.
- CI for install, typecheck, lint, tests, and build.

## What Is Not Claimed

This repository is not HIPAA certified, SOC 2 certified, ISO 27001 certified, or production-ready for real protected health information. It is a recruiter-grade rebuild that demonstrates the technical controls and product thinking needed before those claims could be evaluated.

## Quick Start

```bash
npm install
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
npm run typecheck
npm run test
npm run lint
npm run build
```

Start Postgres with Docker:

```bash
docker compose up -d postgres
npm run migrate
npm run seed
```

Run the apps in two terminals:

```bash
npm run dev:backend
npm run dev:frontend
```

Open:

- Frontend: http://localhost:3000
- API health: http://localhost:5000/api/v1/health

Demo accounts after `npm run seed`:

- Patient: `patient@lifeledger.dev` / `LifeLedgerDemo!2026`
- Doctor: `doctor@lifeledger.dev` / `LifeLedgerDemo!2026`
- Admin: `admin@lifeledger.dev` / `LifeLedgerDemo!2026`

## Docker

```bash
docker compose up --build
```

Seed demo data in the running backend container:

```bash
docker compose exec backend npm run seed:prod
```

## Project Structure

```text
LifeLedger/
├── backend/          # Express API, migrations, policy, private storage
├── frontend/         # Next.js health wallet UI
├── docs/             # Ignored local learning guide
├── package.json      # npm workspace scripts
└── docker-compose.yml
```

## Verification

```bash
npm run typecheck
npm run test
npm run lint
npm run build
npm audit --omit=dev
```

The backend policy tests cover patient ownership, doctor consent scopes, expired grants, scope normalization, and emergency packet restrictions.

## Design Direction

The UI is an operational healthcare dashboard, not a landing page. It uses dense panels, small-radius controls, scoped chips, QR packet preview, charts, FHIR bundle preview, and audit rows so the first screen demonstrates the actual product.

## Next Real Production Steps

- Replace local private files with encrypted object storage and malware scanning.
- Add integration tests against a test PostgreSQL container.
- Add provider verification and notification workflows.
- Add background jobs for OCR/AI extraction.
- Add FHIR validation against official profiles.
- Add OpenTelemetry, security headers/CSP tuning, backup/restore drills, and threat modeling.
