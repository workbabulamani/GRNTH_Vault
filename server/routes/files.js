import { Router } from 'express';
import db from '../db.js';
import { requireRole } from '../middleware/rbac.js';

const router = Router();

// Search files in a collection (MUST be before /:id so "search" isn't treated as an id)
router.get('/search/:collectionId', (req, res) => {
    try {
        const { q } = req.query;
        if (!q) return res.json({ files: [] });
        const files = db.prepare(`
      SELECT fi.*, fo.name as folder_name
      FROM files fi
      JOIN folders fo ON fi.folder_id = fo.id
      WHERE fo.collection_id = ? AND (fi.name LIKE ? OR fi.content LIKE ?)
      ORDER BY fi.name
      LIMIT 50
    `).all(req.params.collectionId, `%${q}%`, `%${q}%`);
        res.json({ files });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get file content
router.get('/:id', (req, res) => {
    try {
        const file = db.prepare('SELECT * FROM files WHERE id = ?').get(req.params.id);
        if (!file) return res.status(404).json({ error: 'File not found' });
        res.json({ file });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create file
router.post('/', requireRole('admin', 'user'), (req, res) => {
    try {
        const { name, folder_id, content } = req.body;
        if (!name || !folder_id) {
            return res.status(400).json({ error: 'Name and folder_id are required' });
        }
        const fileName = name.endsWith('.md') ? name : `${name}.md`;
        const result = db.prepare('INSERT INTO files (name, folder_id, content) VALUES (?, ?, ?)').run(
            fileName, folder_id, content || ''
        );
        const file = db.prepare('SELECT * FROM files WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json({ file });
    } catch (err) {
        console.error('Create file error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update file content
router.put('/:id', requireRole('admin', 'user'), (req, res) => {
    try {
        const { content, name } = req.body;
        const file = db.prepare('SELECT * FROM files WHERE id = ?').get(req.params.id);
        if (!file) return res.status(404).json({ error: 'File not found' });

        if (name !== undefined) {
            const fileName = name.endsWith('.md') ? name : `${name}.md`;
            db.prepare('UPDATE files SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(fileName, req.params.id);
        }
        if (content !== undefined) {
            db.prepare('UPDATE files SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(content, req.params.id);
        }

        const updated = db.prepare('SELECT * FROM files WHERE id = ?').get(req.params.id);
        res.json({ file: updated });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete file
router.delete('/:id', requireRole('admin', 'user'), (req, res) => {
    try {
        const file = db.prepare('SELECT * FROM files WHERE id = ?').get(req.params.id);
        if (!file) return res.status(404).json({ error: 'File not found' });
        db.prepare('DELETE FROM files WHERE id = ?').run(req.params.id);
        res.json({ message: 'File deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Search files in a collection
router.get('/search/:collectionId', (req, res) => {
    try {
        const { q } = req.query;
        if (!q) return res.json({ files: [] });
        const files = db.prepare(`
      SELECT fi.*, fo.name as folder_name
      FROM files fi
      JOIN folders fo ON fi.folder_id = fo.id
      WHERE fo.collection_id = ? AND (fi.name LIKE ? OR fi.content LIKE ?)
      ORDER BY fi.name
      LIMIT 50
    `).all(req.params.collectionId, `%${q}%`, `%${q}%`);
        res.json({ files });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
