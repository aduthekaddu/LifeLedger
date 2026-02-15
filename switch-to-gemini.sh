#!/bin/bash

echo "🔄 Switching from OpenAI to Google Gemini"
echo "=========================================="
echo ""

cd backend

echo "📦 Uninstalling OpenAI..."
npm uninstall openai

echo ""
echo "📦 Installing Google Generative AI..."
npm install @google/generative-ai

echo ""
echo "✅ Switched to Google Gemini!"
echo ""
echo "📝 Next steps:"
echo "  1. Get a FREE Gemini API key from:"
echo "     https://makersuite.google.com/app/apikey"
echo ""
echo "  2. Add to backend/.env:"
echo "     GEMINI_API_KEY=your_key_here"
echo ""
echo "  3. Restart backend:"
echo "     cd backend && npm run dev"
echo ""
echo "🎉 Benefits of Gemini:"
echo "  - FREE tier with generous limits"
echo "  - Fast response times"
echo "  - Good medical analysis"
echo "  - No credit card required"
echo ""
