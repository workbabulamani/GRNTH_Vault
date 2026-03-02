import { Router } from 'express';
import db from '../db.js';
import { requireRole } from '../middleware/rbac.js';

const router = Router();

// Get all collections the user has access to
router.get('/', (req, res) => {
    try {
        let collections;
        if (req.user.role === 'admin') {
            collections = db.prepare(`
        SELECT c.*, u.name as owner_name,
          (SELECT COUNT(*) FROM folders WHERE collection_id = c.id) as folder_count,
          (SELECT COUNT(*) FROM files f JOIN folders fo ON f.folder_id = fo.id WHERE fo.collection_id = c.id) as file_count
        FROM collections c
        JOIN users u ON c.owner_id = u.id
        ORDER BY c.name
      `).all();
        } else {
            collections = db.prepare(`
        SELECT c.*, u.name as owner_name, cm.role as member_role,
          (SELECT COUNT(*) FROM folders WHERE collection_id = c.id) as folder_count,
          (SELECT COUNT(*) FROM files f JOIN folders fo ON f.folder_id = fo.id WHERE fo.collection_id = c.id) as file_count
        FROM collections c
        JOIN users u ON c.owner_id = u.id
        JOIN collection_members cm ON cm.collection_id = c.id AND cm.user_id = ?
        ORDER BY c.name
      `).all(req.user.id);
        }
        res.json({ collections });
    } catch (err) {
        console.error('Get collections error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create collection
router.post('/', requireRole('admin', 'user'), (req, res) => {
    try {
        const { name, description } = req.body;
        if (!name) return res.status(400).json({ error: 'Name is required' });
        const result = db.prepare('INSERT INTO collections (name, description, owner_id) VALUES (?, ?, ?)').run(
            name, description || '', req.user.id
        );
        db.prepare('INSERT INTO collection_members (collection_id, user_id, role) VALUES (?, ?, ?)').run(
            result.lastInsertRowid, req.user.id, 'admin'
        );
        const collection = db.prepare('SELECT * FROM collections WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json({ collection });
    } catch (err) {
        console.error('Create collection error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update collection
router.put('/:id', requireRole('admin', 'user'), (req, res) => {
    try {
        const { name, description } = req.body;
        const collection = db.prepare('SELECT * FROM collections WHERE id = ?').get(req.params.id);
        if (!collection) return res.status(404).json({ error: 'Collection not found' });
        if (collection.owner_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized' });
        }
        db.prepare('UPDATE collections SET name = ?, description = ? WHERE id = ?').run(
            name || collection.name, description !== undefined ? description : collection.description, req.params.id
        );
        const updated = db.prepare('SELECT * FROM collections WHERE id = ?').get(req.params.id);
        res.json({ collection: updated });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete collection
router.delete('/:id', requireRole('admin', 'user'), (req, res) => {
    try {
        const collection = db.prepare('SELECT * FROM collections WHERE id = ?').get(req.params.id);
        if (!collection) return res.status(404).json({ error: 'Collection not found' });
        if (collection.owner_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized' });
        }
        db.prepare('DELETE FROM collections WHERE id = ?').run(req.params.id);
        res.json({ message: 'Collection deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get collection members
router.get('/:id/members', (req, res) => {
    try {
        const members = db.prepare(`
      SELECT u.id, u.email, u.name, u.role as global_role, cm.role as collection_role
      FROM collection_members cm
      JOIN users u ON cm.user_id = u.id
      WHERE cm.collection_id = ?
    `).all(req.params.id);
        res.json({ members });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Add member to collection
router.post('/:id/members', requireRole('admin', 'user'), (req, res) => {
    try {
        const { email, role } = req.body;
        const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
        if (!user) return res.status(404).json({ error: 'User not found' });
        try {
            db.prepare('INSERT INTO collection_members (collection_id, user_id, role) VALUES (?, ?, ?)').run(
                req.params.id, user.id, role || 'user'
            );
        } catch (e) {
            return res.status(409).json({ error: 'User already a member' });
        }
        res.status(201).json({ message: 'Member added' });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
