#!/bin/bash

echo "🔍 LifeLedger - Blockchain Verification"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "1️⃣ Checking Smart Contract Deployment..."
if [ -f "blockchain/deployment.json" ]; then
    echo -e "${GREEN}✅ Smart contract deployed${NC}"
    echo ""
    echo "📄 Deployment Info:"
    cat blockchain/deployment.json | grep -E '"address"|"network"|"deployedAt"' | sed 's/^/   /'
    echo ""
    
    CONTRACT_ADDRESS=$(cat blockchain/deployment.json | grep -o '"address":"[^"]*' | cut -d'"' -f4)
    echo -e "${BLUE}📍 Contract Address: ${CONTRACT_ADDRESS}${NC}"
else
    echo -e "${RED}❌ deployment.json not found${NC}"
    echo "   Run: cd blockchain && npm run deploy"
fi

echo ""
echo "2️⃣ Checking Blockchain Node..."
if curl -s -X POST http://localhost:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' > /dev/null 2>&1; then
    
    BLOCK_NUM=$(curl -s -X POST http://localhost:8545 \
      -H "Content-Type: application/json" \
      -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
      | grep -o '"result":"[^"]*' | cut -d'"' -f4)
    
    echo -e "${GREEN}✅ Hardhat node is running${NC}"
    echo "   Latest block: $BLOCK_NUM"
else
    echo -e "${RED}❌ Hardhat node is NOT running${NC}"
    echo "   Start it with: docker compose -f docker-compose-full.yml up -d hardhat"
fi

echo ""
echo "3️⃣ Checking IPFS Node..."
if curl -s -X POST http://localhost:5001/api/v0/version > /dev/null 2>&1; then
    IPFS_VERSION=$(curl -s -X POST http://localhost:5001/api/v0/version | grep -o '"Version":"[^"]*' | cut -d'"' -f4)
    echo -e "${GREEN}✅ IPFS node is running${NC}"
    echo "   Version: $IPFS_VERSION"
else
    echo -e "${RED}❌ IPFS node is NOT running${NC}"
    echo "   Start it with: docker compose -f docker-compose-full.yml up -d ipfs"
fi

echo ""
echo "4️⃣ Checking Backend Configuration..."
if [ -f "backend/.env" ]; then
    if grep -q "CONTRACT_ADDRESS=0x" backend/.env; then
        CONTRACT_IN_ENV=$(grep "CONTRACT_ADDRESS=" backend/.env | cut -d'=' -f2)
        echo -e "${GREEN}✅ Contract address configured${NC}"
        echo "   Address: $CONTRACT_IN_ENV"
    else
        echo -e "${YELLOW}⚠️  Contract address not set in .env${NC}"
        echo "   Add: CONTRACT_ADDRESS=$CONTRACT_ADDRESS"
    fi
    
    if grep -q "OPENAI_API_KEY=sk-" backend/.env; then
        echo -e "${GREEN}✅ OpenAI API key configured${NC}"
    else
        echo -e "${YELLOW}⚠️  OpenAI API key not configured${NC}"
        echo "   AI features will be disabled"
    fi
else
    echo -e "${RED}❌ backend/.env not found${NC}"
fi

echo ""
echo "5️⃣ Checking Database Migration..."
if [ -f "backend/src/utils/migrateBlockchainIPFS.ts" ]; then
    echo -e "${GREEN}✅ Migration script exists${NC}"
    echo "   Run: cd backend && npm run migrate-blockchain"
else
    echo -e "${RED}❌ Migration script not found${NC}"
fi

echo ""
echo "6️⃣ Checking Service Files..."
FILES=(
    "backend/src/services/blockchainService.ts"
    "backend/src/services/ipfsService.ts"
    "backend/src/services/aiService.ts"
    "backend/src/routes/blockchainRoutes.ts"
    "blockchain/contracts/MedicalRecordAudit.sol"
)

ALL_EXIST=true
for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅${NC} $file"
    else
        echo -e "${RED}❌${NC} $file"
        ALL_EXIST=false
    fi
done

echo ""
echo "========================================"
echo -e "${BLUE}📊 Summary${NC}"
echo "========================================"
echo ""

# Check if backend is running
if curl -s http://localhost:5000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend is running${NC}"
    echo "   URL: http://localhost:5000"
    echo ""
    echo "🧪 Test the blockchain API:"
    echo "   1. Login to get token:"
    echo '      curl -X POST http://localhost:5000/api/v1/auth/login \'
    echo '        -H "Content-Type: application/json" \'
    echo '        -d '"'"'{"email":"patient@lifeledger.com","password":"Test@123456"}'"'"''
    echo ""
    echo "   2. Verify blockchain (use token from step 1):"
    echo '      curl http://localhost:5000/api/v1/blockchain/verify \'
    echo '        -H "Authorization: Bearer YOUR_TOKEN"'
else
    echo -e "${YELLOW}⚠️  Backend is not running${NC}"
    echo "   Start it with: cd backend && npm run dev"
fi

echo ""
echo "📚 Documentation:"
echo "   - PROOF_OF_IMPLEMENTATION.md - Complete proof"
echo "   - BLOCKCHAIN_SETUP.md - Setup guide"
echo "   - QUICK_START.md - Quick start"
echo ""
