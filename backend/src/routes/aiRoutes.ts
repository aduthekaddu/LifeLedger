import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { Response } from 'express';
import pool from '../config/database';
import { analyzeMedicalRecord } from '../services/aiService';
import { analyzeFileContent } from '../services/fileAnalysisService';
import { decrypt } from '../utils/encryption';

const router = Router();

/**
 * Get AI insights for a record
 */
router.get('/insights/:recordId', authenticate, async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();
  
  try {
    const { recordId } = req.params;
    const userId = req.user!.id;
    const role = req.user!.role;

    console.log(`🔍 Fetching AI insights for record ${recordId} by user ${userId} (${role})`);

    // Get record
    const result = await client.query(
      `SELECT r.*
       FROM medical_records r
       WHERE r.id = $1`,
      [recordId]
    );

    if (result.rows.length === 0) {
      console.log(`❌ Record ${recordId} not found`);
      return res.status(404).json({ error: 'Record not found' });
    }

    const record = result.rows[0];
    console.log(`📋 Record found: patient_id=${record.patient_id}, doctor_id=${record.doctor_id}`);

    // Check permissions
    if (role === 'patient') {
      if (record.patient_id !== userId) {
        console.log(`❌ Patient ${userId} denied access to record ${recordId} (belongs to patient ${record.patient_id})`);
        return res.status(403).json({ error: 'Access denied' });
      }
      console.log(`✅ Patient ${userId} has access to their own record`);
    } else if (role === 'doctor') {
      const accessCheck = await client.query(
        `SELECT id FROM access_requests 
         WHERE doctor_id = $1 AND patient_id = $2 AND status = 'approved'`,
        [userId, record.patient_id]
      );

      if (accessCheck.rows.length === 0) {
        console.log(`❌ Doctor ${userId} has no approved access to patient ${record.patient_id}`);
        return res.status(403).json({ error: 'Access denied' });
      }
      console.log(`✅ Doctor ${userId} has approved access to patient ${record.patient_id}`);
    } else if (role !== 'admin') {
      console.log(`❌ Role ${role} not allowed`);
      return res.status(403).json({ error: 'Access denied' });
    }

    // Parse AI insights if available
    let aiInsights = null;
    if (record.ai_insights) {
      try {
        aiInsights = JSON.parse(record.ai_insights);
        console.log(`✅ AI insights found for record ${recordId}`);
      } catch (error) {
        console.error('Failed to parse AI insights:', error);
      }
    } else {
      console.log(`ℹ️ No AI insights yet for record ${recordId}`);
    }

    res.json({
      recordId: parseInt(recordId),
      hasInsights: !!aiInsights,
      insights: aiInsights,
      extractedText: record.extracted_text || null,
    });
  } catch (error: any) {
    console.error('Get AI insights error:', error);
    res.status(500).json({ error: 'Failed to get AI insights' });
  } finally {
    client.release();
  }
});

/**
 * Generate AI insights for a record (manual trigger)
 */
router.post('/analyze/:recordId', authenticate, async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();
  
  try {
    const { recordId } = req.params;
    const userId = req.user!.id;
    const role = req.user!.role;

    console.log(`🤖 Generating AI insights for record ${recordId} by user ${userId} (${role})`);

    // Get record
    const result = await client.query(
      `SELECT r.*
       FROM medical_records r
       WHERE r.id = $1`,
      [recordId]
    );

    if (result.rows.length === 0) {
      console.log(`❌ Record ${recordId} not found`);
      return res.status(404).json({ error: 'Record not found' });
    }

    const record = result.rows[0];
    console.log(`📋 Record found: patient_id=${record.patient_id}, doctor_id=${record.doctor_id}`);

    // Check permissions
    if (role === 'patient') {
      if (record.patient_id !== userId) {
        console.log(`❌ Patient ${userId} denied access to record ${recordId} (belongs to patient ${record.patient_id})`);
        return res.status(403).json({ error: 'Access denied' });
      }
      console.log(`✅ Patient ${userId} has access to their own record`);
    } else if (role === 'doctor') {
      const accessCheck = await client.query(
        `SELECT id FROM access_requests 
         WHERE doctor_id = $1 AND patient_id = $2 AND status = 'approved'`,
        [userId, record.patient_id]
      );

      if (accessCheck.rows.length === 0) {
        console.log(`❌ Doctor ${userId} has no approved access to patient ${record.patient_id}`);
        return res.status(403).json({ error: 'Access denied' });
      }
      console.log(`✅ Doctor ${userId} has approved access to patient ${record.patient_id}`);
    } else if (role !== 'admin') {
      console.log(`❌ Role ${role} not allowed`);
      return res.status(403).json({ error: 'Access denied' });
    }

    // Decrypt description if encrypted
    let description = record.description || '';
    if (record.is_encrypted && description) {
      try {
        description = decrypt(description);
      } catch (error) {
        console.error('Decryption error:', error);
      }
    }

    // Extract text from file if exists
    let extractedText = '';
    if (record.file_path) {
      console.log('📄 Extracting text from file:', record.file_path);
      const fileAnalysis = await analyzeFileContent(record.file_path, record.record_type);
      
      if (fileAnalysis.success && fileAnalysis.extractedText) {
        extractedText = fileAnalysis.extractedText;
        console.log(`✅ Extracted ${extractedText.length} characters from file`);
      }
    }

    // Run AI analysis
    const aiResult = await analyzeMedicalRecord({
      title: record.title,
      description,
      recordType: record.record_type,
      recordDate: record.record_date,
      extractedFileText: extractedText,
    });

    if (!aiResult.success) {
      return res.status(500).json({ error: aiResult.error || 'AI analysis failed' });
    }

    // Save insights to database
    await client.query(
      `UPDATE medical_records
       SET ai_insights = $1,
           extracted_text = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [JSON.stringify(aiResult.insights), extractedText || null, recordId]
    );

    console.log('✅ AI insights generated and saved for record', recordId);

    res.json({
      message: 'AI analysis completed successfully',
      insights: aiResult.insights,
    });
  } catch (error: any) {
    console.error('AI analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze record' });
  } finally {
    client.release();
  }
});

export default router;
