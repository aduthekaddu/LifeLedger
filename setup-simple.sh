#!/bin/bash

echo "🚀 LifeLedger - Quick Setup"
echo "============================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Step 1: Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install
cd ..
echo ""

# Step 2: Start services with docker compose
echo "🐳 Starting Docker services..."
docker compose -f docker-compose-full.yml up -d postgres ipfs hardhat
echo ""

echo "⏳ Waiting 15 seconds for services to start..."
sleep 15

# Step 3: Deploy smart contract
echo "📝 Deploying smart contract..."
cd blockchain
npx hardhat run scripts/deploy.js --network localhost

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Smart contract deployed${NC}"
    
    if [ -f "deployment.json" ]; then
        CONTRACT_ADDRESS=$(cat deployment.json | grep -o '"address":"[^"]*' | cut -d'"' -f4)
        echo -e "${GREEN}📍 Contract: ${CONTRACT_ADDRESS}${NC}"
        
        # Update .env
        cd ../backend
        if grep -q "CONTRACT_ADDRESS=" .env; then
            sed -i.bak "s|CONTRACT_ADDRESS=.*|CONTRACT_ADDRESS=${CONTRACT_ADDRESS}|" .env
        else
            echo "CONTRACT_ADDRESS=${CONTRACT_ADDRESS}" >> .env
        fi
        cd ..
    fi
else
    echo -e "${RED}❌ Deployment failed. Check if Hardhat node is running.${NC}"
    cd ..
fi

echo ""
echo "🗄️  Running database migration..."
cd backend
npm run migrate-blockchain
cd ..

echo ""
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo "🌐 Services:"
echo "  Frontend:   http://localhost:3000"
echo "  Backend:    http://localhost:5000"
echo "  IPFS:       http://localhost:5001"
echo "  Blockchain: http://localhost:8545"
echo ""
echo "👤 Test accounts:"
echo "  admin@lifeledger.com / Test@123456"
echo "  aditya.singh@lifeledger.com / Test@123456"
echo "  patient@lifeledger.com / Test@123456"
echo ""
echo "📝 Next: Set OPENAI_API_KEY in backend/.env for AI features"
echo ""
