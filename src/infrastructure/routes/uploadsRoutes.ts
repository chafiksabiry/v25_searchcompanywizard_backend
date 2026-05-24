import { Router } from 'express';
import multer from 'multer';
import { uploadsController } from '../controllers/uploadsController';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

router.post('/image', upload.single('file'), uploadsController.uploadImage);

export { router as uploadsRoutes };
