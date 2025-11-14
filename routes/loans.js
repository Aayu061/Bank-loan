const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Get my loans
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const r = await db.query('SELECT * FROM loans WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
    res.json({ ok: true, loans: r.rows });
  } catch (err) { next(err); }
});

// Admin: list all loans
router.get('/admin/all', requireAuth, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ ok: false, error: 'Forbidden' });
    const r = await db.query('SELECT l.*, u.email as user_email FROM loans l JOIN users u ON l.user_id = u.id ORDER BY l.created_at DESC');
    res.json({ ok: true, loans: r.rows });
  } catch (err) { next(err); }
});

module.exports = router;
