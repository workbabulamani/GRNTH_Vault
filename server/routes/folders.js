import { Router } from 'express';
import db from '../db.js';
import { requireRole } from '../middleware/rbac.js';

const router = Router();

// Get folders for a collection (tree structure)
router.get('/collection/:collectionId', (req, res) => {
    try {
        const folders = db.prepare(`
      SELECT f.*, 
        (SELECT COUNT(*) FROM files WHERE folder_id = f.id) as file_count
      FROM folders f 
      WHERE f.collection_id = ? 
      ORDER BY f.name
    `).all(req.params.collectionId);

        const files = db.prepare(`
      SELECT fi.* FROM files fi
      JOIN folders fo ON fi.folder_id = fo.id
      WHERE fo.collection_id = ?
      ORDER BY fi.name
    `).all(req.params.collectionId);

        // Build tree
        const buildTree = (parentId = null) => {
            return folders
                .filter(f => f.parent_folder_id === parentId)
                .map(folder => ({
                    ...folder,
                    type: 'folder',
                    children: [
                        ...buildTree(folder.id),
                        ...files
                            .filter(f => f.folder_id === folder.id)
                            .map(f => ({ ...f, type: 'file' }))
                    ]
                }));
        };

        res.json({ tree: buildTree() });
    } catch (err) {
        console.error('Get folders error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create folder
router.post('/', requireRole('admin', 'user'), (req, res) => {
    try {
        const { name, collection_id, parent_folder_id } = req.body;
        if (!name || !collection_id) {
            return res.status(400).json({ error: 'Name and collection_id are required' });
        }
        const result = db.prepare(
            'INSERT INTO folders (name, collection_id, parent_folder_id) VALUES (?, ?, ?)'
        ).run(name, collection_id, parent_folder_id || null);
        const folder = db.prepare('SELECT * FROM folders WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json({ folder });
    } catch (err) {
        console.error('Create folder error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Rename folder
router.put('/:id', requireRole('admin', 'user'), (req, res) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ error: 'Name is required' });
        db.prepare('UPDATE folders SET name = ? WHERE id = ?').run(name, req.params.id);
        const folder = db.prepare('SELECT * FROM folders WHERE id = ?').get(req.params.id);
        if (!folder) return res.status(404).json({ error: 'Folder not found' });
        res.json({ folder });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete folder (cascades to files)
router.delete('/:id', requireRole('admin', 'user'), (req, res) => {
    try {
        const folder = db.prepare('SELECT * FROM folders WHERE id = ?').get(req.params.id);
        if (!folder) return res.status(404).json({ error: 'Folder not found' });
        db.prepare('DELETE FROM folders WHERE id = ?').run(req.params.id);
        res.json({ message: 'Folder deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
