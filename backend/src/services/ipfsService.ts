import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';
import logger from '../config/logger';

let ipfsAvailable = false;
let ipfsHost: string;
let ipfsPort: number;
let ipfsProtocol: string;

// Initialize IPFS client
async function initializeIPFS() {
  try {
    ipfsHost = process.env.IPFS_HOST || 'localhost';
    ipfsPort = parseInt(process.env.IPFS_PORT || '5001');
    ipfsProtocol = process.env.IPFS_PROTOCOL || 'http';

    // Test connection
    const response = await axios.post(`${ipfsProtocol}://${ipfsHost}:${ipfsPort}/api/v0/version`);
    
    if (response.data) {
      ipfsAvailable = true;
      console.log('✅ IPFS service initialized');
      console.log('📍 IPFS version:', response.data.Version);
    }
  } catch (error: any) {
    console.error('❌ IPFS initialization error:', error.message);
    console.warn('⚠️  IPFS not available. Files will be stored locally only.');
  }
}

// Initialize on module load
initializeIPFS();

/**
 * Upload file to IPFS
 */
export async function uploadToIPFS(filePath: string): Promise<{ success: boolean; cid?: string; error?: string }> {
  try {
    if (!ipfsAvailable) {
      return { success: false, error: 'IPFS not initialized' };
    }

    // Read file
    const fileBuffer = fs.readFileSync(filePath);
    
    // Create form data
    const formData = new FormData();
    formData.append('file', fileBuffer, {
      filename: filePath.split('/').pop(),
    });

    // Upload to IPFS
    const response = await axios.post(
      `${ipfsProtocol}://${ipfsHost}:${ipfsPort}/api/v0/add?pin=true`,
      formData,
      {
        headers: formData.getHeaders(),
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      }
    );

    const cid = response.data.Hash;
    console.log('✅ File uploaded to IPFS:', cid);

    return {
      success: true,
      cid,
    };
  } catch (error: any) {
    console.error('❌ IPFS upload error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Download file from IPFS
 */
export async function downloadFromIPFS(cid: string): Promise<{ success: boolean; data?: Buffer; error?: string }> {
  try {
    if (!ipfsAvailable) {
      return { success: false, error: 'IPFS not initialized' };
    }

    // Download from IPFS
    const response = await axios.post(
      `${ipfsProtocol}://${ipfsHost}:${ipfsPort}/api/v0/cat?arg=${cid}`,
      null,
      {
        responseType: 'arraybuffer',
      }
    );

    const data = Buffer.from(response.data);

    console.log('✅ File downloaded from IPFS:', cid);

    return {
      success: true,
      data,
    };
  } catch (error: any) {
    console.error('❌ IPFS download error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Pin file to IPFS (ensure it persists)
 */
export async function pinToIPFS(cid: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!ipfsAvailable) {
      return { success: false, error: 'IPFS not initialized' };
    }

    await axios.post(`${ipfsProtocol}://${ipfsHost}:${ipfsPort}/api/v0/pin/add?arg=${cid}`);

    console.log('✅ File pinned to IPFS:', cid);

    return { success: true };
  } catch (error: any) {
    console.error('❌ IPFS pin error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Unpin file from IPFS
 */
export async function unpinFromIPFS(cid: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!ipfsAvailable) {
      return { success: false, error: 'IPFS not initialized' };
    }

    await axios.post(`${ipfsProtocol}://${ipfsHost}:${ipfsPort}/api/v0/pin/rm?arg=${cid}`);

    console.log('✅ File unpinned from IPFS:', cid);

    return { success: true };
  } catch (error: any) {
    console.error('❌ IPFS unpin error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Get IPFS stats
 */
export async function getIPFSStats() {
  try {
    if (!ipfsAvailable) {
      return { available: false };
    }

    const response = await axios.post(`${ipfsProtocol}://${ipfsHost}:${ipfsPort}/api/v0/repo/stat`);

    return {
      available: true,
      numObjects: response.data.NumObjects?.toString() || '0',
      repoSize: response.data.RepoSize?.toString() || '0',
      storageMax: response.data.StorageMax?.toString() || '0',
    };
  } catch (error: any) {
    console.error('❌ IPFS stats error:', error.message);
    return { available: false };
  }
}

export { ipfsAvailable };
