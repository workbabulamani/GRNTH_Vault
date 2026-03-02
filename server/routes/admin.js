import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db.js';
import { requireRole } from '../middleware/rbac.js';

const router = Router();

// All admin routes require admin role
router.use(requireRole('admin'));

// Get all users
router.get('/users', (req, res) => {
    try {
        const users = db.prepare('SELECT id, email, name, role, created_at FROM users ORDER BY created_at DESC').all();
        res.json({ users });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update user role
router.patch('/users/:id', (req, res) => {
    try {
        const { role, name } = req.body;
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        if (role) {
            if (!['admin', 'user', 'viewer'].includes(role)) {
                return res.status(400).json({ error: 'Invalid role' });
            }
            db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, req.params.id);
        }
        if (name) {
            db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name, req.params.id);
        }
        const updated = db.prepare('SELECT id, email, name, role, created_at FROM users WHERE id = ?').get(req.params.id);
        res.json({ user: updated });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete user
router.delete('/users/:id', (req, res) => {
    try {
        if (parseInt(req.params.id) === req.user.id) {
            return res.status(400).json({ error: 'Cannot delete yourself' });
        }
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
        res.json({ message: 'User deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create user (admin only)
router.post('/users', (req, res) => {
    try {
        const { email, name, password, role } = req.body;
        if (!email || !name || !password) {
            return res.status(400).json({ error: 'Email, name and password are required' });
        }
        const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
        if (existing) return res.status(409).json({ error: 'Email already registered' });
        const hash = bcrypt.hashSync(password, 10);
        const result = db.prepare('INSERT INTO users (email, name, password_hash, role) VALUES (?, ?, ?, ?)').run(
            email, name, hash, role || 'user'
        );
        const user = db.prepare('SELECT id, email, name, role, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json({ user });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
