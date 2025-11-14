const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Make a payment (mock) - reduces outstanding_amount
router.post('/pay', requireAuth, async (req, res, next) => {
  try {
    const { loan_id, amount, method } = req.body;
    if (!loan_id || !amount) return res.status(400).json({ ok: false, error: 'Missing fields' });

    // verify loan belongs to user or user is admin
    const loanR = await db.query('SELECT * FROM loans WHERE id = $1', [loan_id]);
    if (!loanR.rows.length) return res.status(404).json({ ok: false, error: 'Loan not found' });
    const loan = loanR.rows[0];
    if (loan.user_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ ok: false, error: 'Forbidden' });

    // create payment record
    const payment = await db.query('INSERT INTO payments (loan_id, user_id, amount, method, provider_ref, status) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *', [loan_id, req.user.id, amount, method || 'mock', null, 'completed']);

    // reduce outstanding amount
    const newOutstanding = Math.max(0, parseFloat(loan.outstanding_amount) - parseFloat(amount));
    await db.query('UPDATE loans SET outstanding_amount = $1, updated_at = now() WHERE id = $2', [newOutstanding, loan_id]);

    res.json({ ok: true, payment: payment.rows[0], outstanding: newOutstanding });
  } catch (err) { next(err); }
});

// Get payments for a loan
router.get('/loan/:loanId', requireAuth, async (req, res, next) => {
  try {
    const loanId = req.params.loanId;
    const payments = await db.query('SELECT * FROM payments WHERE loan_id = $1 ORDER BY payment_date DESC', [loanId]);
    res.json({ ok: true, payments: payments.rows });
  } catch (err) { next(err); }
});

module.exports = router;
