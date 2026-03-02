import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDB } from './db.js';
import { authenticate } from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import collectionsRoutes from './routes/collections.js';
import foldersRoutes from './routes/folders.js';
import filesRoutes from './routes/files.js';
import bookmarksRoutes from './routes/bookmarks.js';
import uploadRoutes from './routes/upload.js';
import adminRoutes from './routes/admin.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

// Initialize database
initDB();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Static files - uploads
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Auth routes need special handling: login and signup are public, others are protected
// We use a middleware that conditionally applies auth
const optionalAuth = (req, res, next) => {
    // Login and signup are public
    if (req.method === 'POST' && (req.path === '/login' || req.path === '/signup')) {
        return next();
    }
    // Everything else needs auth
    return authenticate(req, res, next);
};

app.use('/api/auth', optionalAuth, authRoutes);

// All other routes are protected
app.use('/api/collections', authenticate, collectionsRoutes);
app.use('/api/folders', authenticate, foldersRoutes);
app.use('/api/files', authenticate, filesRoutes);
app.use('/api/bookmarks', authenticate, bookmarksRoutes);
app.use('/api/upload', authenticate, uploadRoutes);
app.use('/api/admin', authenticate, adminRoutes);

// Serve client build in production
const clientDist = path.join(__dirname, 'public');
app.use(express.static(clientDist));
app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(clientDist, 'index.html'));
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 SutraBase server running on http://localhost:${PORT}`);
});
