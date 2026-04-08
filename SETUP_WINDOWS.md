# LifeLedger Windows Setup Guide (A to Z)

This guide is for a fresh Windows machine and covers everything from WSL to PostgreSQL, Docker, and running LifeLedger.

## 0. Recommended Approach

Use WSL2 (Ubuntu) for development, and run all project commands inside WSL.

Why:

- Better Node/Postgres/Linux tooling compatibility
- Faster dependency installs than running from Windows-mounted paths
- Easier Docker integration for IPFS and blockchain

## 1. Install Core Windows Tools

Install these first on Windows:

- Windows Terminal
- Git for Windows
- Docker Desktop

Optional but useful:

- VS Code

## 2. Enable WSL2 And Install Ubuntu

Open PowerShell as Administrator and run:

```powershell
wsl --install -d Ubuntu-24.04
wsl --set-default-version 2
```

Restart Windows if prompted.

After reboot, open Ubuntu and complete first-time setup:

- Choose Linux username
- Choose Linux password

Verify WSL:

```powershell
wsl -l -v
```

You should see Ubuntu running with version 2.

## 3. Update Ubuntu Packages

Inside Ubuntu:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y build-essential curl git ca-certificates gnupg lsb-release unzip
```

## 4. Install Node.js In WSL (via NVM)

Inside Ubuntu:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
source ~/.bashrc

nvm install 20
nvm use 20
nvm alias default 20

node -v
npm -v
```

## 5. Install PostgreSQL In WSL

Inside Ubuntu:

```bash
sudo apt install -y postgresql postgresql-contrib
sudo service postgresql start
```

Set postgres password and create database:

```bash
sudo -u postgres psql
ALTER USER postgres WITH PASSWORD 'postgres';
CREATE DATABASE medsecure;
\q
```

Quick check:

```bash
psql -h localhost -U postgres -d medsecure -c "SELECT version();"
```

If prompted for password, use what you set above.

## 6. Configure Docker Desktop For WSL

In Docker Desktop:

1. Open Settings
2. Go to Resources > WSL Integration
3. Enable integration for your Ubuntu distro
4. Apply and restart Docker Desktop

Verify from Ubuntu:

```bash
docker --version
docker compose version
```

## 7. Clone Project In WSL Filesystem

Important: clone inside Linux filesystem, not under /mnt/c.

Inside Ubuntu:

```bash
mkdir -p ~/code
cd ~/code
git clone <your-repo-url> LifeLedger
cd LifeLedger
```

## 8. Install Project Dependencies

```bash
cd backend
npm install

cd ../frontend
npm install

cd ../blockchain
npm install

cd ..
```

## 9. Create Backend Env File

Create backend/.env:

```env
NODE_ENV=development
PORT=5000
API_VERSION=v1
SEED_DATABASE=true

DB_HOST=localhost
DB_PORT=5432
DB_NAME=medsecure
DB_USER=postgres
DB_PASSWORD=postgres

JWT_SECRET=replace_with_a_strong_secret
ENCRYPTION_KEY=replace_with_a_strong_key

CORS_ORIGIN=http://localhost:3000
FRONTEND_URL=http://localhost:3000
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads
LOG_LEVEL=info

GEMINI_API_KEY=your_gemini_api_key

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=

TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

IPFS_HOST=localhost
IPFS_PORT=5001
IPFS_PROTOCOL=http

BLOCKCHAIN_RPC=http://localhost:8545
CONTRACT_ADDRESS=
```

## 10. Create Frontend Env File

Create frontend/.env.local:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
NEXT_PUBLIC_API_TIMEOUT=30000
```

## 11. Start Backend And Frontend

Terminal 1 (WSL):

```bash
cd ~/code/LifeLedger/backend
npm run dev
```

Terminal 2 (WSL):

```bash
cd ~/code/LifeLedger/frontend
npm run dev
```

Open in browser:

- Frontend: http://localhost:3000
- Backend health: http://localhost:5000/health

## 12. Optional: Start IPFS + Blockchain

From repo root in WSL:

```bash
cd ~/code/LifeLedger
./start-services.sh
```

Deploy smart contract:

```bash
cd blockchain
npm run deploy
```

The deployment writes blockchain/deployment.json, which backend reads on startup.

## 13. Test Accounts

- Admin: admin@lifeledger.com / Test@123456
- Doctor: aditya.singh@lifeledger.com / Test@123456
- Patient: patient@lifeledger.com / Test@123456

## 14. Full Health Check Commands

```bash
curl http://localhost:5000/health
curl -I http://localhost:3000
curl http://localhost:5001/api/v0/version
curl -X POST http://localhost:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

## 15. Common Windows/WSL Issues

### A. Docker command not found in WSL

- Ensure Docker Desktop is running
- Ensure WSL integration is enabled for Ubuntu
- Restart WSL:

```powershell
wsl --shutdown
```

Then reopen Ubuntu.

### B. Port already in use

Inside WSL:

```bash
lsof -i :3000
lsof -i :5000
lsof -i :5432
```

### C. Postgres not running after reboot

Inside WSL:

```bash
sudo service postgresql start
```

### D. Slow npm installs

- Confirm project is under ~/code/... not /mnt/c/...

### E. Backend cannot connect to DB

- Check backend/.env DB values
- Check database exists:

```bash
psql -h localhost -U postgres -lqt
```

### F. AI features not working

- Set GEMINI_API_KEY in backend/.env
- Restart backend

## 16. Optional Helper Scripts

From repo root:

- setup-simple.sh: quick assisted setup
- setup-blockchain.sh: blockchain + IPFS oriented setup
- test-features.sh: feature validation script
- verify-blockchain.sh: blockchain verification script

Run script example:

```bash
chmod +x setup-simple.sh
./setup-simple.sh
```
