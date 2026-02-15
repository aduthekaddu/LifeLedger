#!/bin/bash

echo "🚀 Starting LifeLedger Services..."
echo ""

# Start IPFS and Blockchain with Docker
echo "📦 Starting IPFS and Blockchain containers..."
docker compose up -d

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check IPFS
echo ""
echo "🔍 Checking IPFS..."
if curl -s http://localhost:5001/api/v0/version > /dev/null; then
    echo "✅ IPFS is running on http://localhost:5001"
    IPFS_VERSION=$(curl -s http://localhost:5001/api/v0/version | grep -o '"Version":"[^"]*"' | cut -d'"' -f4)
    echo "   Version: $IPFS_VERSION"
else
    echo "❌ IPFS is not responding"
    echo "   Checking logs..."
    docker compose logs ipfs | tail -5
fi

# Check Blockchain
echo ""
echo "🔍 Checking Blockchain..."
if curl -s -X POST http://localhost:8545 \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' > /dev/null; then
    echo "✅ Blockchain is running on http://localhost:8545"
else
    echo "❌ Blockchain is not responding"
    echo "   Checking logs..."
    docker compose logs hardhat | tail -5
fi

echo ""
echo "📋 Service Status:"
docker compose ps

echo ""
echo "✨ Services started successfully!"
echo ""
echo "Next steps:"
echo "1. Deploy smart contract: cd blockchain && npm run deploy"
echo "2. Start backend: cd backend && npm run dev"
echo "3. Start frontend: cd frontend && npm run dev"
echo ""
echo "Useful commands:"
echo "  Stop services: docker compose down"
echo "  View logs: docker compose logs -f"
echo "  View IPFS logs: docker compose logs -f ipfs"
echo "  View Blockchain logs: docker compose logs -f hardhat"
