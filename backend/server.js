const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
dotenv.config();

const { testConnection } = require('./config/database');
const studentRoutes = require('./routes/studentRoutes');
const authRoutes = require('./routes/authRoutes');
const { ensureUsersTable } = require('./controllers/authController');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();

// Core Middleware
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Lazy DB init — runs once per serverless instance on first API hit
let dbReady = false;
app.use(async (req, res, next) => {
  if (!dbReady && req.path.startsWith('/api')) {
    try {
      const ok = await testConnection();
      if (ok) {
        await ensureUsersTable();
        dbReady = true;
      }
    } catch (_) {}
  }
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);

// Health check
app.get('/api/health', async (req, res) => {
  const ok = await testConnection().catch(() => false);
  res.json({
    status: ok ? 'online' : 'degraded',
    db: ok ? 'connected' : 'unavailable',
    timestamp: new Date().toISOString()
  });
});

// Static frontend routes
const FRONTEND_DIR = path.resolve(__dirname, '..', 'frontend');
app.use(express.static(FRONTEND_DIR));
app.get('/admin',   (req, res) => res.sendFile(path.join(FRONTEND_DIR, 'admin.html')));
app.get('/student', (req, res) => res.sendFile(path.join(FRONTEND_DIR, 'student.html')));
app.get('/login',   (req, res) => res.sendFile(path.join(FRONTEND_DIR, 'index.html')));
app.get('/',        (req, res) => res.sendFile(path.join(FRONTEND_DIR, 'index.html')));

// 404 for unmatched API routes
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) return notFoundHandler(req, res, next);
  next();
});

// Centralized error handler
app.use(errorHandler);

// ── Local development only (Vercel sets process.env.VERCEL automatically) ──
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;

  async function startServer() {
    console.log(' Starting StuGer — Student Management System...');
    const isConnected = await testConnection();
    if (isConnected) {
      await ensureUsersTable();
      dbReady = true;
    } else {
      console.warn('Warning: Database connection failed. Check your .env credentials.');
    }
    app.listen(PORT, () => {
      console.log(` Server running at http://localhost:${PORT}`);
      console.log(` Admin Portal:   http://localhost:${PORT}/admin`);
      console.log(` Student Portal: http://localhost:${PORT}/student`);
      console.log(` API Base:       http://localhost:${PORT}/api/students`);
    });
  }
  startServer();
}

// Export for Vercel serverless
module.exports = app;
