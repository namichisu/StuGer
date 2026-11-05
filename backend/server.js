const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from root .env or local environment
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
dotenv.config();

const { testConnection } = require('./config/database');
const studentRoutes = require('./routes/studentRoutes');
const authRoutes = require('./routes/authRoutes');
const { ensureUsersTable } = require('./controllers/authController');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;
const FRONTEND_DIR = path.resolve(__dirname, '..', 'frontend');

// Core Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static assets from frontend/
app.use(express.static(FRONTEND_DIR));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString()
  });
});

// Explicit page routes
app.get('/admin', (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'admin.html'));
});

app.get('/student', (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'student.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

// 404 handler for unmatched API routes
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return notFoundHandler(req, res, next);
  }
  next();
});

// Centralized error handler
app.use(errorHandler);

// Start server
async function startServer() {
  console.log(' Starting StuGer — Student Management System...');
  
  // Verify MySQL connectivity
  const isConnected = await testConnection();
  if (isConnected) {
    await ensureUsersTable();
  } else {
    console.warn('⚠️ Warning: Database connection failed. Please ensure MySQL is running with correct credentials in .env');
  }

  app.listen(PORT, () => {
    console.log(` Server is running smoothly!`);
    console.log(` Web Interface: http://localhost:${PORT}`);
    console.log(` Admin Portal:  http://localhost:${PORT}/admin`);
    console.log(` Student Portal: http://localhost:${PORT}/student`);
    console.log(` API Base:      http://localhost:${PORT}/api/students`);
  });
}

startServer();
