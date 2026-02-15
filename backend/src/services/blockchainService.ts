import { ethers } from 'ethers';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// Load deployment info
const deploymentPath = path.join(__dirname, '../../../blockchain/deployment.json');
let contractAddress: string;
let contractABI: any[];

try {
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
  contractAddress = deployment.address;
  contractABI = deployment.abi;
} catch (error) {
  console.warn('⚠️  Blockchain deployment not found. Run: cd blockchain && npm run deploy');
  contractAddress = process.env.CONTRACT_ADDRESS || '';
  contractABI = [];
}

// Connect to local Hardhat node
const provider = new ethers.JsonRpcProvider(
  process.env.BLOCKCHAIN_RPC || 'http://localhost:8545'
);

// Use first account from Hardhat node
let wallet: ethers.Wallet;
let contract: ethers.Contract;

async function initializeBlockchain() {
  try {
    // Get accounts from Hardhat node
    const accounts = await provider.listAccounts();
    if (accounts.length === 0) {
      throw new Error('No accounts available');
    }
    
    // Use first account (get signer)
    const signer = await provider.getSigner(0);
    
    // Initialize contract
    if (contractAddress && contractABI.length > 0) {
      contract = new ethers.Contract(contractAddress, contractABI, signer);
      console.log('✅ Blockchain service initialized');
      console.log('📍 Contract address:', contractAddress);
    }
  } catch (error) {
    console.error('❌ Blockchain initialization error:', error);
  }
}

// Initialize on module load
initializeBlockchain();

/**
 * Log medical record access to blockchain
 */
export async function logAccessToBlockchain(
  recordId: number,
  recordData: any,
  accessType: string,
  patientId: string,
  doctorId: string = '',
  isEmergency: boolean = false
) {
  try {
    if (!contract) {
      console.warn('⚠️  Blockchain not initialized, skipping log');
      return { success: false, error: 'Blockchain not initialized' };
    }
    
    // Create hashes
    const recordIdHash = ethers.id(recordId.toString());
    const recordHash = ethers.id(JSON.stringify(recordData));
    
    // Log to blockchain
    const tx = await contract.logAccess(
      recordIdHash,
      recordHash,
      accessType,
      patientId,
      doctorId,
      isEmergency
    );
    
    const receipt = await tx.wait();
    
    console.log('✅ Access logged to blockchain:', receipt.transactionHash);
    
    return {
      success: true,
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString()
    };
  } catch (error: any) {
    console.error('❌ Blockchain logging error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Grant consent on blockchain
 */
export async function grantConsentOnBlockchain(
  consentId: number,
  patientAddress: string,
  doctorAddress: string,
  duration: number = 30 * 24 * 60 * 60, // 30 days default
  consentType: string = 'normal'
) {
  try {
    if (!contract) {
      return { success: false, error: 'Blockchain not initialized' };
    }
    
    const consentIdHash = ethers.id(consentId.toString());
    
    const tx = await contract.grantConsent(
      consentIdHash,
      patientAddress,
      doctorAddress,
      duration,
      consentType
    );
    
    const receipt = await tx.wait();
    
    console.log('✅ Consent granted on blockchain:', receipt.transactionHash);
    
    return {
      success: true,
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber
    };
  } catch (error: any) {
    console.error('❌ Consent grant error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Revoke consent on blockchain
 */
export async function revokeConsentOnBlockchain(consentId: number) {
  try {
    if (!contract) {
      return { success: false, error: 'Blockchain not initialized' };
    }
    
    const consentIdHash = ethers.id(consentId.toString());
    
    const tx = await contract.revokeConsent(consentIdHash);
    const receipt = await tx.wait();
    
    console.log('✅ Consent revoked on blockchain:', receipt.transactionHash);
    
    return {
      success: true,
      txHash: receipt.transactionHash
    };
  } catch (error: any) {
    console.error('❌ Consent revoke error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Get blockchain audit trail for a record
 */
export async function getBlockchainAuditTrail(recordId: number) {
  try {
    if (!contract) {
      return [];
    }
    
    const recordIdHash = ethers.id(recordId.toString());
    const logs = await contract.getAccessLogs(recordIdHash);
    
    return logs.map((log: any) => ({
      accessor: log.accessor,
      timestamp: new Date(Number(log.timestamp) * 1000),
      accessType: log.accessType,
      patientId: log.patientId,
      doctorId: log.doctorId,
      isEmergency: log.isEmergency,
      recordHash: log.recordHash
    }));
  } catch (error: any) {
    console.error('❌ Error fetching blockchain logs:', error.message);
    return [];
  }
}

/**
 * Check if consent is valid on blockchain
 */
export async function isConsentValidOnBlockchain(consentId: number): Promise<boolean> {
  try {
    if (!contract) {
      return false;
    }
    
    const consentIdHash = ethers.id(consentId.toString());
    const isValid = await contract.isConsentValid(consentIdHash);
    
    return isValid;
  } catch (error: any) {
    console.error('❌ Error checking consent:', error.message);
    return false;
  }
}

/**
 * Get blockchain statistics
 */
export async function getBlockchainStats() {
  try {
    if (!contract) {
      return { totalAccesses: 0, totalConsents: 0 };
    }
    
    const stats = await contract.getStats();
    
    return {
      totalAccesses: Number(stats.accesses),
      totalConsents: Number(stats.consentsCount)
    };
  } catch (error: any) {
    console.error('❌ Error fetching stats:', error.message);
    return { totalAccesses: 0, totalConsents: 0 };
  }
}

export { provider, contract };
