#!/bin/bash

echo "🔧 Fixing Dependencies..."
echo ""

# Backend
echo "📦 Updating backend dependencies..."
cd backend

# Install correct packages with ethers v6
npm install ethers@^6.10.0

echo "✅ Backend dependencies fixed"
cd ..

echo ""
echo "✅ All dependencies fixed!"
echo ""
echo "Now run: ./setup-simple.sh"
