import { Router } from 'express';
import db from '../db.js';

const router = Router();

// GET /api/preferences — get all preferences for current user
router.get('/', (req, res) => {
    try {
        const rows = db.prepare('SELECT pref_key, pref_value FROM user_preferences WHERE user_id = ?').all(req.user.id);
        const prefs = {};
        for (const row of rows) {
            prefs[row.pref_key] = row.pref_value;
        }
        res.json({ preferences: prefs });
    } catch (err) {
        console.error('Get preferences error:', err);
        res.status(500).json({ error: 'Failed to load preferences' });
    }
});

// PUT /api/preferences — upsert preferences
router.put('/', (req, res) => {
    try {
        const { preferences } = req.body;
        if (!preferences || typeof preferences !== 'object') {
            return res.status(400).json({ error: 'Invalid preferences data' });
        }
        const upsert = db.prepare(`
            INSERT INTO user_preferences (user_id, pref_key, pref_value, updated_at)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(user_id, pref_key) DO UPDATE SET pref_value = excluded.pref_value, updated_at = CURRENT_TIMESTAMP
        `);
        const transaction = db.transaction(() => {
            for (const [key, value] of Object.entries(preferences)) {
                upsert.run(req.user.id, key, String(value));
            }
        });
        transaction();
        res.json({ message: 'Preferences saved' });
    } catch (err) {
        console.error('Save preferences error:', err);
        res.status(500).json({ error: 'Failed to save preferences' });
    }
});

export default router;
