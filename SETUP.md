# LifeLedger Setup Guide (Current)

This guide reflects the current codebase and scripts in this repository.

## 1. What You Are Running

LifeLedger has three main parts:

- Backend API: Express + TypeScript + PostgreSQL
- Frontend: Next.js app
- Optional infrastructure: IPFS + local blockchain (Hardhat)

You can run in two common modes:

- Local app mode: Backend + Frontend locally, PostgreSQL locally, optional IPFS/Hardhat via Docker
- Full Docker mode: PostgreSQL + IPFS + Hardhat + Backend + Frontend via docker-compose-full.yml

## 2. Prerequisites

- Node.js 18+ (Node 20+ recommended)
- npm
- PostgreSQL 14+ (15+ recommended)
- Docker Desktop or Docker Engine (optional but recommended)
- Git

## 3. Clone And Install

```bash
git clone <your-repo-url>
cd LifeLedger

cd backend
npm install

cd ../frontend
npm install

cd ../blockchain
npm install
```

## 4. Create The Database

```bash
psql -U postgres
CREATE DATABASE medsecure;
\q
```

If your postgres user is not postgres, use your own user and set matching values in backend/.env.

## 5. Backend Environment

Create backend/.env:

```env
# Core
NODE_ENV=development
PORT=5000
API_VERSION=v1
SEED_DATABASE=true

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=medsecure
DB_USER=postgres
DB_PASSWORD=your_postgres_password

# Auth + encryption
JWT_SECRET=replace_with_a_strong_secret
ENCRYPTION_KEY=replace_with_a_strong_key

# API + uploads
CORS_ORIGIN=http://localhost:3000
FRONTEND_URL=http://localhost:3000
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads
LOG_LEVEL=info

# AI (Google Gemini)
GEMINI_API_KEY=your_gemini_api_key

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# SMS (optional)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# IPFS (optional)
IPFS_HOST=localhost
IPFS_PORT=5001
IPFS_PROTOCOL=http

# Blockchain (optional)
BLOCKCHAIN_RPC=http://localhost:8545
CONTRACT_ADDRESS=
```

Notes:

- AI features are disabled when GEMINI_API_KEY is missing.
- If SEED_DATABASE=true, startup seeds test accounts if missing.

## 6. Frontend Environment

Create frontend/.env.local:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
NEXT_PUBLIC_API_TIMEOUT=30000
```

## 7. Start In Local App Mode

Start backend:

```bash
cd backend
npm run dev
```

Start frontend:

```bash
cd frontend
npm run dev
```

Open:

- Frontend: http://localhost:3000
- Backend health: http://localhost:5000/health

## 8. Optional: Start IPFS + Blockchain (Docker)

From repo root:

```bash
./start-services.sh
```

Or manually:

```bash
docker compose up -d
```

Deploy contract:

```bash
cd blockchain
npm run deploy
```

This writes blockchain/deployment.json. Backend reads this automatically on startup.

If needed, explicitly set CONTRACT_ADDRESS in backend/.env.

## 9. Optional: Full Docker Mode

Run everything in containers:

```bash
docker compose -f docker-compose-full.yml up -d
```

Check logs:

```bash
docker compose -f docker-compose-full.yml logs -f
```

Stop:

```bash
docker compose -f docker-compose-full.yml down
```

## 10. Current Test Accounts

- Admin: admin@lifeledger.com / Test@123456
- Doctor: aditya.singh@lifeledger.com / Test@123456
- Patient: patient@lifeledger.com / Test@123456

## 11. Verify Setup Quickly

Backend health:

```bash
curl http://localhost:5000/health
```

Frontend reachable:

```bash
curl -I http://localhost:3000
```

IPFS (if running):

```bash
curl http://localhost:5001/api/v0/version
```

Blockchain JSON-RPC (if running):

```bash
curl -X POST http://localhost:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

## 12. Helpful Commands

Run backend seed manually:

```bash
cd backend
npm run seed
```

Regenerate patient QR values:

```bash
cd backend
npm run regenerate-qr
```

Test SMTP config:

```bash
cd backend
npm run test-email
```

## 13. Troubleshooting

Port already in use:

```bash
lsof -i :3000
lsof -i :5000
lsof -i :5432
```

Backend cannot connect to DB:

- Confirm postgres is running.
- Confirm backend/.env DB_* values are correct.
- Confirm medsecure database exists.

AI insight generation returns unavailable/high demand:

- This is a provider-side temporary condition from Gemini.
- Retry the request after a short delay.

Hydration mismatch with class like vsc-initialized in dev:

- This is usually caused by browser extensions altering DOM before React hydration.
