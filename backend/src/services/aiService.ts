import { GoogleGenAI } from '@google/genai';
// Assuming logger is correctly implemented in your workspace
// import logger from '../config/logger';

let ai: GoogleGenAI | null = null;

// Initialize Gemini client
function initializeAI() {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      console.warn('⚠️  Gemini API key not configured. AI features will be disabled.');
      console.warn('⚠️  Get a free API key from: https://aistudio.google.com/app/apikey');
      return;
    }

    ai = new GoogleGenAI({ apiKey });
    console.log('✅ AI service initialized (Google Gemini)');
  } catch (error: any) {
    console.error('❌ AI initialization error:', error.message);
  }
}

// Initialize on module load
initializeAI();

/**
 * Analyze medical record with AI (including file content)
 */
export async function analyzeMedicalRecord(
  recordData: {
    title: string;
    description: string;
    recordType: string;
    recordDate: string;
    extractedFileText?: string;
  }
): Promise<{ success: boolean; insights?: any; error?: string }> {
  try {
    if (!ai) {
      return { success: false, error: 'AI service not initialized' };
    }

    const fullContent = [
      `Title: ${recordData.title}`,
      `Type: ${recordData.recordType}`,
      `Date: ${recordData.recordDate}`,
      recordData.description ? `Description: ${recordData.description}` : '',
      recordData.extractedFileText ? `\nExtracted from uploaded file:\n${recordData.extractedFileText.substring(0, 3000)}` : '',
    ].filter(Boolean).join('\n');

    const prompt = `You are a medical AI assistant analyzing patient records. Analyze this medical record and provide insights.

${fullContent}

Provide your analysis using the following JSON schema keys:
- "summary": string (A 2-3 sentence summary of key findings)
- "concerns": array of strings (Potential concerns or red flags)
- "recommendations": array of strings (Recommended follow-up actions)
- "relatedConditions": array of strings (Related medical conditions to monitor)`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', // Updated to current stable model
      contents: prompt,
      config: {
        responseMimeType: "application/json", // Forces pure JSON output natively
      }
    });

    let insights;
    try {
      // Because of responseMimeType, response.text is guaranteed to be a JSON string
      insights = JSON.parse(response.text || '{}');
    } catch (parseError) {
      console.warn('Failed to parse guaranteed JSON, structuring manually');
      insights = {
        summary: response.text?.substring(0, 500) || '',
        concerns: [],
        recommendations: [],
        relatedConditions: [],
      };
    }

    console.log('✅ AI analysis completed for record');

    return { success: true, insights };
  } catch (error: any) {
    console.error('❌ AI analysis error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Generate medical summary from multiple records
 */
export async function generateMedicalSummary(
  records: Array<{
    title: string;
    recordType: string;
    recordDate: string;
    description?: string;
  }>
): Promise<{ success: boolean; summary?: string; error?: string }> {
  try {
    if (!ai) {
      return { success: false, error: 'AI service not initialized' };
    }

    const recordsList = records
      .map(
        (r, i) =>
          `${i + 1}. ${r.title} (${r.recordType}) - ${r.recordDate}${
            r.description ? '\n   ' + r.description.substring(0, 200) : ''
          }`
      )
      .join('\n');

    const prompt = `Generate a comprehensive medical summary from these records:

${recordsList}

Provide:
1. Overall health status
2. Chronic conditions identified
3. Treatment history
4. Important dates and milestones
5. Recommendations for ongoing care`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    console.log('✅ Medical summary generated');

    return {
      success: true,
      summary: response.text,
    };
  } catch (error: any) {
    console.error('❌ Summary generation error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Detect anomalies in medical data
 */
export async function detectAnomalies(
  recordData: {
    title: string;
    description: string;
    recordType: string;
    vitalSigns?: any;
  }
): Promise<{ success: boolean; anomalies?: string[]; severity?: string; error?: string }> {
  try {
    if (!ai) {
      return { success: false, error: 'AI service not initialized' };
    }

    const prompt = `Analyze this medical data for anomalies:

Title: ${recordData.title}
Type: ${recordData.recordType}
Description: ${recordData.description}
${recordData.vitalSigns ? `Vital Signs: ${JSON.stringify(recordData.vitalSigns)}` : ''}

Identify any unusual patterns, concerning values, or potential issues. Rate severity as: low, medium, high, or critical.

Respond strictly with these JSON keys: "anomalies" (array of strings) and "severity" (string).`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    let resultData;
    try {
      resultData = JSON.parse(response.text || '{}');
    } catch {
      resultData = { anomalies: [], severity: 'low' };
    }

    console.log('✅ Anomaly detection completed');

    return {
      success: true,
      anomalies: resultData.anomalies || [],
      severity: resultData.severity || 'low',
    };
  } catch (error: any) {
    console.error('❌ Anomaly detection error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Generate patient recommendations
 */
export async function generateRecommendations(
  patientData: {
    age?: number;
    conditions?: string[];
    recentRecords?: string[];
  }
): Promise<{ success: boolean; recommendations?: string[]; error?: string }> {
  try {
    if (!ai) {
      return { success: false, error: 'AI service not initialized' };
    }

    const prompt = `Generate personalized health recommendations for a patient:

Age: ${patientData.age || 'Unknown'}
Known Conditions: ${patientData.conditions?.join(', ') || 'None'}
Recent Records: ${patientData.recentRecords?.join(', ') || 'None'}

Provide 5-7 actionable health recommendations. Format the response as a JSON array of strings.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    let recommendations;
    try {
      recommendations = JSON.parse(response.text || '[]');
      // Handle case where AI wraps the array in an object (e.g., {"recommendations": [...]})
      if (!Array.isArray(recommendations)) {
        recommendations = recommendations.recommendations || [];
      }
    } catch {
      recommendations = [];
    }

    console.log('✅ Recommendations generated');

    return {
      success: true,
      recommendations,
    };
  } catch (error: any) {
    console.error('❌ Recommendations error:', error.message);
    return { success: false, error: error.message };
  }
}

export { ai };