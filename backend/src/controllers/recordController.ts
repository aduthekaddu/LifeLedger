import { Request, Response } from 'express';
import pool from '../config/database';
import logger from '../config/logger';
import { encrypt, decrypt } from '../utils/encryption';
import { AuthRequest } from '../middleware/auth';
import { uploadToIPFS } from '../services/ipfsService';
import { logAccessToBlockchain } from '../services/blockchainService';
import { analyzeMedicalRecord } from '../services/aiService';
import { analyzeFileContent } from '../services/fileAnalysisService';

export const createRecord = async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();
  
  try {
    const { patientId, title, description, recordType, recordDate } = req.body;
    const userId = req.user!.id;
    const role = req.user!.role;

    // Verify permissions
    if (role === 'patient') {
      // Patients can only create records for themselves
      if (parseInt(patientId) !== userId) {
        return res.status(403).json({ error: 'Cannot create records for other patients' });
      }
    }

    // Encrypt sensitive data
    const encryptedDescription = description ? encrypt(description) : null;

    // Handle file upload
    const filePath = (req as any).file?.path || null;
    const fileHash = (req as any).file?.filename || null;

    // Upload to IPFS if file exists
    let ipfsCid = null;
    if (filePath) {
      const ipfsResult = await uploadToIPFS(filePath);
      if (ipfsResult.success) {
        ipfsCid = ipfsResult.cid;
        console.log('✅ File uploaded to IPFS:', ipfsCid);
      }
    }

    // Insert record into database
    const result = await client.query(
      `INSERT INTO medical_records (patient_id, doctor_id, title, description, record_type, record_date, file_path, file_hash, is_encrypted, ipfs_cid)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, patient_id, doctor_id, title, record_type, record_date, created_at, ipfs_cid`,
      [patientId, role === 'doctor' ? userId : null, title, encryptedDescription, recordType, recordDate, filePath, fileHash, true, ipfsCid]
    );

    const recordId = result.rows[0].id;

    // Get patient info for blockchain
    const patientInfo = await client.query(
      'SELECT patient_id FROM users WHERE id = $1',
      [patientId]
    );

    // Log to blockchain
    const blockchainResult = await logAccessToBlockchain(
      recordId,
      { title, recordType, recordDate },
      'CREATE',
      patientInfo.rows[0]?.patient_id || `USER-${patientId}`,
      role === 'doctor' ? `DOC-${userId}` : '',
      false
    );

    // AI Analysis (async, don't wait)
    // Extract text from file if exists, then analyze
    if (filePath || description) {
      (async () => {
        try {
          let extractedText = '';
          
          // Extract text from uploaded file
          if (filePath) {
            console.log('📄 Extracting text from file:', filePath);
            const fileAnalysis = await analyzeFileContent(filePath, recordType);
            
            if (fileAnalysis.success && fileAnalysis.extractedText) {
              extractedText = fileAnalysis.extractedText;
              console.log(`✅ Extracted ${extractedText.length} characters from file`);
            }
          }
          
          // Run AI analysis with both description and file content
          const aiResult = await analyzeMedicalRecord({
            title,
            description: description || '',
            recordType,
            recordDate,
            extractedFileText: extractedText,
          });
          
          if (aiResult.success) {
            // Store AI insights in database
            await client.query(
              `UPDATE medical_records SET ai_insights = $1 WHERE id = $2`,
              [JSON.stringify(aiResult.insights), recordId]
            );
            console.log('✅ AI insights saved for record', recordId);
          }
        } catch (err) {
          console.error('AI analysis failed:', err);
        }
      })();
    }

    // Log access
    await client.query(
      `INSERT INTO access_logs (user_id, patient_id, record_id, action, access_type, blockchain_tx)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, patientId, recordId, 'CREATE', 'normal', blockchainResult.txHash || null]
    );

    logger.info(`Record created by ${role} ${userId} for patient ${patientId}`);

    res.status(201).json({
      message: 'Record created successfully. AI analysis in progress...',
      record: {
        ...result.rows[0],
        blockchain: blockchainResult.success ? {
          txHash: blockchainResult.txHash,
          blockNumber: blockchainResult.blockNumber,
        } : null,
      },
    });
  } catch (error) {
    logger.error('Create record error:', error);
    res.status(500).json({ error: 'Failed to create record' });
  } finally {
    client.release();
  }
};

export const getRecords = async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();
  
  try {
    const userId = req.user!.id;
    const role = req.user!.role;
    const { patientId } = req.query;

    let query = '';
    let params: any[] = [];

    if (role === 'patient') {
      query = `
        SELECT r.id, r.title, r.record_type, r.record_date, r.file_path, r.created_at,
               d.first_name as doctor_first_name, d.last_name as doctor_last_name
        FROM medical_records r
        LEFT JOIN users d ON r.doctor_id = d.id
        WHERE r.patient_id = $1
        ORDER BY r.record_date DESC
      `;
      params = [userId];
    } else if (role === 'doctor') {
      if (!patientId) {
        return res.status(400).json({ error: 'Patient ID required' });
      }

      // Check if doctor has access
      const accessCheck = await client.query(
        `SELECT id FROM access_requests 
         WHERE doctor_id = $1 AND patient_id = $2 AND status = 'approved'`,
        [userId, patientId]
      );

      if (accessCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Access not granted' });
      }

      query = `
        SELECT r.id, r.title, r.record_type, r.record_date, r.file_path, r.created_at,
               p.first_name as patient_first_name, p.last_name as patient_last_name
        FROM medical_records r
        LEFT JOIN users p ON r.patient_id = p.id
        WHERE r.patient_id = $1
        ORDER BY r.record_date DESC
      `;
      params = [patientId];

      // Log access
      await client.query(
        `INSERT INTO access_logs (user_id, patient_id, action, access_type)
         VALUES ($1, $2, $3, $4)`,
        [userId, patientId, 'VIEW_RECORDS', 'normal']
      );
    } else if (role === 'admin') {
      query = `
        SELECT r.id, r.title, r.record_type, r.record_date, r.created_at,
               p.first_name as patient_first_name, p.last_name as patient_last_name,
               d.first_name as doctor_first_name, d.last_name as doctor_last_name
        FROM medical_records r
        LEFT JOIN users p ON r.patient_id = p.id
        LEFT JOIN users d ON r.doctor_id = d.id
        ${patientId ? 'WHERE r.patient_id = $1' : ''}
        ORDER BY r.created_at DESC
        LIMIT 100
      `;
      params = patientId ? [patientId] : [];
    }

    const result = await client.query(query, params);

    res.json({ records: result.rows });
  } catch (error) {
    logger.error('Get records error:', error);
    res.status(500).json({ error: 'Failed to get records' });
  } finally {
    client.release();
  }
};

export const getRecordById = async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const role = req.user!.role;

    const result = await client.query(
      `SELECT r.*, 
              p.first_name as patient_first_name, p.last_name as patient_last_name, p.patient_id,
              d.first_name as doctor_first_name, d.last_name as doctor_last_name
       FROM medical_records r
       LEFT JOIN users p ON r.patient_id = p.id
       LEFT JOIN users d ON r.doctor_id = d.id
       WHERE r.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }

    const record = result.rows[0];

    // Check permissions
    if (role === 'patient' && record.patient_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    } else if (role === 'doctor') {
      const accessCheck = await client.query(
        `SELECT id FROM access_requests 
         WHERE doctor_id = $1 AND patient_id = $2 AND status = 'approved'`,
        [userId, record.patient_id]
      );

      if (accessCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // Decrypt description if encrypted
    if (record.is_encrypted && record.description) {
      try {
        record.description = decrypt(record.description);
      } catch (error) {
        console.error('Decryption error:', error);
      }
    }

    // Log to blockchain
    const blockchainResult = await logAccessToBlockchain(
      parseInt(id),
      { title: record.title, recordType: record.record_type },
      'VIEW',
      record.patient_id || `USER-${record.patient_id}`,
      role === 'doctor' ? `DOC-${userId}` : '',
      false
    );

    // Log access
    await client.query(
      `INSERT INTO access_logs (user_id, patient_id, record_id, action, access_type, blockchain_tx)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, record.patient_id, id, 'VIEW_RECORD', 'normal', blockchainResult.txHash || null]
    );

    // Parse AI insights if available
    let aiInsights = null;
    if (record.ai_insights) {
      try {
        aiInsights = JSON.parse(record.ai_insights);
      } catch (error) {
        console.error('Failed to parse AI insights:', error);
      }
    }

    res.json({
      record: {
        ...record,
        aiInsights,
        blockchain: blockchainResult.success ? {
          verified: true,
          txHash: blockchainResult.txHash,
          blockNumber: blockchainResult.blockNumber,
        } : null,
      },
    });
  } catch (error) {
    logger.error('Get record error:', error);
    res.status(500).json({ error: 'Failed to get record' });
  } finally {
    client.release();
  }
};

export const deleteRecord = async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const role = req.user!.role;

    // Get record
    const recordResult = await client.query(
      'SELECT patient_id FROM medical_records WHERE id = $1',
      [id]
    );

    if (recordResult.rows.length === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }

    const record = recordResult.rows[0];

    // Check permissions
    if (role === 'patient' && record.patient_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    } else if (role === 'doctor') {
      return res.status(403).json({ error: 'Doctors cannot delete records' });
    }

    // Delete record
    await client.query('DELETE FROM medical_records WHERE id = $1', [id]);

    // Log action
    await client.query(
      `INSERT INTO access_logs (user_id, patient_id, record_id, action, access_type)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, record.patient_id, id, 'DELETE', 'normal']
    );

    logger.info(`Record ${id} deleted by user ${userId}`);

    res.json({ message: 'Record deleted successfully' });
  } catch (error) {
    logger.error('Delete record error:', error);
    res.status(500).json({ error: 'Failed to delete record' });
  } finally {
    client.release();
  }
};

export const downloadFile = async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const role = req.user!.role;

    // Get record
    const recordResult = await client.query(
      'SELECT patient_id, file_path, title FROM medical_records WHERE id = $1',
      [id]
    );

    if (recordResult.rows.length === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }

    const record = recordResult.rows[0];

    if (!record.file_path) {
      return res.status(404).json({ error: 'No file attached to this record' });
    }

    // Check permissions
    if (role === 'patient' && record.patient_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    } else if (role === 'doctor') {
      const accessCheck = await client.query(
        `SELECT id FROM access_requests 
         WHERE doctor_id = $1 AND patient_id = $2 AND status = 'approved'`,
        [userId, record.patient_id]
      );

      if (accessCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // Log download
    await client.query(
      `INSERT INTO access_logs (user_id, patient_id, record_id, action, access_type)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, record.patient_id, id, 'DOWNLOAD_FILE', 'normal']
    );

    // Send file
    const path = require('path');
    const filePath = path.resolve(record.file_path);
    res.download(filePath, `${record.title}-${id}${path.extname(filePath)}`);
  } catch (error) {
    logger.error('Download file error:', error);
    res.status(500).json({ error: 'Failed to download file' });
  } finally {
    client.release();
  }
};
