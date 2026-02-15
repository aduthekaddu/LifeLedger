import { Router } from 'express';
import { createRecord, getRecords, getRecordById, deleteRecord, downloadFile } from '../controllers/recordController';
import { authenticate, authorize } from '../middleware/auth';
import multer from 'multer';
import path from 'path';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_DIR || './uploads');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760') }
});

router.post('/', authenticate, authorize('patient', 'doctor'), upload.single('file'), createRecord);
router.get('/', authenticate, getRecords);
router.get('/:id', authenticate, getRecordById);
router.get('/:id/download', authenticate, downloadFile);
router.delete('/:id', authenticate, authorize('patient', 'admin'), deleteRecord);

export default router;
