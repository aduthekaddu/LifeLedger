#!/bin/bash

echo "🚀 LifeLedger - Blockchain, IPFS & AI Setup"
echo "==========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker is running${NC}"
echo ""

# Step 1: Install blockchain dependencies
echo "📦 Step 1: Installing blockchain dependencies..."
cd blockchain
if [ ! -d "node_modules" ]; then
    npm install
    echo -e "${GREEN}✅ Blockchain dependencies installed${NC}"
else
    echo -e "${YELLOW}⚠️  Dependencies already installed, skipping...${NC}"
fi
cd ..
echo ""

# Step 2: Install backend dependencies
echo "📦 Step 2: Installing backend dependencies..."
cd backend
if [ ! -d "node_modules" ]; then
    npm install
    echo -e "${GREEN}✅ Backend dependencies installed${NC}"
else
    echo -e "${YELLOW}⚠️  Dependencies already installed, skipping...${NC}"
fi
cd ..
echo ""

# Step 3: Start Docker services
echo "🐳 Step 3: Starting Docker services..."
docker compose -f docker-compose-full.yml up -d postgres ipfs hardhat
echo -e "${GREEN}✅ Docker services started${NC}"
echo ""

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Step 4: Deploy smart contract
echo "📝 Step 4: Deploying smart contract..."
cd blockchain
npx hardhat run scripts/deploy.js --network localhost
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Smart contract deployed${NC}"
    
    # Check if deployment.json was created
    if [ -f "deployment.json" ]; then
        CONTRACT_ADDRESS=$(cat deployment.json | grep -o '"address":"[^"]*' | cut -d'"' -f4)
        echo -e "${GREEN}📍 Contract Address: ${CONTRACT_ADDRESS}${NC}"
        
        # Update backend .env
        cd ../backend
        if grep -q "CONTRACT_ADDRESS=" .env; then
            sed -i.bak "s|CONTRACT_ADDRESS=.*|CONTRACT_ADDRESS=${CONTRACT_ADDRESS}|" .env
            echo -e "${GREEN}✅ Updated CONTRACT_ADDRESS in backend/.env${NC}"
        else
            echo "CONTRACT_ADDRESS=${CONTRACT_ADDRESS}" >> .env
            echo -e "${GREEN}✅ Added CONTRACT_ADDRESS to backend/.env${NC}"
        fi
        cd ..
    fi
else
    echo -e "${RED}❌ Smart contract deployment failed${NC}"
    exit 1
fi
cd ..
echo ""

# Step 5: Run database migration
echo "🗄️  Step 5: Running database migration..."
cd backend
npm run migrate-blockchain
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Database migration completed${NC}"
else
    echo -e "${RED}❌ Database migration failed${NC}"
    exit 1
fi
cd ..
echo ""

# Step 6: Configuration check
echo "⚙️  Step 6: Configuration check..."
echo ""
echo "Please verify your backend/.env file has:"
echo "  - OPENAI_API_KEY (for AI features)"
echo "  - SMTP credentials (for email)"
echo "  - Twilio credentials (for SMS)"
echo ""
echo -e "${YELLOW}📝 To add OpenAI API key:${NC}"
echo "   1. Get API key from: https://platform.openai.com/api-keys"
echo "   2. Edit backend/.env and set: OPENAI_API_KEY=your_key_here"
echo ""

# Step 7: Start all services
echo "🚀 Step 7: Starting all services..."
docker compose -f docker-compose-full.yml up -d
echo -e "${GREEN}✅ All services started${NC}"
echo ""

# Display service URLs
echo "🌐 Service URLs:"
echo "================================"
echo "Frontend:    http://localhost:3000"
echo "Backend:     http://localhost:5000"
echo "IPFS API:    http://localhost:5001"
echo "IPFS Gateway: http://localhost:8080"
echo "Blockchain:  http://localhost:8545"
echo ""

# Display logs command
echo "📋 View logs:"
echo "  docker compose -f docker-compose-full.yml logs -f"
echo ""

# Display test accounts
echo "👤 Test Accounts:"
echo "================================"
echo "Admin:   admin@medsecure.com / Test@123456"
echo "Doctor:  doctor@medsecure.com / Test@123456"
echo "Patient: patient@medsecure.com / Test@123456"
echo ""

echo -e "${GREEN}✅ Setup complete! Your LifeLedger system is ready.${NC}"
echo ""
echo "Next steps:"
echo "  1. Open http://localhost:3000 in your browser"
echo "  2. Login with one of the test accounts"
echo "  3. Create a medical record to test blockchain + IPFS + AI"
echo ""
