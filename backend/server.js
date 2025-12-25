/**
 * Express Server - Main Entry Point
 * Expense Reminder App Backend
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Import modules
const { initializeDatabase } = require('./config/database');
const { initializeTransporter } = require('./services/emailService');
const { startScheduler } = require('./scheduler/reminderScheduler');

// Import routes
const authRoutes = require('./routes/auth');
const expenseRoutes = require('./routes/expenses');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// ===========================================
// Security Middleware
// ===========================================

// CORS - Allow frontend access (MUST be before Helmet)
app.use(cors({
  origin: true, // Allow all origins in production
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Handle preflight requests explicitly
app.options('*', cors());

// Helmet - Set security headers (after CORS)
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Rate limiting - Prevent brute force attacks
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

// Stricter rate limit for auth routes
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 login/signup attempts per hour
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.'
  }
});

// ===========================================
// Body Parsing Middleware
// ===========================================

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ===========================================
// Routes
// ===========================================

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Expense Reminder API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Test email endpoint (for testing purposes)
app.post('/api/test-email', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required' });
  }
  
  const { sendReminderEmail } = require('./services/emailService');
  const result = await sendReminderEmail(
    email,
    'Test User',
    'Test Expense',
    1000,
    'Bills',
    new Date().toISOString().split('T')[0]
  );
  
  res.json({
    success: result.success,
    message: result.success ? 'Test email sent! Check your inbox.' : result.error
  });
});

// Check email config status (for debugging)
app.get('/api/email-status', async (req, res) => {
  const hasBrevoKey = !!process.env.BREVO_API_KEY;
  res.json({
    configured: hasBrevoKey,
    provider: 'Brevo',
    apiKey: hasBrevoKey ? 'SET (hidden)' : 'NOT SET',
    fromAddress: process.env.EMAIL_FROM_ADDRESS || 'vasudevyash@gmail.com'
  });
});

// Test send a single email (for debugging)
app.post('/api/test-send', async (req, res) => {
  try {
    const { sendReminderEmail } = require('./services/emailService');
    const result = await sendReminderEmail({
      to: req.body.email || 'vasudevyash@gmail.com',
      userName: 'Test User',
      expenseName: 'Test Expense',
      amount: 1000,
      dueDate: new Date().toISOString().split('T')[0],
      category: 'Test'
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Manual trigger for reminders (useful for testing)
app.post('/api/trigger-reminders', async (req, res) => {
  try {
    const { processReminders } = require('./scheduler/reminderScheduler');
    await processReminders();
    res.json({ success: true, message: 'Reminder check completed. Check server logs.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Check pending reminders (for debugging)
app.get('/api/pending-reminders', async (req, res) => {
  try {
    const { query } = require('./config/database');
    const today = new Date().toISOString().split('T')[0];
    const pending = await query(`
      SELECT e.id, e.expense_name, e.reminder_date, e.due_date, e.email_sent, e.paid, u.email
      FROM expenses e
      JOIN users u ON e.user_id = u.id
      WHERE e.reminder_date <= $1 AND e.email_sent = 0 AND (e.paid = 0 OR e.paid IS NULL)
      ORDER BY e.reminder_date
    `, [today]);
    res.json({ success: true, today, count: pending.length, reminders: pending });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Auth routes with stricter rate limiting
app.use('/api/auth', authLimiter, authRoutes);

// Expense routes
app.use('/api/expenses', expenseRoutes);

// ===========================================
// Error Handling
// ===========================================

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  // Handle specific error types
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON in request body'
    });
  }

  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred' 
      : err.message
  });
});

// ===========================================
// Server Startup
// ===========================================

async function startServer() {
  try {
    // Initialize database (async for sql.js)
    await initializeDatabase();

    // Initialize email transporter
    initializeTransporter();

    // Start reminder scheduler
    startScheduler();

    // Start server
    app.listen(PORT, () => {
      console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   💰 Expense Reminder API Server                          ║
║                                                           ║
║   Server running on: http://localhost:${PORT}              ║
║   Environment: ${process.env.NODE_ENV || 'development'}                              ║
║                                                           ║
║   API Endpoints:                                          ║
║   - POST /api/auth/signup     Register new user           ║
║   - POST /api/auth/login      Login user                  ║
║   - GET  /api/auth/me         Get current user            ║
║   - GET  /api/expenses        Get all expenses            ║
║   - POST /api/expenses        Create expense              ║
║   - PUT  /api/expenses/:id    Update expense              ║
║   - DELETE /api/expenses/:id  Delete expense              ║
║   - GET  /api/health          Health check                ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;
