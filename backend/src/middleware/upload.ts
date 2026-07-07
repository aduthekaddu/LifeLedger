import multer from 'multer';
import { env } from '../config/env';

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.maxFileSizeBytes,
    files: 1,
  },
});
