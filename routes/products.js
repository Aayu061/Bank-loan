const express = require('express');
const db = require('../db');

const router = express.Router();

// GET /api/products - list products
router.get('/', async (req, res, next) => {
  try {
    const r = await db.query('SELECT id, name, description, min_amount, max_amount, base_interest, min_tenure_months, max_tenure_months FROM loan_products ORDER BY created_at');
    res.json({ ok: true, products: r.rows });
  } catch (err) { next(err); }
});

// GET /api/products/:id - product details
router.get('/:id', async (req, res, next) => {
  try {
    const r = await db.query('SELECT id, name, description, min_amount, max_amount, base_interest, min_tenure_months, max_tenure_months FROM loan_products WHERE id = $1', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ ok: false, error: 'Product not found' });
    res.json({ ok: true, product: r.rows[0] });
  } catch (err) { next(err); }
});

module.exports = router;
