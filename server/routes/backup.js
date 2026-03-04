import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import db from '../db.js';
import { requireRole } from '../middleware/rbac.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backupDir = path.resolve(__dirname, '..', '..', 'data', 'backups');
if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

const router = Router();

// Encryption helpers
function getEncryptionKey() {
    const secret = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || 'default-encryption-key';
    return crypto.createHash('sha256').update(secret).digest();
}

function encrypt(data) {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    // Format: IV (16 bytes) + Auth Tag (16 bytes) + Encrypted data
    return Buffer.concat([iv, tag, encrypted]);
}

// Create a backup of the current database
router.post('/create', requireRole('admin', 'user'), (req, res) => {
    try {
        const userId = req.user.id;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupName = `backup_${userId}_${timestamp}.db`;
        const backupPath = path.join(backupDir, backupName);

        db.backup(backupPath).then(() => {
            res.json({
                message: 'Backup created successfully',
                backup: {
                    name: backupName,
                    created_at: new Date().toISOString(),
                    size: fs.statSync(backupPath).size,
                }
            });
        }).catch(err => {
            console.error('Backup error:', err);
            res.status(500).json({ error: 'Failed to create backup' });
        });
    } catch (err) {
        console.error('Backup error:', err);
        res.status(500).json({ error: 'Failed to create backup' });
    }
});

// List all backups
router.get('/list', requireRole('admin', 'user'), (req, res) => {
    try {
        const files = fs.readdirSync(backupDir)
            .filter(f => f.endsWith('.db'))
            .map(f => {
                const stat = fs.statSync(path.join(backupDir, f));
                return {
                    name: f,
                    created_at: stat.mtime.toISOString(),
                    size: stat.size,
                };
            })
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        res.json({ backups: files });
    } catch (err) {
        console.error('List backups error:', err);
        res.status(500).json({ error: 'Failed to list backups' });
    }
});

// Download all user data — encrypted, extensionless
router.get('/download', requireRole('admin', 'user'), async (req, res) => {
    try {
        const userId = req.user.id;

        const collections = db.prepare(`
            SELECT c.* FROM collections c
            JOIN collection_members cm ON cm.collection_id = c.id
            WHERE cm.user_id = ?
        `).all(userId);

        const exportData = { collections: [], exported_at: new Date().toISOString(), user: req.user.email };

        for (const col of collections) {
            const folders = db.prepare('SELECT * FROM folders WHERE collection_id = ?').all(col.id);
            const folderData = [];
            for (const folder of folders) {
                const files = db.prepare('SELECT * FROM files WHERE folder_id = ?').all(folder.id);
                folderData.push({ ...folder, files });
            }
            exportData.collections.push({ ...col, folders: folderData });
        }

        exportData.bookmarks = db.prepare('SELECT * FROM bookmarks WHERE user_id = ?').all(userId);

        const jsonData = JSON.stringify(exportData, null, 2);
        const encryptedData = encrypt(jsonData);

        const dateStr = new Date().toISOString().slice(0, 10);
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="sutra_backup_${dateStr}"`);
        res.send(encryptedData);
    } catch (err) {
        console.error('Download error:', err);
        res.status(500).json({ error: 'Failed to download data' });
    }
});

// Restore from a backup (auto-backup current state first)
router.post('/restore/:name', requireRole('admin'), async (req, res) => {
    try {
        const backupName = req.params.name;
        const backupPath = path.join(backupDir, backupName);

        if (!fs.existsSync(backupPath)) {
            return res.status(404).json({ error: 'Backup not found' });
        }

        // Create auto-backup of current state before restore
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const autoBackupName = `auto_pre_restore_${timestamp}.db`;
        const autoBackupPath = path.join(backupDir, autoBackupName);

        const dbPath = process.env.DB_PATH || path.resolve(__dirname, '..', '..', 'data', 'md_viewer.db');

        // Create a backup of current DB using better-sqlite3's backup method
        try {
            await db.backup(autoBackupPath);
        } catch (backupErr) {
            // Fallback to file copy
            fs.copyFileSync(dbPath, autoBackupPath);
        }

        // Copy the selected backup over the current DB
        fs.copyFileSync(backupPath, dbPath);

        res.json({
            message: 'Restore completed successfully. The page will reload to apply changes.',
            autoBackup: autoBackupName,
            restoredFrom: backupName,
        });

        // Restart the process after sending response so the new DB is loaded
        setTimeout(() => {
            process.exit(0);
        }, 500);
    } catch (err) {
        console.error('Restore error:', err);
        res.status(500).json({ error: 'Failed to restore backup' });
    }
});

// Delete a backup
router.delete('/:name', requireRole('admin'), (req, res) => {
    try {
        const backupPath = path.join(backupDir, req.params.name);
        if (!fs.existsSync(backupPath)) {
            return res.status(404).json({ error: 'Backup not found' });
        }
        fs.unlinkSync(backupPath);
        res.json({ message: 'Backup deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete backup' });
    }
});

export default router;
