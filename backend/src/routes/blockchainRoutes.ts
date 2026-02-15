import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { Response } from 'express';
import {
  getBlockchainAuditTrail,
  getBlockchainStats,
  contract,
  provider,
} from '../services/blockchainService';
import { getIPFSStats } from '../services/ipfsService';

const router = Router();

/**
 * Get blockchain statistics
 */
router.get('/stats', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const stats = await getBlockchainStats();
    const ipfsStats = await getIPFSStats();

    // Get blockchain network info
    let networkInfo = null;
    if (provider) {
      try {
        const network = await provider.getNetwork();
        const blockNumber = await provider.getBlockNumber();
        
        networkInfo = {
          chainId: Number(network.chainId),
          name: network.name,
          blockNumber,
        };
      } catch (error) {
        console.error('Error getting network info:', error);
      }
    }

    res.json({
      blockchain: {
        enabled: !!contract,
        contractAddress: process.env.CONTRACT_ADDRESS,
        network: networkInfo,
        stats,
      },
      ipfs: ipfsStats,
    });
  } catch (error: any) {
    console.error('Get blockchain stats error:', error);
    res.status(500).json({ error: 'Failed to get blockchain stats' });
  }
});

/**
 * Get audit trail for a specific record
 */
router.get('/audit/:recordId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { recordId } = req.params;
    const auditTrail = await getBlockchainAuditTrail(parseInt(recordId));

    res.json({
      recordId: parseInt(recordId),
      auditTrail,
      totalAccesses: auditTrail.length,
    });
  } catch (error: any) {
    console.error('Get audit trail error:', error);
    res.status(500).json({ error: 'Failed to get audit trail' });
  }
});

/**
 * Verify blockchain integration
 */
router.get('/verify', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const checks = {
      contractDeployed: !!contract,
      contractAddress: process.env.CONTRACT_ADDRESS || null,
      providerConnected: !!provider,
      ipfsAvailable: false,
      aiAvailable: !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here',
    };

    // Check IPFS
    const ipfsStats = await getIPFSStats();
    checks.ipfsAvailable = ipfsStats.available || false;

    // Check blockchain connection
    let blockchainConnected = false;
    let latestBlock = null;
    if (provider) {
      try {
        latestBlock = await provider.getBlockNumber();
        blockchainConnected = true;
      } catch (error) {
        console.error('Blockchain connection check failed:', error);
      }
    }

    const allSystemsGo = 
      checks.contractDeployed &&
      checks.providerConnected &&
      blockchainConnected &&
      checks.ipfsAvailable &&
      checks.aiAvailable;

    res.json({
      status: allSystemsGo ? 'operational' : 'partial',
      checks: {
        ...checks,
        blockchainConnected,
      },
      details: {
        contractAddress: checks.contractAddress,
        latestBlock,
        ipfsVersion: ipfsStats.available ? 'Connected' : 'Not available',
        aiProvider: checks.aiAvailable ? 'Google Gemini' : 'Not configured',
      },
      message: allSystemsGo
        ? '✅ All systems operational: Blockchain, IPFS, and AI are working!'
        : '⚠️ Some systems need configuration',
    });
  } catch (error: any) {
    console.error('Verify blockchain error:', error);
    res.status(500).json({ error: 'Failed to verify blockchain integration' });
  }
});

export default router;
