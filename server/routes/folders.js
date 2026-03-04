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

// Create folder (with duplicate name check)
router.post('/', requireRole('admin', 'user'), (req, res) => {
    try {
        const { name, collection_id, parent_folder_id } = req.body;
        if (!name || !collection_id) {
            return res.status(400).json({ error: 'Name and collection_id are required' });
        }

        // Check for duplicate folder name in same parent
        const existing = db.prepare(
            'SELECT id FROM folders WHERE LOWER(name) = LOWER(?) AND collection_id = ? AND (parent_folder_id IS ? OR parent_folder_id = ?)'
        ).get(name, collection_id, parent_folder_id || null, parent_folder_id || null);
        if (existing) {
            return res.status(409).json({ error: `A folder named "${name}" already exists. Please choose a different name.` });
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

// Rename folder (with duplicate name check)
router.put('/:id', requireRole('admin', 'user'), (req, res) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ error: 'Name is required' });

        const folder = db.prepare('SELECT * FROM folders WHERE id = ?').get(req.params.id);
        if (!folder) return res.status(404).json({ error: 'Folder not found' });

        // Check for duplicate name in same parent (excluding current folder)
        const existing = db.prepare(
            'SELECT id FROM folders WHERE LOWER(name) = LOWER(?) AND collection_id = ? AND (parent_folder_id IS ? OR parent_folder_id = ?) AND id != ?'
        ).get(name, folder.collection_id, folder.parent_folder_id, folder.parent_folder_id, folder.id);
        if (existing) {
            return res.status(409).json({ error: `A folder named "${name}" already exists. Please choose a different name.` });
        }

        db.prepare('UPDATE folders SET name = ? WHERE id = ?').run(name, req.params.id);
        const updated = db.prepare('SELECT * FROM folders WHERE id = ?').get(req.params.id);
        res.json({ folder: updated });
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
