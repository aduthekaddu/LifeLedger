import { Router } from 'express';
import { 
  requestAccess, 
  respondToRequest, 
  getAccessRequests, 
  revokeAccess, 
  getAccessLogs,
  emergencyAccess 
} from '../controllers/accessController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.post('/request', authenticate, authorize('doctor'), requestAccess);
router.post('/respond', authenticate, authorize('patient'), respondToRequest);
router.get('/requests', authenticate, authorize('patient', 'doctor'), getAccessRequests);
router.post('/revoke', authenticate, authorize('patient'), revokeAccess);
router.get('/logs', authenticate, getAccessLogs);
router.post('/emergency', authenticate, authorize('doctor'), emergencyAccess);

export default router;
