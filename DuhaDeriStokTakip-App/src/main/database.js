const { Pool } = require('pg');

// PostgreSQL connection configuration
const dbConfig = {
  user: process.env.DB_USER || 'musadulkadir',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'duha_deri_db',
  password: process.env.DB_PASSWORD || '',
  port: process.env.DB_PORT || 5432,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

let pool;

// Initialize database connection
async function initializeDatabase() {
  try {
    pool = new Pool(dbConfig);
    
    // Test connection
    const client = await pool.connect();
    console.log('Connected to PostgreSQL database');
    client.release();
    
    return pool;
  } catch (err) {
    console.error('Database connection error:', err);
    throw err;
  }
}

// Helper function to execute queries
async function query(text, params = []) {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}

// Helper function to get a single row
async function queryOne(text, params = []) {
  const result = await query(text, params);
  return result.rows[0] || null;
}

// Helper function to get all rows
async function queryAll(text, params = []) {
  const result = await query(text, params);
  return result.rows;
}

module.exports = {
  initializeDatabase,
  query,
  queryOne,
  queryAll,
  getPool: () => pool
};