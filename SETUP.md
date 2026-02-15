F# LifeLedger Setup Guide

Complete setup instructions for the LifeLedger medical record management system.

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- Docker and Docker Compose (optional, for blockchain/IPFS)
- Git

## Quick Start (Basic Setup)

### 1. Clone and Install

```bash
git clone <repository-url>
cd "Life Ledger"

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Database Setup

```bash
# Create PostgreSQL database
psql -U postgres
CREATE DATABASE medsecure;
\q

# Database will be initialized automatically on first run
```

### 3. Backend Configuration

Create `backend/.env`:

```env
# Server
NODE_ENV=development
PORT=5000
API_VERSION=v1
SEED_DATABASE=true

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=medsecure
DB_USER=postgres
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d

# Encryption
ENCRYPTION_KEY=your_encryption_key_here

# CORS
CORS_ORIGIN=http://localhost:3000
FRONTEND_URL=http://localhost:3000

# AI (Google Gemini)
GEMINI_API_KEY=your_gemini_api_key

# Email (Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# SMS (Twilio)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=your_twilio_number

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads
```

### 4. Frontend Configuration

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
NEXT_PUBLIC_APP_NAME=LifeLedger
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_MAX_FILE_SIZE=10485760
```

### 5. Start Services

```bash
# Terminal 1: Start backend
cd backend
npm run dev

# Terminal 2: Start frontend
cd frontend
npm run dev
```

Access the application at `http://localhost:3000`

## Test Accounts

The system seeds with these test accounts:

| Role | Email | Password | Patient ID |
|------|-------|----------|------------|
| Admin | admin@medsecure.com | Test@123456 | - |
| Doctor | doctor@medsecure.com | Test@123456 | - |
| Patient | patient@medsecure.com | Test@123456 | PT-2024-0001 |

## Advanced Setup (Blockchain + IPFS)

### Option 1: Using Docker (Recommended)

This is the easiest way to run IPFS and Blockchain without installing them locally.

#### 1. Start Services with Docker

```bash
# Make script executable (first time only)
chmod +x start-services.sh

# Start IPFS and Blockchain containers
./start-services.sh
```

Or manually:

```bash
# Start services
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f ipfs
docker compose logs -f hardhat

# Stop services
docker compose down
```

#### 2. Deploy Smart Contract

```bash
cd blockchain
npm run deploy
```

Copy the contract address from output and update `backend/.env`:

```env
BLOCKCHAIN_ENABLED=true
BLOCKCHAIN_RPC=http://localhost:8545
CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
```

#### 3. Update IPFS Configuration

Update `backend/.env`:

```env
IPFS_HOST=localhost
IPFS_PORT=5001
IPFS_PROTOCOL=http
```

#### 4. Run Database Migration

```bash
cd backend
npm run migrate:blockchain
```

#### 5. Restart Backend

Restart the backend server to enable blockchain and IPFS features.

### Option 2: Manual Installation (Without Docker)

If you prefer not to use Docker, install IPFS and Hardhat locally.

#### 1. Install IPFS

**Linux:**
```bash
wget https://dist.ipfs.tech/kubo/v0.24.0/kubo_v0.24.0_linux-amd64.tar.gz
tar -xvzf kubo_v0.24.0_linux-amd64.tar.gz
cd kubo
sudo bash install.sh
ipfs --version
```

**macOS:**
```bash
brew install ipfs
```

**Initialize and Start:**
```bash
ipfs init
ipfs daemon
```

#### 2. Install Blockchain Dependencies

```bash
cd blockchain
npm install
```

#### 3. Start Local Blockchain

```bash
# Terminal: Start Hardhat node
cd blockchain
npx hardhat node
```

#### 4. Deploy Smart Contract

```bash
# In another terminal
cd blockchain
npm run deploy
```

Copy the contract address and update `backend/.env`:

```env
BLOCKCHAIN_ENABLED=true
BLOCKCHAIN_RPC=http://localhost:8545
CONTRACT_ADDRESS=0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
```

#### 5. Update IPFS Configuration

Update `backend/.env`:

```env
IPFS_HOST=localhost
IPFS_PORT=5001
IPFS_PROTOCOL=http
```

#### 6. Run Database Migration

```bash
cd backend
npm run migrate:blockchain
```

#### 7. Restart Backend

Restart the backend server to enable blockchain and IPFS features.

## Docker Setup (Alternative)

### Full Stack with Docker

Use Docker Compose to run everything (database, backend, frontend, IPFS, blockchain):

```bash
# Start all services
docker compose -f docker-compose-full.yml up -d

# View logs
docker compose -f docker-compose-full.yml logs -f

# Stop services
docker compose -f docker-compose-full.yml down
```

### Services Only (Recommended for Development)

Run only IPFS and Blockchain in Docker, while running backend/frontend locally:

```bash
# Start IPFS and Blockchain
./start-services.sh

# Or manually
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f

# Stop services
docker compose down
```

This approach gives you:
- Fast development with hot reload
- Easy debugging
- IPFS and Blockchain in containers
- Backend and Frontend running locally

## API Keys Setup

### Google Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Add to `backend/.env` as `GEMINI_API_KEY`

### Gmail SMTP (for emails)

1. Enable 2FA on your Gmail account
2. Generate an App Password: [Google Account Settings](https://myaccount.google.com/apppasswords)
3. Add to `backend/.env` as `SMTP_USER` and `SMTP_PASS`

### Twilio (for SMS)

1. Sign up at [Twilio](https://www.twilio.com/)
2. Get Account SID, Auth Token, and Phone Number
3. Add to `backend/.env`

## Verification

Test the setup:

```bash
# Check backend health
curl http://localhost:5000/health

# Check IPFS (if using Docker)
curl http://localhost:5001/api/v0/version

# Check blockchain (if using Docker)
curl -X POST http://localhost:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# Check frontend
open http://localhost:3000

# Login with test account
# Email: patient@medsecure.com
# Password: Test@123456
```

## Docker Commands Reference

```bash
# Start services
docker compose up -d

# Stop services
docker compose down

# View all logs
docker compose logs -f

# View specific service logs
docker compose logs -f ipfs
docker compose logs -f hardhat

# Restart a service
docker compose restart ipfs

# Check service status
docker compose ps

# Remove all containers and volumes
docker compose down -v
```

## Troubleshooting

### Database Connection Issues

```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Test connection
psql -U postgres -d medsecure
```

### Port Already in Use

```bash
# Find process using port 5000
lsof -i :5000
kill -9 <PID>

# Find process using port 3000
lsof -i :3000
kill -9 <PID>
```

### IPFS Not Starting

**Docker:**
```bash
# Check IPFS logs
docker compose logs ipfs

# Restart IPFS
docker compose restart ipfs

# Check if port is in use
lsof -i :5001
```

**Local Installation:**
```bash
# Initialize IPFS (first time only)
ipfs init

# Check IPFS version
ipfs version

# Start daemon
ipfs daemon

# Test connection
curl http://localhost:5001/api/v0/version
```

### Blockchain Deployment Failed

**Docker:**
```bash
# Check Hardhat logs
docker compose logs hardhat

# Restart blockchain
docker compose restart hardhat

# Redeploy contract
cd blockchain
npm run deploy
```

**Local Installation:**
```bash
# Clean and redeploy
cd blockchain
rm -rf artifacts cache
npx hardhat clean
npx hardhat node
npm run deploy
```

## Next Steps

- Read [ARCHITECTURE.md](./ARCHITECTURE.md) for system design
- Read [DEBUGGING.md](./DEBUGGING.md) for troubleshooting
- Read [FLOW.md](./FLOW.md) for user workflows
