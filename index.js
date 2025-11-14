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
const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:8000';

app.use(helmet());
app.use(morgan('tiny'));
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(cors({
  origin: FRONTEND,
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
  });
}

module.exports = app;
