# LifeLedger Setup

## Prerequisites

- Node.js 20.11+
- npm 10+
- Docker Desktop or another Docker engine
- Git

## Install

```bash
npm install
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

Edit `backend/.env` and replace `JWT_SECRET` with a generated value of at least 32 characters.

## Start PostgreSQL

```bash
docker compose up -d postgres
```

## Migrate And Seed

```bash
npm run migrate
npm run seed
```

Demo password for all seeded accounts:

```text
LifeLedgerDemo!2026
```

Accounts:

- `patient@lifeledger.dev`
- `doctor@lifeledger.dev`
- `admin@lifeledger.dev`

## Run Locally

Terminal 1:

```bash
npm run dev:backend
```

Terminal 2:

```bash
npm run dev:frontend
```

Open:

- http://localhost:3000
- http://localhost:5000/api/v1/health

## Run With Docker

```bash
docker compose up --build
```

In another terminal:

```bash
docker compose exec backend npm run seed:prod
```

## Useful Commands

```bash
npm run typecheck
npm run test
npm run lint
npm run build
npm audit --omit=dev
```

## API Smoke Test

After local dev or Docker is running:

```bash
./test-features.sh
```

## Notes

- Files are private and served through authorized download routes only.
- `docs/` is intentionally ignored and contains the local learning guide.
- There is no blockchain node, IPFS node, Hardhat network, or smart contract deployment in this rebuild.
