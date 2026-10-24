import { Router } from 'express';
import multer from 'multer';
import { verificationController } from '../controllers/verificationController';

const router = Router();

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPG, PNG, WebP or PDF files are allowed'));
  },
});

router.get('/companies/:companyId', verificationController.getStatus);
router.post('/companies/:companyId/documents/:type', upload.single('file'), verificationController.uploadDocument);

export { router as verificationRoutes };
