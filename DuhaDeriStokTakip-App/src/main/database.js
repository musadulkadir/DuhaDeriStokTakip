const { Pool } = require('pg');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

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
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 3;

// PostgreSQL'i başlat (Platform bağımsız)
async function startPostgreSQL() {
  try {
    console.log('PostgreSQL başlatılıyor...');
    
    const platform = process.platform;
    let command;
    
    if (platform === 'darwin') {
      // macOS - Homebrew
      command = 'brew services restart postgresql@14';
    } else if (platform === 'win32') {
      // Windows - PostgreSQL service
      command = 'net start postgresql-x64-14 || sc start postgresql-x64-14';
    } else {
      // Linux
      command = 'sudo systemctl start postgresql';
    }
    
    await execPromise(command);
    console.log('PostgreSQL başlatıldı');
    // Başlaması için biraz bekle
    await new Promise(resolve => setTimeout(resolve, 2000));
    return true;
  } catch (error) {
    console.error('PostgreSQL başlatılamadı:', error.message);
    console.log('PostgreSQL manuel olarak başlatılmalı');
    return false;
  }
}

// Initialize database connection
async function initializeDatabase() {
  try {
    pool = new Pool(dbConfig);
    
    // Bağlantı hatalarını dinle
    pool.on('error', async (err) => {
      console.error('Beklenmeyen veritabanı hatası:', err);
      if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
        console.log('Veritabanı bağlantısı kesildi, yeniden bağlanılıyor...');
        await attemptReconnect();
      }
    });
    
    // Test connection
    const client = await pool.connect();
    console.log('✅ PostgreSQL veritabanına bağlanıldı');
    client.release();
    reconnectAttempts = 0; // Başarılı bağlantıda sayacı sıfırla
    
    return pool;
  } catch (err) {
    console.error('❌ Veritabanı bağlantı hatası:', err.message);
    
    // PostgreSQL çalışmıyorsa başlatmayı dene
    if (err.code === 'ECONNREFUSED') {
      console.log('PostgreSQL çalışmıyor, başlatılıyor...');
      const started = await startPostgreSQL();
      
      if (started) {
        // Tekrar bağlanmayı dene
        return initializeDatabase();
      }
    }
    
    throw err;
  }
}

// Yeniden bağlanma denemesi
async function attemptReconnect() {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.error('Maksimum yeniden bağlanma denemesi aşıldı');
    return false;
  }
  
  reconnectAttempts++;
  console.log(`Yeniden bağlanma denemesi ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}...`);
  
  try {
    // PostgreSQL'i başlat
    await startPostgreSQL();
    
    // Eski pool'u kapat
    if (pool) {
      await pool.end();
    }
    
    // Yeni pool oluştur
    await initializeDatabase();
    return true;
  } catch (error) {
    console.error('Yeniden bağlanma başarısız:', error.message);
    
    // Biraz bekle ve tekrar dene
    await new Promise(resolve => setTimeout(resolve, 3000));
    return attemptReconnect();
  }
}

// Helper function to execute queries
async function query(text, params = []) {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query(text, params);
      return result;
    } finally {
      client.release();
    }
  } catch (error) {
    // Bağlantı hatası varsa yeniden bağlanmayı dene
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      console.log('Sorgu sırasında bağlantı hatası, yeniden bağlanılıyor...');
      const reconnected = await attemptReconnect();
      
      if (reconnected) {
        // Sorguyu tekrar dene
        const client = await pool.connect();
        try {
          const result = await client.query(text, params);
          return result;
        } finally {
          client.release();
        }
      }
    }
    throw error;
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