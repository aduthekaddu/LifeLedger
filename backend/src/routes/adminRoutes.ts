import { Router } from 'express';
import { 
  getDoctors, 
  addDoctor, 
  updateDoctor, 
  deleteDoctor, 
  getDashboardStats,
  getPatients 
} from '../controllers/adminController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/doctors', authenticate, authorize('admin'), getDoctors);
router.post('/doctors', authenticate, authorize('admin'), addDoctor);
router.put('/doctors/:id', authenticate, authorize('admin'), updateDoctor);
router.delete('/doctors/:id', authenticate, authorize('admin'), deleteDoctor);
router.get('/dashboard', authenticate, authorize('admin'), getDashboardStats);
router.get('/patients', authenticate, authorize('admin'), getPatients);

export default router;
