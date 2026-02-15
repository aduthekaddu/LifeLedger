import { Router } from 'express';
import { register, login, getProfile, updateProfile, changePassword, generateQRCode, verifyEmail, resendVerification } from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', authenticate, resendVerification);
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);
router.post('/change-password', authenticate, changePassword);
router.post('/generate-qr', authenticate, generateQRCode);

export default router;
