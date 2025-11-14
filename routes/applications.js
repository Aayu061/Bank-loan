const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Submit application (authenticated)
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { product_id, requested_amount, requested_tenure, note } = req.body;
    if (!product_id || !requested_amount || !requested_tenure) return res.status(400).json({ ok: false, error: 'Missing fields' });

    const r = await db.query(
      `INSERT INTO loan_applications (user_id, product_id, requested_amount, requested_tenure, note)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [req.user.id, product_id, requested_amount, requested_tenure, note || null]
    );
    res.json({ ok: true, application: r.rows[0] });
  } catch (err) { next(err); }
});

// List my applications
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const r = await db.query('SELECT * FROM loan_applications WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
    res.json({ ok: true, applications: r.rows });
  } catch (err) { next(err); }
});

// Admin: list all applications
router.get('/admin/all', requireAuth, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ ok: false, error: 'Forbidden' });
    const r = await db.query('SELECT la.*, u.email as user_email FROM loan_applications la JOIN users u ON la.user_id = u.id ORDER BY la.created_at DESC');
    res.json({ ok: true, applications: r.rows });
  } catch (err) { next(err); }
});

// Admin: paginated listing with filters
router.get('/admin', requireAuth, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ ok: false, error: 'Forbidden' });
    const page = parseInt(req.query.page,10) || 1;
    const pageSize = Math.min(100, parseInt(req.query.pageSize,10) || 20);
    const status = req.query.status || '';
    const q = (req.query.q || '').trim().toLowerCase();

    const where = [];
    const params = [];
    if(status){ params.push(status); where.push(`la.status = $${params.length}`); }
    if(q){ params.push('%' + q + '%'); where.push(`(LOWER(u.email) LIKE $${params.length} OR LOWER(la.id::text) LIKE $${params.length})`); }
    const whereSql = where.length ? ('WHERE ' + where.join(' AND ')) : '';

    const countSql = `SELECT COUNT(*)::int as total FROM loan_applications la JOIN users u ON la.user_id = u.id ${whereSql}`;
    const countR = await db.query(countSql, params);
    const total = countR.rows[0] ? countR.rows[0].total : 0;

    const offset = (page - 1) * pageSize;
    params.push(pageSize, offset);
    const sql = `SELECT la.*, u.email as user_email FROM loan_applications la JOIN users u ON la.user_id = u.id ${whereSql} ORDER BY la.created_at DESC LIMIT $${params.length-1} OFFSET $${params.length}`;
    const r = await db.query(sql, params);
    res.json({ ok: true, applications: r.rows, total, page, pageSize, pages: Math.ceil(total / pageSize) });
  } catch (err) { next(err); }
});

// Admin: update application status (approve/reject)
router.patch('/:id', requireAuth, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ ok: false, error: 'Forbidden' });
    const { status, note } = req.body;
    if (!status || !['approved','rejected','submitted'].includes(status)) return res.status(400).json({ ok: false, error: 'Invalid status' });

    // Update application
    const r = await db.query('UPDATE loan_applications SET status=$1, note = COALESCE($2, note), updated_at = now() WHERE id = $3 RETURNING *', [status, note || null, req.params.id]);
    if (!r.rows.length) return res.status(404).json({ ok: false, error: 'Application not found' });

    // If approved, create a loan record (simple disbursement) - admins may choose to disburse separately; here we create loan when approved
    let loan = null;
    if (status === 'approved') {
      const app = r.rows[0];
      // simple EMI calc: monthly interest = rate/12, using product base_interest
      const p = await db.query('SELECT base_interest FROM loan_products WHERE id = $1', [app.product_id]);
      const rate = p.rows[0] ? parseFloat(p.rows[0].base_interest) : 10.0;
      const principal = parseFloat(app.requested_amount);
      const n = parseInt(app.requested_tenure, 10);
      const monthlyRate = (rate / 100) / 12;
      const emi = (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -n));
      const created = await db.query(
        `INSERT INTO loans (user_id, product_id, original_amount, outstanding_amount, interest_rate, tenure_months, monthly_emi, status, disbursed_at)
         VALUES ($1,$2,$3,$3,$4,$5,$6,'active', now()) RETURNING *`,
        [app.user_id, app.product_id, principal, rate, n, emi]
      );
      loan = created.rows[0];
    }

    // write audit log
    try {
      await db.query('INSERT INTO audit_logs (admin_id, action, target_type, target_id, metadata) VALUES ($1,$2,$3,$4,$5)', [req.user.id, `application:${status}`, 'loan_application', req.params.id, JSON.stringify({ note })]);
    } catch (e) { console.warn('audit log failed', e); }

    res.json({ ok: true, application: r.rows[0], loan });
  } catch (err) { next(err); }
});

module.exports = router;
