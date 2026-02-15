import { Router } from 'express';
import { searchPatients, getMyPatients, getConsentStats } from '../controllers/patientController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/search', authenticate, authorize('doctor', 'admin'), searchPatients);
router.get('/my-patients', authenticate, authorize('doctor'), getMyPatients);
router.get('/consent-stats', authenticate, authorize('patient'), getConsentStats);

export default router;
