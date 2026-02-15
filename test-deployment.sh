#!/bin/bash

echo "🧪 Testing Blockchain Deployment"
echo "================================"
echo ""

# Check if Hardhat node is running
echo "1️⃣ Checking Hardhat node..."
if curl -s -X POST http://localhost:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' > /dev/null 2>&1; then
    echo "✅ Hardhat node is running"
else
    echo "❌ Hardhat node is NOT running"
    echo "   Start it with: docker compose -f docker-compose-full.yml up -d hardhat"
    exit 1
fi

echo ""
echo "2️⃣ Deploying smart contract..."
cd blockchain
npm run deploy

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Deployment successful!"
    
    if [ -f "deployment.json" ]; then
        echo ""
        echo "📄 Deployment Info:"
        cat deployment.json | grep -E '"address"|"network"|"deployedAt"'
        
        CONTRACT_ADDRESS=$(cat deployment.json | grep -o '"address":"[^"]*' | cut -d'"' -f4)
        echo ""
        echo "📍 Contract Address: $CONTRACT_ADDRESS"
        echo ""
        echo "✅ Add this to backend/.env:"
        echo "   CONTRACT_ADDRESS=$CONTRACT_ADDRESS"
    fi
else
    echo ""
    echo "❌ Deployment failed"
    exit 1
fi

cd ..
