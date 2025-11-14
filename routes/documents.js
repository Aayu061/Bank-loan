const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
if(!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const now = Date.now();
    const safe = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, `${now}_${safe}`);
  }
});

const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

// Upload a document (authenticated)
router.post('/', requireAuth, upload.single('file'), async (req, res, next) => {
  try{
    if(!req.file) return res.status(400).json({ ok:false, error:'No file uploaded' });
    const { originalname, mimetype, filename, path: filepath } = req.file;
    const loan_application_id = req.body.loan_application_id || null;
    const r = await db.query(
      `INSERT INTO documents (user_id, loan_application_id, file_key, file_name, file_type, uploaded_at)
       VALUES ($1,$2,$3,$4,$5, now()) RETURNING *`,
      [req.user.id, loan_application_id, filename, originalname, mimetype]
    );
    res.json({ ok:true, document: r.rows[0] });
  }catch(err){ next(err); }
});

// List my documents
router.get('/', requireAuth, async (req, res, next) => {
  try{
    const r = await db.query('SELECT * FROM documents WHERE user_id = $1 ORDER BY uploaded_at DESC', [req.user.id]);
    res.json({ ok:true, documents: r.rows });
  }catch(err){ next(err); }
});

// Admin: list all documents
router.get('/admin/all', requireAuth, async (req, res, next) => {
  try{
    if(req.user.role !== 'admin') return res.status(403).json({ ok:false, error:'Forbidden' });
    const r = await db.query('SELECT d.*, u.email as user_email FROM documents d JOIN users u ON d.user_id = u.id ORDER BY uploaded_at DESC');
    res.json({ ok:true, documents: r.rows });
  }catch(err){ next(err); }
});

// Download a document (authorized users only)
router.get('/:id/download', requireAuth, async (req, res, next) => {
  try{
    const id = req.params.id;
    const r = await db.query('SELECT * FROM documents WHERE id = $1', [id]);
    if(!r.rows.length) return res.status(404).json({ ok:false, error:'Not found' });
    const doc = r.rows[0];
    // only owner or admin can download
    if(String(doc.user_id) !== String(req.user.id) && req.user.role !== 'admin') return res.status(403).json({ ok:false, error:'Forbidden' });
    const filePath = path.join(UPLOAD_DIR, doc.file_key);
    if(!fs.existsSync(filePath)) return res.status(404).json({ ok:false, error:'File missing' });
    res.setHeader('Content-Disposition', `attachment; filename="${doc.file_name.replace(/\"/g,'')}"`);
    res.setHeader('Content-Type', doc.file_type || 'application/octet-stream');
    res.sendFile(filePath);
  }catch(err){ next(err); }
});

module.exports = router;
