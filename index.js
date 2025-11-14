require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const productsRoutes = require('./routes/products');
const applicationsRoutes = require('./routes/applications');
const loansRoutes = require('./routes/loans');
const paymentsRoutes = require('./routes/payments');
const dashboardRoutes = require('./routes/dashboard');
const documentsRoutes = require('./routes/documents');
const { requireAuth } = require('./middleware/auth');

const app = express();

const PORT = process.env.PORT || 4000;
// FRONTEND_URL may be a single origin or a comma-separated list of allowed origins
const FRONTEND = process.env.FRONTEND_URL || process.env.FRONTEND || 'http://localhost:8000';
const ALLOW_NULL_ORIGIN = (process.env.ALLOW_NULL_ORIGIN === 'true') || (process.env.NODE_ENV !== 'production');

// Safety checks: ensure critical secrets/urls are present in production
if (process.env.NODE_ENV === 'production') {
  if (!process.env.DATABASE_URL) {
    console.error('FATAL: DATABASE_URL is not set in production. Set it in the environment and redeploy.');
    process.exit(1);
  }
  if (!process.env.JWT_SECRET) {
    console.error('FATAL: JWT_SECRET is not set in production. Set it in the environment and redeploy.');
    process.exit(1);
  }
}

app.use(helmet());
app.use(morgan('tiny'));
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(cors({
  origin: (origin, cb) => {
    // origin === undefined for same-site navigations or some non-browser tools (no Origin header)
    // origin === null for file:// contexts
    if (typeof origin === 'undefined') {
      // allow same-site browser navigations and tools that don't send Origin
      return cb(null, true);
    }
    if (origin === null) {
      if (ALLOW_NULL_ORIGIN) return cb(null, true);
      return cb(new Error('CORS: Null origin (file://) not allowed'));
    }

    const allowed = FRONTEND.split(',').map(s => s.trim()).filter(Boolean);
    if (allowed.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

const limiter = rateLimit({ windowMs: 60 * 1000, max: 200 });
app.use(limiter);

// When deployed behind Render (or other proxies), trust proxy so secure cookies and IPs work correctly
app.set('trust proxy', true);

const path = require('path');
// Serve frontend static files so the whole site can be deployed as a single Render service
const frontendDir = path.join(__dirname, '..', 'Frontend');
app.use(express.static(frontendDir));

// If a route is not found and it's not an API route, serve index.html (SPA-friendly fallback)
app.use((req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/health')) return next();
  const indexPath = path.join(frontendDir, 'index.html');
  res.sendFile(indexPath, err => { if (err) next(); });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/applications', applicationsRoutes);
app.use('/api/loans', loansRoutes);
app.use('/api/pay', paymentsRoutes);
app.use('/api', dashboardRoutes);
app.use('/api/documents', documentsRoutes);

// Example protected route
app.get('/api/me', requireAuth, async (req, res) => {
  // req.user is set by middleware
  res.json({ ok: true, user: req.user });
});

app.get('/health', (req, res) => res.json({ ok: true, now: new Date() }));

// Generic error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ ok: false, error: err.message || 'Server error' });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Nexa backend listening on port ${PORT}`);
    console.log(`NODE_ENV=${process.env.NODE_ENV || 'development'} FRONTEND=${FRONTEND}`);
  });
}

module.exports = app;
