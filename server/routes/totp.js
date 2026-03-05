import { Router } from 'express';
import * as otplib from 'otplib';
import QRCode from 'qrcode';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db.js';
import { generateToken } from '../middleware/auth.js';

// Create TOTP instance for authentication
const totp = new otplib.TOTP();


const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
const router = Router();

// POST /api/totp/setup — Generate TOTP secret + QR code
router.post('/setup', (req, res) => {
    try {
        const user = db.prepare('SELECT id, email, totp_enabled FROM users WHERE id = ?').get(req.user.id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        if (user.totp_enabled) return res.status(400).json({ error: '2FA is already enabled' });

        const secret = totp.generateSecret();
        const otpauth = totp.toURI({ secret, accountName: user.email, issuer: 'SutraBase' });

        // Store secret but don't enable yet (user must verify first)
        db.prepare('UPDATE users SET totp_secret = ? WHERE id = ?').run(secret, req.user.id);

        QRCode.toDataURL(otpauth, (err, qrCodeUrl) => {
            if (err) return res.status(500).json({ error: 'Failed to generate QR code' });
            res.json({ secret, qrCodeUrl });
        });
    } catch (err) {
        console.error('TOTP setup error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/totp/verify-setup — Verify first code and enable 2FA
router.post('/verify-setup', (req, res) => {
    try {
        const { token } = req.body;
        if (!token) return res.status(400).json({ error: 'Verification code is required' });

        const user = db.prepare('SELECT id, totp_secret, totp_enabled FROM users WHERE id = ?').get(req.user.id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        if (user.totp_enabled) return res.status(400).json({ error: '2FA is already enabled' });
        if (!user.totp_secret) return res.status(400).json({ error: 'Please run setup first' });

        const isValid = totp.verify({ token, secret: user.totp_secret });
        if (!isValid) return res.status(400).json({ error: 'Invalid verification code. Please try again.' });

        db.prepare('UPDATE users SET totp_enabled = 1 WHERE id = ?').run(req.user.id);
        res.json({ message: '2FA enabled successfully' });
    } catch (err) {
        console.error('TOTP verify-setup error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/totp/disable — Disable 2FA (requires password)
router.post('/disable', (req, res) => {
    try {
        const { password } = req.body;
        if (!password) return res.status(400).json({ error: 'Password is required' });

        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        if (!bcrypt.compareSync(password, user.password_hash)) {
            return res.status(401).json({ error: 'Incorrect password' });
        }

        db.prepare('UPDATE users SET totp_enabled = 0, totp_secret = NULL WHERE id = ?').run(req.user.id);
        res.json({ message: '2FA disabled successfully' });
    } catch (err) {
        console.error('TOTP disable error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/totp/verify-login — Verify TOTP code during login (uses temp token)
router.post('/verify-login', (req, res) => {
    try {
        const { tempToken, token } = req.body;
        if (!tempToken || !token) return res.status(400).json({ error: 'Temp token and verification code required' });

        // Verify temp token
        let decoded;
        try {
            decoded = jwt.verify(tempToken, JWT_SECRET);
        } catch (e) {
            return res.status(401).json({ error: 'Expired or invalid session. Please login again.' });
        }
        if (!decoded.pending2FA) return res.status(400).json({ error: 'Invalid token type' });

        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        if (!user.totp_enabled || !user.totp_secret) {
            return res.status(400).json({ error: '2FA is not enabled for this account' });
        }

        const isValid = totp.verify({ token, secret: user.totp_secret });
        if (!isValid) return res.status(401).json({ error: 'Invalid verification code' });

        // Issue real JWT
        const realToken = generateToken({ id: user.id, email: user.email, role: user.role, name: user.name });
        res.json({
            token: realToken,
            user: { id: user.id, email: user.email, name: user.name, role: user.role }
        });
    } catch (err) {
        console.error('TOTP verify-login error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
