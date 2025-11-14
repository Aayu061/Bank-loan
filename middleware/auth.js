const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'please-set-a-secret';
const COOKIE_NAME = process.env.COOKIE_NAME || 'nexa_token';

async function requireAuth(req, res, next) {
  try {
    const token = req.cookies && req.cookies[COOKIE_NAME];
    if (!token) return res.status(401).json({ ok: false, error: 'Not authenticated' });

    const payload = jwt.verify(token, JWT_SECRET);
    // attach minimal user info
    const r = await db.query('SELECT id, email, first_name, last_name, role FROM users WHERE id = $1', [payload.userId]);
    const user = r.rows[0];
    if (!user) return res.status(401).json({ ok: false, error: 'User not found' });

    req.user = user;
    next();
  } catch (err) {
    console.warn('auth error', err.message || err);
    return res.status(401).json({ ok: false, error: 'Invalid token' });
  }
}

module.exports = { requireAuth };
