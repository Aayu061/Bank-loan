const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'please-set-a-secret';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '7d';
const COOKIE_NAME = process.env.COOKIE_NAME || 'nexa_token';

function createToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

// Register
router.post('/register', async (req, res, next) => {
  try {
    const { first_name, last_name, email, password, phone } = req.body;
    if (!first_name || !email || !password) return res.status(400).json({ ok: false, error: 'Missing fields' });

    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length) return res.status(409).json({ ok: false, error: 'Email already registered' });

    const password_hash = await bcrypt.hash(password, 10);
    const result = await db.query(
      `INSERT INTO users (first_name, last_name, email, password_hash, phone)
       VALUES ($1,$2,$3,$4,$5) RETURNING id, email, first_name, last_name, role`,
      [first_name, last_name || null, email.toLowerCase(), password_hash, phone || null]
    );

    const user = result.rows[0];
    const token = createToken({ userId: user.id, role: user.role });

    const secure = process.env.NODE_ENV === 'production';
    // Default SameSite to 'none' in production (works with secure=true), otherwise 'lax' for local dev.
    // Allow overriding via COOKIE_SAMESITE env if needed.
    const defaultSameSite = secure ? 'none' : 'lax';
    const sameSiteEnv = (process.env.COOKIE_SAMESITE || defaultSameSite).toString().toLowerCase();
    const sameSite = ['lax', 'strict', 'none'].includes(sameSiteEnv) ? sameSiteEnv : defaultSameSite;
    if (sameSite === 'none' && !secure) console.warn('COOKIE_SAMESITE=None set while NODE_ENV!=production: browsers may reject the cookie without Secure/HTTPS');
    res.cookie(COOKIE_NAME, token, { httpOnly: true, sameSite: sameSite, secure, maxAge: 7 * 24 * 3600 * 1000 });

    res.json({ ok: true, user: { id: user.id, email: user.email, first_name: user.first_name, role: user.role } });
  } catch (err) { next(err); }
});

// Login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password, name, phone } = req.body;
    if (!email || !password) return res.status(400).json({ ok: false, error: 'Missing fields' });

    const result = await db.query('SELECT id, password_hash, first_name, last_name, email, role, phone FROM users WHERE email = $1', [email.toLowerCase()]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ ok: false, error: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ ok: false, error: 'Invalid credentials' });

    const token = createToken({ userId: user.id, role: user.role });
    const secure = process.env.NODE_ENV === 'production';
    const defaultSameSite2 = secure ? 'none' : 'lax';
    const sameSiteEnv2 = (process.env.COOKIE_SAMESITE || defaultSameSite2).toString().toLowerCase();
    const sameSite2 = ['lax', 'strict', 'none'].includes(sameSiteEnv2) ? sameSiteEnv2 : defaultSameSite2;
    if (sameSite2 === 'none' && !secure) console.warn('COOKIE_SAMESITE=None set while NODE_ENV!=production: browsers may reject the cookie without Secure/HTTPS');
    res.cookie(COOKIE_NAME, token, { httpOnly: true, sameSite: sameSite2, secure, maxAge: 7 * 24 * 3600 * 1000 });
    
    // update last_login_at
    try { await db.query('UPDATE users SET last_login_at = now() WHERE id = $1', [user.id]); } catch (e) { console.warn('failed to update last_login_at', e); }

    // If client supplied name or phone, echo back the known user values (phone from DB)
    res.json({ ok: true, user: { id: user.id, email: user.email, first_name: user.first_name, role: user.role, phone: user.phone || null } });
  } catch (err) { next(err); }
});

// Logout
router.post('/logout', (req, res) => {
  const secure = process.env.NODE_ENV === 'production';
  const sameSite = secure ? 'none' : 'lax';
  res.clearCookie(COOKIE_NAME, { httpOnly: true, sameSite, secure });
  res.json({ ok: true });
});

module.exports = router;

