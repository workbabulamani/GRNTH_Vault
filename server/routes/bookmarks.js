import { Router } from 'express';
import db from '../db.js';

const router = Router();

// Get user's bookmarks
router.get('/', (req, res) => {
    try {
        const bookmarks = db.prepare(`
      SELECT b.*, 
        f.name as file_name, f.folder_id,
        fo.name as folder_name
      FROM bookmarks b
      LEFT JOIN files f ON b.file_id = f.id
      LEFT JOIN folders fo ON b.folder_id = fo.id OR f.folder_id = fo.id
      WHERE b.user_id = ?
      ORDER BY b.created_at DESC
    `).all(req.user.id);
        res.json({ bookmarks });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Toggle bookmark
router.post('/toggle', (req, res) => {
    try {
        const { file_id, folder_id } = req.body;
        if (!file_id && !folder_id) {
            return res.status(400).json({ error: 'file_id or folder_id is required' });
        }
        const existing = file_id
            ? db.prepare('SELECT id FROM bookmarks WHERE user_id = ? AND file_id = ?').get(req.user.id, file_id)
            : db.prepare('SELECT id FROM bookmarks WHERE user_id = ? AND folder_id = ?').get(req.user.id, folder_id);

        if (existing) {
            db.prepare('DELETE FROM bookmarks WHERE id = ?').run(existing.id);
            res.json({ bookmarked: false });
        } else {
            db.prepare('INSERT INTO bookmarks (user_id, file_id, folder_id) VALUES (?, ?, ?)').run(
                req.user.id, file_id || null, folder_id || null
            );
            res.json({ bookmarked: true });
        }
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
