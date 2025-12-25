/**
 * Database Configuration
 * Uses sql.js (pure JavaScript SQLite) - no native compilation required
 */

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

// Database file path - use persistent disk on Render, local folder in development
const dbDir = process.env.NODE_ENV === 'production' 
  ? '/var/data' 
  : path.join(__dirname, '..');
const dbPath = path.join(dbDir, 'expense_reminder.db');

let db = null;

/**
 * Initialize database
 */
async function initializeDatabase() {
  try {
    const SQL = await initSqlJs();
    
    // Ensure directory exists
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    
    // Load existing database or create new one
    if (fs.existsSync(dbPath)) {
      const fileBuffer = fs.readFileSync(dbPath);
      db = new SQL.Database(fileBuffer);
      console.log('✅ Database loaded from file');
    } else {
      db = new SQL.Database();
      console.log('✅ New database created');
    }

    // Create tables
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        expense_name TEXT NOT NULL,
        amount REAL NOT NULL,
        category TEXT DEFAULT 'Other',
        due_date DATE NOT NULL,
        reminder_date DATE NOT NULL,
        recurring TEXT DEFAULT 'no' CHECK(recurring IN ('yes', 'no')),
        email_sent INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create indexes
    db.run(`CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_expenses_reminder_date ON expenses(reminder_date)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_expenses_due_date ON expenses(due_date)`);

    // Save to file
    saveDatabase();

    console.log('✅ Database initialized successfully');
    return db;
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}

/**
 * Save database to file
 */
function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

/**
 * Get database instance
 */
function getDb() {
  return db;
}

/**
 * Helper: Execute a query and return all results
 */
function all(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

/**
 * Helper: Execute a query and return first result
 */
function get(sql, params = []) {
  const results = all(sql, params);
  return results[0] || null;
}

/**
 * Helper: Execute a query (INSERT, UPDATE, DELETE)
 */
function run(sql, params = []) {
  db.run(sql, params);
  saveDatabase();
  return {
    lastInsertRowid: db.exec("SELECT last_insert_rowid()")[0]?.values[0][0] || 0,
    changes: db.getRowsModified()
  };
}

module.exports = {
  initializeDatabase,
  getDb,
  saveDatabase,
  all,
  get,
  run
};
