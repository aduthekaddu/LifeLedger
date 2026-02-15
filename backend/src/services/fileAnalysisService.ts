import fs from 'fs';
import path from 'path';
import pdf from 'pdf-parse';
import Tesseract from 'tesseract.js';
import logger from '../config/logger';

/**
 * Extract text from PDF file
 */
export async function extractTextFromPDF(filePath: string): Promise<{ success: boolean; text?: string; error?: string }> {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);
    
    console.log('✅ Extracted text from PDF:', data.text.substring(0, 100) + '...');
    
    return {
      success: true,
      text: data.text,
    };
  } catch (error: any) {
    console.error('❌ PDF extraction error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Extract text from image using OCR
 */
export async function extractTextFromImage(filePath: string): Promise<{ success: boolean; text?: string; error?: string }> {
  try {
    const result = await Tesseract.recognize(filePath, 'eng', {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          console.log(`📸 OCR Progress: ${Math.round(m.progress * 100)}%`);
        }
      },
    });
    
    console.log('✅ Extracted text from image:', result.data.text.substring(0, 100) + '...');
    
    return {
      success: true,
      text: result.data.text,
    };
  } catch (error: any) {
    console.error('❌ OCR error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Extract text from any supported file type
 */
export async function extractTextFromFile(filePath: string): Promise<{ success: boolean; text?: string; error?: string }> {
  try {
    if (!fs.existsSync(filePath)) {
      return { success: false, error: 'File not found' };
    }

    const ext = path.extname(filePath).toLowerCase();
    
    // PDF files
    if (ext === '.pdf') {
      return await extractTextFromPDF(filePath);
    }
    
    // Image files
    if (['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.gif'].includes(ext)) {
      return await extractTextFromImage(filePath);
    }
    
    // Text files
    if (['.txt', '.csv', '.json', '.xml'].includes(ext)) {
      const text = fs.readFileSync(filePath, 'utf-8');
      return { success: true, text };
    }
    
    return { 
      success: false, 
      error: `Unsupported file type: ${ext}. Supported: PDF, images (JPG, PNG), text files` 
    };
  } catch (error: any) {
    console.error('❌ File extraction error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Analyze file and extract medical information
 */
export async function analyzeFileContent(filePath: string, recordType: string): Promise<{
  success: boolean;
  extractedText?: string;
  summary?: string;
  keyFindings?: string[];
  error?: string;
}> {
  try {
    // Extract text from file
    const extraction = await extractTextFromFile(filePath);
    
    if (!extraction.success || !extraction.text) {
      return {
        success: false,
        error: extraction.error || 'Failed to extract text from file',
      };
    }

    const extractedText = extraction.text;
    
    // Basic analysis without AI (extract key medical terms)
    const keyFindings: string[] = [];
    
    // Medical keywords to look for
    const medicalKeywords = [
      'blood pressure', 'heart rate', 'temperature', 'glucose', 'cholesterol',
      'hemoglobin', 'white blood cells', 'red blood cells', 'platelets',
      'diagnosis', 'prescription', 'medication', 'treatment', 'symptoms',
      'normal', 'abnormal', 'elevated', 'low', 'high', 'positive', 'negative'
    ];
    
    // Extract sentences containing medical keywords
    const sentences = extractedText.split(/[.!?]+/);
    for (const sentence of sentences) {
      const lowerSentence = sentence.toLowerCase();
      for (const keyword of medicalKeywords) {
        if (lowerSentence.includes(keyword)) {
          keyFindings.push(sentence.trim());
          break;
        }
      }
    }
    
    // Limit to top 10 findings
    const topFindings = keyFindings.slice(0, 10);
    
    return {
      success: true,
      extractedText,
      summary: `Extracted ${extractedText.length} characters from ${recordType} document`,
      keyFindings: topFindings,
    };
  } catch (error: any) {
    console.error('❌ File analysis error:', error.message);
    return { success: false, error: error.message };
  }
}
