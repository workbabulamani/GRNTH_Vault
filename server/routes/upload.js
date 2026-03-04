import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import { requireRole } from '../middleware/rbac.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Use UPLOAD_DIR env var, or default to <project_root>/uploads/images
const uploadDir = process.env.UPLOAD_DIR || path.resolve(__dirname, '..', '..', 'uploads', 'images');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname) || '.png';
        cb(null, `${uuidv4()}${ext}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        const allowed = /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i;
        if (allowed.test(path.extname(file.originalname))) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

const router = Router();

router.post('/', requireRole('admin', 'user'), upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }
        const url = `/uploads/images/${req.file.filename}`;
        res.json({ url, filename: req.file.filename });
    } catch (err) {
        res.status(500).json({ error: 'Upload failed' });
    }
});

export default router;
