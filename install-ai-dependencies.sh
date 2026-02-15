#!/bin/bash

echo "📦 Installing AI File Analysis Dependencies"
echo "==========================================="
echo ""

cd backend

echo "Installing pdf-parse for PDF text extraction..."
npm install pdf-parse@^1.1.1

echo ""
echo "Installing tesseract.js for OCR (image text extraction)..."
npm install tesseract.js@^5.0.4

echo ""
echo "✅ Dependencies installed!"
echo ""
echo "Now you can:"
echo "  1. Upload PDF files - AI will extract and analyze text"
echo "  2. Upload images (JPG, PNG) - AI will use OCR to extract text"
echo "  3. Upload text files - AI will analyze content"
echo ""
echo "Restart backend: cd backend && npm run dev"
