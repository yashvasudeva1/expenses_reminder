/**
 * Database Configuration
 * Uses PostgreSQL via Supabase for persistent storage
 */

const { Pool } = require('pg');

// Create connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

/**
 * Initialize database - create tables if they don't exist
 */
async function initializeDatabase() {
  const client = await pool.connect();
  
  try {
    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create expenses table
    await client.query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expense_name VARCHAR(255) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        category VARCHAR(50) DEFAULT 'Other',
        due_date DATE NOT NULL,
        reminder_date DATE NOT NULL,
        recurring VARCHAR(10) DEFAULT 'no',
        email_sent INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    await client.query(`CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_expenses_reminder_date ON expenses(reminder_date)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_expenses_due_date ON expenses(due_date)`);

    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Execute a query and return all results
 */
async function query(sql, params = []) {
  const result = await pool.query(sql, params);
  return result.rows;
}

/**
 * Execute a query and return first result
 */
async function queryOne(sql, params = []) {
  const result = await pool.query(sql, params);
  return result.rows[0] || null;
}

/**
 * Execute an INSERT/UPDATE/DELETE query and return result
 */
async function execute(sql, params = []) {
  const result = await pool.query(sql, params);
  return {
    rowCount: result.rowCount,
    rows: result.rows
  };
}

/**
 * Get the pool for direct access if needed
 */
function getPool() {
  return pool;
}

module.exports = {
  initializeDatabase,
  query,
  queryOne,
  execute,
  getPool
};
