const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Customer dashboard
router.get('/customer/dashboard', requireAuth, async (req, res, next) => {
  try{
    const userId = req.user.id;
    const loansR = await db.query('SELECT * FROM loans WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
    const loans = loansR.rows;
    const outstanding_total = loans.reduce((s,l)=> s + (parseFloat(l.outstanding_amount||0)), 0);
    const active_loans = loans.filter(l => l.status === 'active');
    const next_emi_amount = active_loans.length ? (parseFloat(active_loans[0].monthly_emi || 0)) : 0;

    const paymentsR = await db.query('SELECT * FROM payments WHERE user_id = $1 ORDER BY payment_date DESC LIMIT 20', [userId]);
    const documentsR = await db.query('SELECT * FROM documents WHERE user_id = $1 ORDER BY uploaded_at DESC LIMIT 20', [userId]);

    res.json({ ok: true, data: { outstanding_total, next_emi_amount, active_loans_count: active_loans.length, loans, payments: paymentsR.rows, documents: documentsR.rows } });
  }catch(err){ next(err); }
});

// Admin dashboard
router.get('/admin/dashboard', requireAuth, async (req, res, next) => {
  try{
    if(req.user.role !== 'admin') return res.status(403).json({ ok:false, error:'Forbidden' });
    const activeR = await db.query("SELECT COUNT(*)::int as cnt FROM loans WHERE status = 'active'");
    const totalR = await db.query("SELECT COALESCE(SUM(original_amount),0) as total FROM loans WHERE status = 'active'");
    const pendingR = await db.query("SELECT COUNT(*)::int as cnt FROM loan_applications WHERE status = 'submitted'");
    const overdueR = await db.query("SELECT COUNT(*)::int as cnt FROM loans WHERE status = 'active' AND outstanding_amount > 0");
    const recentApps = await db.query('SELECT la.*, u.email as user_email FROM loan_applications la JOIN users u ON la.user_id = u.id ORDER BY la.created_at DESC LIMIT 20');

    res.json({ ok: true, data: {
      active_loans: activeR.rows[0].cnt,
      total_disbursed: parseFloat(totalR.rows[0].total||0),
      pending_apps: pendingR.rows[0].cnt,
      overdue: overdueR.rows[0].cnt,
      recent_applications: recentApps.rows
    }});
  }catch(err){ next(err); }
});

// Admin CSV export for applications (supports basic filters)
router.get('/admin/applications.csv', requireAuth, async (req, res, next) => {
  try{
    if(req.user.role !== 'admin') return res.status(403).send('Forbidden');
    const q = (req.query.q || '').trim();
    const status = (req.query.status || '').trim();
    const where = [];
    const params = [];
    if(status){ params.push(status); where.push(`la.status = $${params.length}`); }
    if(q){ params.push('%' + q.toLowerCase() + '%'); where.push(`(LOWER(u.email) LIKE $${params.length} OR LOWER(la.id::text) LIKE $${params.length})`); }
    const whereSql = where.length ? ('WHERE ' + where.join(' AND ')) : '';
    const sql = `SELECT la.id, la.user_id, u.email as user_email, la.requested_amount, la.requested_tenure, la.status, la.note, la.created_at FROM loan_applications la JOIN users u ON la.user_id = u.id ${whereSql} ORDER BY la.created_at DESC`;
    const r = await db.query(sql, params);
    const rows = r.rows || [];
    // build CSV
    const header = ['id','user_id','user_email','requested_amount','requested_tenure','status','note','created_at'];
    const lines = [header.join(',')];
    rows.forEach(row => {
      const vals = header.map(h => {
        const v = row[h] === null || row[h] === undefined ? '' : String(row[h]).replace(/"/g, '""');
        return '"' + v + '"';
      });
      lines.push(vals.join(','));
    });
    const csv = lines.join('\n');
    res.setHeader('Content-Type','text/csv');
    res.setHeader('Content-Disposition','attachment; filename="applications.csv"');
    res.send(csv);
  }catch(err){ next(err); }
});

module.exports = router;
