import { Request, Response } from 'express';
import pool from '../config/database';
import logger from '../config/logger';
import { encrypt, decrypt } from '../utils/encryption';
import { AuthRequest } from '../middleware/auth';
import { uploadToIPFS } from '../services/ipfsService';
import { logAccessToBlockchain } from '../services/blockchainService';
import { analyzeMedicalRecord } from '../services/aiService';
import { analyzeFileContent } from '../services/fileAnalysisService';

type ColumnInfo = {
  column_name: string;
};

const getTableColumns = async (client: any, tableName: string) => {
  const result = await client.query(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
    `,
    [tableName]
  );

  return new Set<string>(result.rows.map((row: ColumnInfo) => row.column_name));
};

const insertAccessLog = async (
  client: any,
  payload: {
    userId: unknown;
    patientId?: unknown;
    recordId?: unknown;
    action: string;
    blockchainTx?: string | null;
  }
) => {
  const accessLogColumns = await getTableColumns(client, 'access_logs');
  const entries: Array<[string, unknown]> = [];
  const isNumericId = (value: unknown) => /^\d+$/.test(String(value ?? ''));

  if (accessLogColumns.has('user_id') && payload.userId !== undefined && isNumericId(payload.userId)) {
    entries.push(['user_id', payload.userId]);
  }
  if (accessLogColumns.has('patient_id') && payload.patientId !== undefined && isNumericId(payload.patientId)) {
    entries.push(['patient_id', payload.patientId]);
  }
  if (accessLogColumns.has('record_id') && payload.recordId !== undefined && isNumericId(payload.recordId)) {
    entries.push(['record_id', payload.recordId]);
  }
  if (accessLogColumns.has('action')) {
    entries.push(['action', payload.action]);
  }
  if (accessLogColumns.has('blockchain_tx') && payload.blockchainTx) {
    entries.push(['blockchain_tx', payload.blockchainTx]);
  }

  if (!entries.length || !entries.some(([column]) => column === 'action')) {
    return;
  }

  const columns = entries.map(([column]) => column);
  const values = entries.map(([, value]) => value);
  const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');

  await client.query(`INSERT INTO access_logs (${columns.join(', ')}) VALUES (${placeholders})`, values);
};

const toBlockchainRecordId = (value: string | number) => {
  const normalized = String(value);
  if (/^\d+$/.test(normalized)) {
    return parseInt(normalized, 10);
  }

  const hex = normalized.replace(/-/g, '').slice(0, 8);
  return parseInt(hex || '0', 16);
};

export const createRecord = async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();
  
  try {
    const { patientId, title, description, recordType, recordDate } = req.body;
    const userId = req.user!.id;
    const role = req.user!.role;
    const recordsColumns = await getTableColumns(client, 'medical_records');
    const usersColumns = await getTableColumns(client, 'users');
    const providerColumn = recordsColumns.has('doctor_id')
      ? 'doctor_id'
      : recordsColumns.has('provider_id')
      ? 'provider_id'
      : null;

    // Verify permissions
    if (role === 'patient') {
      // Patients can only create records for themselves
      if (String(patientId) !== String(userId)) {
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
    const recordInsert: Record<string, unknown> = {
      patient_id: patientId,
      title,
      record_type: recordType,
      description: encryptedDescription,
    };

    if (providerColumn && role === 'doctor') {
      recordInsert[providerColumn] = userId;
    }

    if (recordsColumns.has('record_date') && recordDate) {
      recordInsert.record_date = recordDate;
    }
    if (recordsColumns.has('file_path') && filePath) {
      recordInsert.file_path = filePath;
    }
    if (recordsColumns.has('file_hash') && fileHash) {
      recordInsert.file_hash = fileHash;
    }
    if (recordsColumns.has('ipfs_cid') && ipfsCid) {
      recordInsert.ipfs_cid = ipfsCid;
    }
    if (recordsColumns.has('is_encrypted')) {
      recordInsert.is_encrypted = true;
    }
    if (recordsColumns.has('mime_type') && (req as any).file?.mimetype) {
      recordInsert.mime_type = (req as any).file.mimetype;
    }
    if (recordsColumns.has('file_size') && (req as any).file?.size) {
      recordInsert.file_size = (req as any).file.size;
    }

    const entries = Object.entries(recordInsert).filter(([, value]) => value !== undefined);
    const insertColumns = entries.map(([key]) => key);
    const insertValues = entries.map(([, value]) => value);
    const placeholders = insertValues.map((_, index) => `$${index + 1}`).join(', ');

    const result = await client.query(
      `INSERT INTO medical_records (${insertColumns.join(', ')}) VALUES (${placeholders}) RETURNING id, patient_id, title, record_type, created_at`,
      insertValues
    );

    const recordId = result.rows[0].id;

    // Get patient info for blockchain
    const patientInfoField = usersColumns.has('patient_id')
      ? 'patient_id'
      : usersColumns.has('blockchain_identity')
      ? 'blockchain_identity'
      : 'NULL AS patient_id';
    const patientInfo = await client.query(`SELECT ${patientInfoField} FROM users WHERE id = $1`, [patientId]);

    // Log to blockchain
    const blockchainResult = await logAccessToBlockchain(
      toBlockchainRecordId(recordId),
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
    await insertAccessLog(client, {
      userId,
      patientId,
      recordId,
      action: 'CREATE',
      blockchainTx: blockchainResult.txHash || null,
    });

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
    const recordsColumns = await getTableColumns(client, 'medical_records');
    const providerColumn = recordsColumns.has('doctor_id')
      ? 'doctor_id'
      : recordsColumns.has('provider_id')
      ? 'provider_id'
      : null;
    const recordDateSelect = recordsColumns.has('record_date')
      ? 'r.record_date'
      : 'r.created_at AS record_date';
    const recordDateOrderBy = recordsColumns.has('record_date') ? 'r.record_date' : 'r.created_at';
    const filePathSelect = recordsColumns.has('file_path')
      ? 'r.file_path'
      : 'NULL AS file_path';
    const softDeleteFilter = recordsColumns.has('is_deleted') ? 'AND COALESCE(r.is_deleted, false) = false' : '';

    let query = '';
    let params: any[] = [];

    if (role === 'patient') {
      query = `
        SELECT r.id, r.title, r.record_type, ${recordDateSelect}, ${filePathSelect}, r.created_at,
               d.first_name as doctor_first_name, d.last_name as doctor_last_name
        FROM medical_records r
        LEFT JOIN users d ON ${providerColumn ? `r.${providerColumn}::text = d.id::text` : 'FALSE'}
        WHERE r.patient_id::text = $1::text
        ${softDeleteFilter}
        ORDER BY ${recordDateOrderBy} DESC
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
        SELECT r.id, r.title, r.record_type, ${recordDateSelect}, ${filePathSelect}, r.created_at,
               p.first_name as patient_first_name, p.last_name as patient_last_name
        FROM medical_records r
        LEFT JOIN users p ON r.patient_id::text = p.id::text
        WHERE r.patient_id::text = $1::text
        ${softDeleteFilter}
        ORDER BY ${recordDateOrderBy} DESC
      `;
      params = [patientId];

      // Log access
      await insertAccessLog(client, {
        userId,
        patientId,
        action: 'VIEW_RECORDS',
      });
    } else if (role === 'admin') {
      query = `
        SELECT r.id, r.title, r.record_type, ${recordDateSelect}, r.created_at,
               p.first_name as patient_first_name, p.last_name as patient_last_name,
               d.first_name as doctor_first_name, d.last_name as doctor_last_name
        FROM medical_records r
        LEFT JOIN users p ON r.patient_id::text = p.id::text
        LEFT JOIN users d ON ${providerColumn ? `r.${providerColumn}::text = d.id::text` : 'FALSE'}
        ${patientId ? 'WHERE r.patient_id::text = $1::text' : 'WHERE 1=1'}
        ${softDeleteFilter}
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
