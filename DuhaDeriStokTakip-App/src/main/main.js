const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { initializeDatabase, query, queryOne, queryAll } = require('./database');

// Environment detection
//const isDev = process.env.NODE_ENV === 'development';
const isDev = true;

let db;
let mainWindow;

// Create database tables
async function createTables() {
  try {
    // Customers table
    await query(`
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(50),
        address TEXT,
        balance DECIMAL(15,2) DEFAULT 0,
        balance_usd DECIMAL(15,2) DEFAULT 0,
        balance_eur DECIMAL(15,2) DEFAULT 0,
        type VARCHAR(20) DEFAULT 'customer' CHECK (type IN ('customer', 'supplier')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Mevcut tabloya yeni kolonları ekle (eğer yoksa)
    try {
      await query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS balance_usd DECIMAL(15,2) DEFAULT 0`);
      await query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS balance_eur DECIMAL(15,2) DEFAULT 0`);
    } catch (err) {
      // Kolonlar zaten varsa hata vermez
    }

    // Products table (sadece satış için ürünler)
    await query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        color VARCHAR(50),
        stock_quantity INTEGER DEFAULT 0,
        unit VARCHAR(20) DEFAULT 'adet',
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Materials table (sadece alım için malzemeler)
    await query(`
      CREATE TABLE IF NOT EXISTS materials (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        color VARCHAR(50),
        color_shade VARCHAR(100),
        brand VARCHAR(100),
        code VARCHAR(100),
        stock_quantity INTEGER DEFAULT 0,
        unit VARCHAR(20) DEFAULT 'kg',
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Employees table
    await query(`
      CREATE TABLE IF NOT EXISTS employees (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(50),
        position VARCHAR(100),
        salary DECIMAL(15,2) DEFAULT 0,
        salary_currency VARCHAR(10) DEFAULT 'USD',
        balance DECIMAL(15,2) DEFAULT 0,
        hire_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Sales table
    await query(`
      CREATE TABLE IF NOT EXISTS sales (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id),
        total_amount DECIMAL(15,2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'TRY',
        payment_status VARCHAR(20) DEFAULT 'pending',
        sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Sale items table
    await query(`
      CREATE TABLE IF NOT EXISTS sale_items (
        id SERIAL PRIMARY KEY,
        sale_id INTEGER REFERENCES sales(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(id),
        quantity_pieces INTEGER NOT NULL,
        quantity_desi DECIMAL(10,2) NOT NULL,
        unit_price_per_desi DECIMAL(15,2) NOT NULL,
        total_price DECIMAL(15,2) NOT NULL,
        unit VARCHAR(10) DEFAULT 'desi',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Mevcut tabloya unit kolonunu ekle (eğer yoksa)
    try {
      await query(`ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS unit VARCHAR(10) DEFAULT 'desi'`);
    } catch (err) {
      // Kolon zaten varsa hata vermez
    }

    // Stock movements table
    await query(`
      CREATE TABLE IF NOT EXISTS stock_movements (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(id),
        movement_type VARCHAR(50) NOT NULL,
        quantity INTEGER NOT NULL,
        previous_stock INTEGER,
        new_stock INTEGER,
        reference_type VARCHAR(50),
        reference_id INTEGER,
        customer_id INTEGER,
        unit_price DECIMAL(15,2),
        total_amount DECIMAL(15,2),
        notes TEXT,
        "user" VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Customer payments table
    await query(`
      CREATE TABLE IF NOT EXISTS customer_payments (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id),
        amount DECIMAL(15,2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'TRY',
        payment_type VARCHAR(20) DEFAULT 'cash',
        payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Cash transactions table
    await query(`
      CREATE TABLE IF NOT EXISTS cash_transactions (
        id SERIAL PRIMARY KEY,
        type VARCHAR(10) NOT NULL CHECK (type IN ('in', 'out')),
        amount DECIMAL(15,2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'USD',
        category VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        reference_type VARCHAR(50),
        reference_id INTEGER,
        customer_id INTEGER REFERENCES customers(id),
        "user" VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Employee payments table
    await query(`
      CREATE TABLE IF NOT EXISTS employee_payments (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER REFERENCES employees(id),
        amount DECIMAL(15,2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'USD',
        payment_type VARCHAR(20) DEFAULT 'salary',
        payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Categories table
    await query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Colors table
    await query(`
      CREATE TABLE IF NOT EXISTS colors (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE,
        hex_code VARCHAR(7),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Settings table
    await query(`
      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        key VARCHAR(100) NOT NULL UNIQUE,
        value TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Default şifre ekle (eğer yoksa)
    await query(`
      INSERT INTO settings (key, value)
      VALUES ('app_password', 'admin123')
      ON CONFLICT (key) DO NOTHING
    `);

    // Purchases table
    await query(`
      CREATE TABLE IF NOT EXISTS purchases (
        id SERIAL PRIMARY KEY,
        supplier_id INTEGER REFERENCES customers(id),
        total_amount DECIMAL(15,2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'TRY',
        purchase_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        notes TEXT,
        status VARCHAR(20) DEFAULT 'completed',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Purchase items table
    await query(`
      CREATE TABLE IF NOT EXISTS purchase_items (
        id SERIAL PRIMARY KEY,
        purchase_id INTEGER REFERENCES purchases(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(id),
        quantity INTEGER NOT NULL,
        unit_price DECIMAL(15,2) NOT NULL,
        total_price DECIMAL(15,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Returns table
    await query(`
      CREATE TABLE IF NOT EXISTS returns (
        id SERIAL PRIMARY KEY,
        sale_id INTEGER REFERENCES sales(id),
        customer_id INTEGER REFERENCES customers(id),
        product_id INTEGER REFERENCES products(id),
        quantity DECIMAL(10,2) NOT NULL,
        unit_price DECIMAL(15,2) NOT NULL,
        total_amount DECIMAL(15,2) NOT NULL,
        return_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert default categories
    const defaultCategories = ['Keçi', 'Koyun', 'Oğlak', 'Dana'];
    for (const category of defaultCategories) {
      await query('INSERT INTO categories (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [category]);
    }

    // Insert default colors
    const defaultColors = [
      { name: 'Siyah', hex: '#000000' },
      { name: 'Bej', hex: '#F5F5DC' },
      { name: 'Beyaz', hex: '#FFFFFF' },
      { name: 'Kahverengi', hex: '#8B4513' },
      { name: 'Kırmızı', hex: '#FF0000' },
      { name: 'Bordo', hex: '#800020' },
      { name: 'Taba', hex: '#D2B48C' }
    ];

    for (const color of defaultColors) {
      await query('INSERT INTO colors (name, hex_code) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING', [color.name, color.hex]);
    }

    // Migration: products tablosundaki type='material' kayıtları materials'a taşı
    try {
      // Önce type kolonu var mı kontrol et
      const typeColumnExists = await query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='products' AND column_name='type'
      `);

      if (typeColumnExists.rows.length > 0) {
        // type='material' olan kayıtları materials tablosuna kopyala
        await query(`
          INSERT INTO materials (id, name, category, color, stock_quantity, unit, description, created_at, updated_at)
          SELECT id, name, category, color, stock_quantity, unit, description, created_at, updated_at
          FROM products
          WHERE type = 'material'
          ON CONFLICT (id) DO NOTHING
        `);

        // type='material' olan kayıtları products'tan sil
        await query(`DELETE FROM products WHERE type = 'material'`);

        // type kolonunu kaldır
        await query(`ALTER TABLE products DROP COLUMN IF EXISTS type`);

        console.log('Migration completed: Materials moved to separate table');
      }
    } catch (migrationError) {
      console.log('Migration skipped or already completed:', migrationError.message);
    }

    // Migration 2: Remove foreign key constraint from purchase_items
    try {
      // Check if constraint exists
      const constraintCheck = await query(`
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE table_name = 'purchase_items' 
        AND constraint_name = 'purchase_items_product_id_fkey'
      `);

      if (constraintCheck.rows.length > 0) {
        // Drop the foreign key constraint
        await query(`
          ALTER TABLE purchase_items 
          DROP CONSTRAINT IF EXISTS purchase_items_product_id_fkey
        `);

        console.log('Migration completed: Removed purchase_items foreign key constraint');
      }
    } catch (migrationError) {
      console.log('Migration 2 skipped or already completed:', migrationError.message);
    }

    // Migration 3: Remove foreign key constraint from stock_movements
    try {
      // Check if constraint exists
      const constraintCheck = await query(`
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE table_name = 'stock_movements' 
        AND constraint_name = 'stock_movements_product_id_fkey'
      `);

      if (constraintCheck.rows.length > 0) {
        // Drop the foreign key constraint
        await query(`
          ALTER TABLE stock_movements 
          DROP CONSTRAINT IF EXISTS stock_movements_product_id_fkey
        `);

        console.log('Migration completed: Removed stock_movements foreign key constraint');
      }
    } catch (migrationError) {
      console.log('Migration 3 skipped or already completed:', migrationError.message);
    }

    // Migration 4: Recalculate supplier balances from purchases
    try {
      // Check if migration is needed
      const needsMigration = await query(`
        SELECT COUNT(*) as count 
        FROM customers 
        WHERE type = 'supplier' 
        AND balance = 0 
        AND balance_usd = 0 
        AND balance_eur = 0
        AND id IN (SELECT DISTINCT supplier_id FROM purchases)
      `);

      if (needsMigration.rows[0].count > 0) {
        console.log('Recalculating supplier balances from purchases...');

        // Get all suppliers
        const suppliers = await query(`SELECT id FROM customers WHERE type = 'supplier'`);

        for (const supplier of suppliers.rows) {
          // Calculate balances from purchases
          const balances = await query(`
            SELECT 
              COALESCE(SUM(CASE WHEN currency = 'TRY' OR currency IS NULL THEN total_amount ELSE 0 END), 0) as balance_try,
              COALESCE(SUM(CASE WHEN currency = 'USD' THEN total_amount ELSE 0 END), 0) as balance_usd,
              COALESCE(SUM(CASE WHEN currency = 'EUR' THEN total_amount ELSE 0 END), 0) as balance_eur
            FROM purchases
            WHERE supplier_id = $1
          `, [supplier.id]);

          const balance = balances.rows[0];

          // Update supplier balance
          await query(`
            UPDATE customers 
            SET 
              balance = $1,
              balance_usd = $2,
              balance_eur = $3,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = $4
          `, [balance.balance_try, balance.balance_usd, balance.balance_eur, supplier.id]);

          console.log(`Updated supplier ${supplier.id} balances: TRY=${balance.balance_try}, USD=${balance.balance_usd}, EUR=${balance.balance_eur}`);
        }

        console.log('Migration completed: Supplier balances recalculated');
      }
    } catch (migrationError) {
      console.log('Migration 4 skipped or already completed:', migrationError.message);
    }

    console.log('Database tables created successfully');
  } catch (error) {
    console.error('Table creation error:', error);
    throw error;
  }
}

// Database API handlers
ipcMain.handle('db:test-connection', async () => {
  try {
    await query('SELECT 1');
    return true;
  } catch (error) {
    return false;
  }
});

ipcMain.handle('db:create-tables', async () => {
  try {
    await createTables();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Customer handlers
ipcMain.handle('customers:get-all', async (_, page = 1, limit = 50) => {
  try {
    const offset = (page - 1) * limit;
    const result = await queryAll('SELECT * FROM customers ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]);
    const countResult = await queryOne('SELECT COUNT(*) as total FROM customers');

    return {
      success: true,
      data: result,
      total: parseInt(countResult.total),
      page,
      limit
    };
  } catch (error) {
    return {
      success: false,
      data: [],
      total: 0,
      page,
      limit,
      error: error.message
    };
  }
});

ipcMain.handle('customers:get-by-id', async (_, id) => {
  try {
    const result = await queryOne('SELECT * FROM customers WHERE id = $1', [id]);

    if (!result) {
      return { success: false, error: 'Müşteri bulunamadı' };
    }

    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('customers:create', async (_, customer) => {
  try {
    const result = await queryOne(`
      INSERT INTO customers (name, email, phone, address, balance, type) 
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      customer.name,
      customer.email || null,
      customer.phone || null,
      customer.address || null,
      customer.balance || 0,
      customer.type || 'customer'
    ]);

    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('customers:update', async (_, id, customer) => {
  try {
    // Dinamik olarak güncellenecek alanları belirle
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (customer.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(customer.name);
    }
    if (customer.email !== undefined) {
      updates.push(`email = $${paramIndex++}`);
      values.push(customer.email || null);
    }
    if (customer.phone !== undefined) {
      updates.push(`phone = $${paramIndex++}`);
      values.push(customer.phone || null);
    }
    if (customer.address !== undefined) {
      updates.push(`address = $${paramIndex++}`);
      values.push(customer.address || null);
    }
    if (customer.balance !== undefined) {
      updates.push(`balance = $${paramIndex++}`);
      values.push(customer.balance || 0);
    }
    if (customer.balance_usd !== undefined) {
      updates.push(`balance_usd = $${paramIndex++}`);
      values.push(customer.balance_usd || 0);
    }
    if (customer.balance_eur !== undefined) {
      updates.push(`balance_eur = $${paramIndex++}`);
      values.push(customer.balance_eur || 0);
    }
    if (customer.type !== undefined) {
      updates.push(`type = $${paramIndex++}`);
      values.push(customer.type || 'customer');
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await queryOne(`
      UPDATE customers 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, values);

    if (!result) {
      return { success: false, error: 'Müşteri bulunamadı' };
    }

    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('customers:delete', async (_, id) => {
  try {
    // Start transaction
    await query('BEGIN');

    // Müşterinin satışlarını kontrol et
    const sales = await queryAll('SELECT id FROM sales WHERE customer_id = $1', [id]);

    // Her satış için satış kalemlerini ve stok hareketlerini sil
    for (const sale of sales) {
      // Satış kalemlerini sil
      await query('DELETE FROM sale_items WHERE sale_id = $1', [sale.id]);

      // Stok hareketlerini sil
      await query('DELETE FROM stock_movements WHERE reference_type = $1 AND customer_id = $2', ['sale', id]);
    }

    // Satışları sil
    await query('DELETE FROM sales WHERE customer_id = $1', [id]);

    // Ödemeleri sil
    await query('DELETE FROM customer_payments WHERE customer_id = $1', [id]);

    // Kasa işlemlerini sil
    await query('DELETE FROM cash_transactions WHERE customer_id = $1', [id]);

    // Müşteriyi sil
    const result = await query('DELETE FROM customers WHERE id = $1', [id]);

    if (result.rowCount === 0) {
      await query('ROLLBACK');
      return { success: false, error: 'Müşteri bulunamadı' };
    }

    // Commit transaction
    await query('COMMIT');

    return { success: true };
  } catch (error) {
    // Rollback transaction
    await query('ROLLBACK');
    return { success: false, error: error.message };
  }
});

// Electron app setup
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    },
    show: false, // Başlangıçta gizli
    backgroundColor: '#F5F5F5' // SplashScreen arka planı ile aynı
  });

  // Window'u maximize et
  mainWindow.maximize();

  // ready-to-show olayında pencereyi göster
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    console.log('Window is ready and shown');
  });

  let htmlPath; // Yüklenecek yolu belirlemek için

  if (isDev) {
    // GELİŞTİRME MODU
    htmlPath = 'http://localhost:3000';
    console.log('GELİŞTİRME MODU: Yükleniyor:', htmlPath);
    //mainWindow.webContents.openDevTools(); // Geliştirici araçlarını aç

  } else {
    // PRODUCTION MODU
    htmlPath = `file://${path.join(__dirname, '../../dist-react/index.html')}`;
    console.log('PRODUCTION MODU: Yükleniyor:', htmlPath);
  }

  // Belirlenen yolu yükle
  mainWindow.loadURL(htmlPath);
}

app.whenReady().then(async () => {
  // Window'u hemen oluştur
  createWindow();

  // Database'i arka planda başlat
  try {
    db = await initializeDatabase();
    await createTables();
    console.log('✅ Veritabanı başarıyla başlatıldı');
    
    // Başarılı bağlantı bildirimi gönder
    if (mainWindow) {
      mainWindow.webContents.send('db-status', { connected: true, message: 'Veritabanı bağlantısı başarılı' });
    }
  } catch (error) {
    console.error('❌ Veritabanı başlatılamadı:', error);
    
    // Hata bildirimi gönder
    if (mainWindow) {
      mainWindow.webContents.send('db-status', { 
        connected: false, 
        message: 'Veritabanı bağlantısı kurulamadı. Lütfen PostgreSQL\'in çalıştığından emin olun.' 
      });
    }
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
// Product handlers
ipcMain.handle('products:get-all', async (_, page = 1, limit = 50) => {
  try {
    const offset = (page - 1) * limit;
    const result = await queryAll('SELECT * FROM products ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]);
    const countResult = await queryOne('SELECT COUNT(*) as total FROM products');

    return {
      success: true,
      data: result,
      total: parseInt(countResult.total),
      page,
      limit
    };
  } catch (error) {
    return {
      success: false,
      data: [],
      total: 0,
      page,
      limit,
      error: error.message
    };
  }
});

ipcMain.handle('products:create', async (_, product) => {
  try {
    const result = await queryOne(`
      INSERT INTO products (name, category, color, stock_quantity, unit, description) 
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      product.name,
      product.category,
      product.color || null,
      product.stock_quantity || 0,
      product.unit || 'adet',
      product.description || null
    ]);

    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Categories handlers
ipcMain.handle('categories:get-all', async () => {
  try {
    const result = await queryAll('SELECT * FROM categories ORDER BY name');
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Colors handlers
ipcMain.handle('colors:get-all', async () => {
  try {
    const result = await queryAll('SELECT * FROM colors ORDER BY name');
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Sales handlers
ipcMain.handle('sales:get-all', async (_, startDate, endDate) => {
  try {
    let queryText = `
      SELECT 
        s.*,
        c.name as customer_name,
        si.product_id,
        si.quantity_pieces,
        si.quantity_desi,
        si.unit_price_per_desi,
        si.total_price,
        p.category,
        p.color
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN sale_items si ON s.id = si.sale_id
      LEFT JOIN products p ON si.product_id = p.id
    `;

    const params = [];
    let whereClause = '';
    if (startDate && endDate) {
      whereClause = ' WHERE DATE(s.sale_date) BETWEEN $1 AND $2';
      params.push(startDate, endDate);
    }

    queryText += whereClause + ' ORDER BY s.created_at DESC';

    const result = await queryAll(queryText, params);

    // Toplam tutarları hesapla
    let totalsQuery = `
      SELECT 
        currency,
        SUM(total_amount) as total
      FROM sales s
    `;

    if (whereClause) {
      totalsQuery += whereClause;
    }

    totalsQuery += ' GROUP BY currency';

    const totals = await queryAll(totalsQuery, params);

    // Tarih aralığını hesapla
    let dayCount = 0;
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      dayCount = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    }

    return {
      success: true,
      data: result,
      totals: totals.reduce((acc, row) => {
        acc[row.currency] = parseFloat(row.total) || 0;
        return acc;
      }, {}),
      dayCount
    };
  } catch (error) {
    console.error('sales:get-all error:', error);
    return { success: false, error: error.message };
  }
});

// Sales by ID handler
ipcMain.handle('sales:getById', async (event, saleId) => {
  try {
    const queryText = `
      SELECT 
        s.*,
        c.name as customer_name,
        si.product_id,
        si.quantity_pieces,
        si.quantity_desi,
        si.unit_price_per_desi,
        si.total_price,
        si.unit,
        p.category,
        p.color
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN sale_items si ON s.id = si.sale_id
      LEFT JOIN products p ON si.product_id = p.id
      WHERE s.id = $1
    `;

    const saleDetailsRows = await queryAll(queryText, [saleId]);

    if (!saleDetailsRows || saleDetailsRows.length === 0) {
      return { success: false, error: 'Satış bulunamadı' };
    }

    const firstRow = saleDetailsRows[0];

    if (!firstRow) {
      return { success: false, error: 'Satış verisi bulunamadı' };
    }

    const formattedSale = {
      id: firstRow?.id || null,
      customerId: firstRow?.customer_id || null,
      customerName: firstRow?.customer_name || 'Bilinmeyen Müşteri',
      currency: firstRow?.currency || 'TRY',
      total: firstRow?.total_amount || 0,
      date: firstRow?.sale_date || null,

      items: saleDetailsRows.map(row => ({
        productId: row.product_id,
        productName: `${row.category || 'Bilinmiyor'} - ${row.color || 'Bilinmiyor'}`,
        quantityPieces: row.quantity_pieces,
        quantityDesi: row.quantity_desi,
        unitPricePerDesi: row.unit_price_per_desi,
        total: row.total_price,
        unit: row.unit || 'desi'
      })).filter(item => item.productId)
    };

    return { success: true, data: formattedSale };
  } catch (error) {
    console.error('Error processing sale data:', error);
    return { success: false, error: error.message || 'Veri işleme hatası' };
  }
});

ipcMain.handle('employees:getCounts', async () => {
  try {
    const counts = await queryOne(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active,
        SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) AS inactive
      FROM employees
    `);

    return {
      success: true,
      data: {
        countEmployees: counts.total || 0,
        countActiveEmployees: counts.active || 0,
        countInactiveEmployees: counts.inactive || 0,
      }
    };
  } catch (error) {
    console.error('employees:getCounts hatası:', error);
    return {
      success: false,
      error: 'Çalışan sayıları alınamadı.',
      data: { countEmployees: 0, countActiveEmployees: 0, countInactiveEmployees: 0 }
    };
  }
});

// Employee handlers
ipcMain.handle('employees:get-all', async (_, page = 1, limit = 10) => {
  try {
    const offset = (page - 1) * limit;
    const result = await queryAll('SELECT * FROM employees ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]);
    const countResult = await queryOne('SELECT COUNT(*) as total FROM employees');

    return {
      success: true,
      data: result,
      total: parseInt(countResult.total),
      page,
      limit
    };
  } catch (error) {
    return {
      success: false,
      data: [],
      total: 0,
      page,
      limit,
      error: error.message
    };
  }
});

// Cash handlers
ipcMain.handle('cash:get-all', async () => {
  try {
    const result = await queryAll('SELECT * FROM cash_transactions ORDER BY created_at DESC');
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Purchase handlers
ipcMain.handle('purchases:get-all', async (_, page = 1, limit = 50) => {
  try {
    const offset = (page - 1) * limit;
    const result = await queryAll(`
      SELECT p.*, c.name as supplier_name 
      FROM purchases p 
      LEFT JOIN customers c ON p.supplier_id = c.id 
      ORDER BY p.created_at DESC 
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
    const countResult = await queryOne('SELECT COUNT(*) as total FROM purchases');

    return {
      success: true,
      data: result,
      total: parseInt(countResult.total),
      page,
      limit
    };
  } catch (error) {
    return {
      success: false,
      data: [],
      total: 0,
      page,
      limit,
      error: error.message
    };
  }
});

// Additional Product handlers
ipcMain.handle('products:get-by-id', async (_, id) => {
  try {
    const result = await queryOne('SELECT * FROM products WHERE id = $1', [id]);

    if (!result) {
      return { success: false, error: 'Ürün bulunamadı' };
    }

    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('products:update', async (_, id, product) => {
  try {
    const result = await queryOne(`
      UPDATE products 
      SET name = $1, category = $2, color = $3, stock_quantity = $4, unit = $5, description = $6, updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `, [
      product.name,
      product.category,
      product.color || null,
      product.stock_quantity || 0,
      product.unit || 'adet',
      product.description || null,
      id
    ]);

    if (!result) {
      return { success: false, error: 'Ürün bulunamadı' };
    }

    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('products:delete', async (_, id) => {
  try {
    // Önce sale_items'ları sil
    await query('DELETE FROM sale_items WHERE product_id = $1', [id]);

    // Sonra stock_movements'ları sil
    await query('DELETE FROM stock_movements WHERE product_id = $1', [id]);

    // En son ürünü sil
    const result = await query('DELETE FROM products WHERE id = $1', [id]);

    if (result.rowCount === 0) {
      return { success: false, error: 'Ürün bulunamadı' };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('products:update-stock', async (_, id, newStock) => {
  try {
    const result = await queryOne(`
      UPDATE products 
      SET stock_quantity = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2
      RETURNING *
    `, [newStock, id]);

    if (!result) {
      return { success: false, error: 'Ürün bulunamadı' };
    }

    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Materials handlers
ipcMain.handle('materials:get-all', async () => {
  try {
    const result = await query('SELECT * FROM materials ORDER BY name');
    return { success: true, data: result.rows };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('materials:create', async (_, material) => {
  try {
    const result = await queryOne(`
      INSERT INTO materials (name, category, color_shade, brand, code, stock_quantity, unit, description)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      material.name,
      material.category,
      material.color_shade || null,
      material.brand || null,
      material.code || null,
      material.stock_quantity || 0,
      material.unit || 'kg',
      material.description || null
    ]);

    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('materials:update', async (_, id, material) => {
  try {
    const result = await queryOne(`
      UPDATE materials 
      SET name = $1, category = $2, color_shade = $3, brand = $4, code = $5, 
          stock_quantity = $6, unit = $7, description = $8, updated_at = CURRENT_TIMESTAMP
      WHERE id = $9
      RETURNING *
    `, [
      material.name,
      material.category,
      material.color_shade || null,
      material.brand || null,
      material.code || null,
      material.stock_quantity || 0,
      material.unit || 'kg',
      material.description || null,
      id
    ]);

    if (!result) {
      return { success: false, error: 'Malzeme bulunamadı' };
    }

    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('materials:delete', async (_, id) => {
  try {
    // Önce purchase_items'ları sil
    await query('DELETE FROM purchase_items WHERE product_id = $1', [id]);

    // Sonra stock_movements'ları sil
    await query('DELETE FROM stock_movements WHERE product_id = $1', [id]);

    // En son malzemeyi sil
    const result = await query('DELETE FROM materials WHERE id = $1', [id]);

    if (result.rowCount === 0) {
      return { success: false, error: 'Malzeme bulunamadı' };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Additional Employee handlers
ipcMain.handle('employees:create', async (_, employee) => {
  try {
    const result = await queryOne(`
      INSERT INTO employees (name, email, phone, position, salary, salary_currency, balance, hire_date, status) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      employee.name,
      employee.email || null,
      employee.phone || null,
      employee.position || null,
      employee.salary || 0,
      employee.salary_currency || 'USD',
      employee.balance || 0,
      employee.hire_date || new Date(),
      employee.status || 'active'
    ]);

    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('employees:update', async (_, id, employee) => {
  try {
    const result = await queryOne(`
      UPDATE employees 
      SET name = $1, email = $2, phone = $3, position = $4, salary = $5, salary_currency = $6, balance = $7, status = $8, updated_at = CURRENT_TIMESTAMP
      WHERE id = $9
      RETURNING *
    `, [
      employee.name,
      employee.email || null,
      employee.phone || null,
      employee.position || null,
      employee.salary || 0,
      employee.salary_currency || 'USD',
      employee.balance || 0,
      employee.status || 'active',
      id
    ]);

    if (!result) {
      return { success: false, error: 'Çalışan bulunamadı' };
    }

    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('employees:get-by-id', async (_, id) => {
  try {
    const result = await queryOne('SELECT * FROM employees WHERE id = $1', [id]);

    if (!result) {
      return { success: false, error: 'Çalışan bulunamadı' };
    }

    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('employees:delete', async (_, id) => {
  try {
    const result = await query('DELETE FROM employees WHERE id = $1', [id]);

    if (result.rowCount === 0) {
      return { success: false, error: 'Çalışan bulunamadı' };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('employees:update-balance', async (_, employeeId, newBalance) => {
  try {
    const result = await queryOne(`
      UPDATE employees 
      SET balance = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2
      RETURNING *
    `, [newBalance, employeeId]);

    if (!result) {
      return { success: false, error: 'Çalışan bulunamadı' };
    }

    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Employee status update handler
ipcMain.handle('employees:update-status', async (_, employeeId, status) => {
  try {
    // Validate status value
    if (!status || !['active', 'inactive'].includes(status)) {
      return { success: false, error: 'Geçersiz durum değeri. Durum "active" veya "inactive" olmalıdır.' };
    }

    // Validate employee ID
    if (!employeeId || isNaN(employeeId)) {
      return { success: false, error: 'Geçersiz çalışan ID değeri.' };
    }

    // Check if employee exists
    const existingEmployee = await queryOne('SELECT id, status FROM employees WHERE id = $1', [employeeId]);
    if (!existingEmployee) {
      return { success: false, error: 'Çalışan bulunamadı' };
    }

    // Check if status is already the same
    if (existingEmployee.status === status) {
      return { success: false, error: `Çalışan zaten ${status === 'active' ? 'aktif' : 'pasif'} durumda.` };
    }

    // Update employee status
    const result = await queryOne(`
      UPDATE employees 
      SET status = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2
      RETURNING *
    `, [status, employeeId]);

    if (!result) {
      return { success: false, error: 'Durum güncellenirken bir hata oluştu' };
    }

    return { success: true, data: result };
  } catch (error) {
    console.error('Employee status update error:', error);
    return { success: false, error: error.message };
  }
});

// Get employees by status handler
ipcMain.handle('employees:get-by-status', async (_, status, page = 1, limit = 10, searchTerm = '') => {
  try {
    // Validate status value
    if (!status || !['active', 'inactive'].includes(status)) {
      return {
        success: false,
        data: [],
        total: 0,
        totalSalary: 0,
        page,
        limit,
        error: 'Geçersiz durum değeri. Durum "active" veya "inactive" olmalıdır.'
      };
    }

    // Validate pagination parameters
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit) || 50)); // Max 100 items per page
    const offset = (pageNum - 1) * limitNum;

    // Build search condition
    let searchCondition = '';
    let queryParams = [status];
    let countParams = [status];

    if (searchTerm && searchTerm.trim()) {
      const search = `%${searchTerm.trim().toLowerCase()}%`;
      searchCondition = ` AND (
        LOWER(name) LIKE $${queryParams.length + 1} OR 
        LOWER(phone) LIKE $${queryParams.length + 1} OR 
        LOWER(email) LIKE $${queryParams.length + 1} OR 
        LOWER(position) LIKE $${queryParams.length + 1}
      )`;
      queryParams.push(search);
      countParams.push(search);
    }

    // Get employees by status with pagination and search
    const result = await queryAll(`
      SELECT * FROM employees 
      WHERE status = $1 ${searchCondition}
      ORDER BY created_at DESC 
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `, [...queryParams, limitNum, offset]);

    // Get total count and total salary for all employees with this status and search
    const statsResult = await queryOne(`
      SELECT 
        COUNT(*) as total,
        COALESCE(SUM(COALESCE(salary, 0)), 0) as total_salary
      FROM employees 
      WHERE status = $1 ${searchCondition}
    `, countParams);

    return {
      success: true,
      data: result,
      total: parseInt(statsResult.total),
      totalSalary: parseFloat(statsResult.total_salary) || 0,
      page: pageNum,
      limit: limitNum
    };
  } catch (error) {
    console.error('Get employees by status error:', error);
    return {
      success: false,
      data: [],
      total: 0,
      totalSalary: 0,
      page: page || 1,
      limit: limit || 50,
      error: error.message
    };
  }
});

// Stock movements handlers
ipcMain.handle('stock-movements:get-all', async () => {
  try {
    const result = await queryAll('SELECT * FROM stock_movements ORDER BY created_at DESC');
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('stock-movements:get-by-product', async (_, productId) => {
  try {
    const result = await queryAll('SELECT * FROM stock_movements WHERE product_id = $1 ORDER BY created_at DESC', [productId]);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('stock-movements:create', async (_, movement) => {
  try {
    const result = await queryOne(`
      INSERT INTO stock_movements (
        product_id, movement_type, quantity, previous_stock, new_stock, 
        reference_type, reference_id, customer_id, unit_price, total_amount, 
        notes, "user"
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [
      movement.product_id,
      movement.movement_type,
      movement.quantity,
      movement.previous_stock || null,
      movement.new_stock || null,
      movement.reference_type || null,
      movement.reference_id || null,
      movement.customer_id || null,
      movement.unit_price || null,
      movement.total_amount || null,
      movement.notes || null,
      movement.user || 'system'
    ]);

    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Sales create handler
ipcMain.handle('sales:create', async (_, sale) => {
  try {
    // Start transaction
    await query('BEGIN');

    // Create sale record
    const saleResult = await queryOne(`
      INSERT INTO sales (customer_id, total_amount, currency, payment_status, sale_date, notes) 
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      sale.customer_id,
      sale.total_amount,
      sale.currency || 'TRY',
      sale.payment_status || 'pending',
      sale.sale_date || new Date(),
      sale.notes || null
    ]);

    // Create sale items
    if (sale.items && sale.items.length > 0) {
      for (const item of sale.items) {
        await query(`
          INSERT INTO sale_items (
            sale_id, product_id, quantity_pieces, quantity_desi, 
            unit_price_per_desi, total_price, unit
          ) 
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          saleResult.id,
          item.product_id,
          item.quantity_pieces,
          item.quantity_desi,
          item.unit_price_per_desi,
          item.total_price,
          item.unit || 'desi'
        ]);

        // Get current stock before update
        const currentProduct = await queryOne('SELECT stock_quantity FROM products WHERE id = $1', [item.product_id]);
        const previousStock = currentProduct ? currentProduct.stock_quantity : 0;
        const newStock = previousStock - item.quantity_pieces;

        // Update product stock
        await query(`
          UPDATE products 
          SET stock_quantity = stock_quantity - $1, updated_at = CURRENT_TIMESTAMP 
          WHERE id = $2
        `, [item.quantity_pieces, item.product_id]);

        // Create stock movement record
        await query(`
          INSERT INTO stock_movements (
            product_id, movement_type, quantity, previous_stock, new_stock, 
            reference_type, reference_id, customer_id, unit_price, total_amount, 
            notes, "user"
          ) 
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `, [
          item.product_id,
          'out', // Satış çıkış hareketi
          -item.quantity_pieces, // Negatif çünkü çıkış
          previousStock,
          newStock,
          'sale',
          saleResult.id,
          sale.customer_id,
          item.unit_price_per_desi,
          item.total_price,
          `Satış - ${item.quantity_pieces} adet`,
          'system'
        ]);
      }
    }

    // Müşteri bakiyesini güncelle (satış tutarı kadar artır) - Para birimine göre
    const currency = sale.currency || 'TRY';
    if (currency === 'USD') {
      await query(`
        UPDATE customers 
        SET balance_usd = balance_usd + $1, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $2
      `, [sale.total_amount, sale.customer_id]);
    } else if (currency === 'EUR') {
      await query(`
        UPDATE customers 
        SET balance_eur = balance_eur + $1, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $2
      `, [sale.total_amount, sale.customer_id]);
    } else {
      await query(`
        UPDATE customers 
        SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $2
      `, [sale.total_amount, sale.customer_id]);
    }

    // Commit transaction
    await query('COMMIT');

    return { success: true, data: saleResult };
  } catch (error) {
    // Rollback transaction
    await query('ROLLBACK');
    return { success: false, error: error.message };
  }
});

// Sales delete handler
ipcMain.handle('sales:delete', async (_, saleId) => {
  try {
    // Start transaction
    await query('BEGIN');

    // Önce satış bilgilerini al
    const sale = await queryOne('SELECT * FROM sales WHERE id = $1', [saleId]);
    if (!sale) {
      await query('ROLLBACK');
      return { success: false, error: 'Satış bulunamadı' };
    }

    // Satış kalemlerini al
    const saleItems = await queryAll('SELECT * FROM sale_items WHERE sale_id = $1', [saleId]);

    // Her ürün için stok geri ekle
    for (const item of saleItems) {
      await query(`
        UPDATE products 
        SET stock_quantity = stock_quantity + $1, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $2
      `, [item.quantity_pieces, item.product_id]);
    }

    // Satış kalemlerini sil
    await query('DELETE FROM sale_items WHERE sale_id = $1', [saleId]);

    // Satışı sil
    await query('DELETE FROM sales WHERE id = $1', [saleId]);

    // Müşteri bakiyesini geri azalt (satış iptal edildiği için) - Para birimine göre
    const currency = sale.currency || 'TRY';
    if (currency === 'USD') {
      await query(`
        UPDATE customers 
        SET balance_usd = balance_usd - $1, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $2
      `, [sale.total_amount, sale.customer_id]);
    } else if (currency === 'EUR') {
      await query(`
        UPDATE customers 
        SET balance_eur = balance_eur - $1, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $2
      `, [sale.total_amount, sale.customer_id]);
    } else {
      await query(`
        UPDATE customers 
        SET balance = balance - $1, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $2
      `, [sale.total_amount, sale.customer_id]);
    }

    // Commit transaction
    await query('COMMIT');

    return { success: true };
  } catch (error) {
    // Rollback transaction
    await query('ROLLBACK');
    return { success: false, error: error.message };
  }
});

// Customer payments handlers
ipcMain.handle('customer-payments:get-all', async () => {
  try {
    const result = await queryAll(`
      SELECT 
        cp.*,
        c.name as customer_name,
        c.type as customer_type
      FROM customer_payments cp
      LEFT JOIN customers c ON cp.customer_id = c.id
      WHERE c.type = 'customer' OR c.type IS NULL
      ORDER BY cp.created_at DESC
    `);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('customer-payments:get-by-customer', async (_, customerId) => {
  try {
    const result = await queryAll('SELECT * FROM customer_payments WHERE customer_id = $1 ORDER BY created_at DESC', [customerId]);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('customer-payments:create', async (_, payment) => {
  try {
    // Start transaction
    await query('BEGIN');

    // Create payment record
    const paymentResult = await queryOne(`
      INSERT INTO customer_payments (customer_id, amount, currency, payment_type, payment_date, notes) 
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      payment.customer_id,
      payment.amount,
      payment.currency || 'TRY',
      payment.payment_type || 'cash',
      payment.payment_date || new Date(),
      payment.notes || null
    ]);

    // Update customer balance - Para birimine göre
    const currency = payment.currency || 'TRY';
    if (currency === 'USD') {
      await query(`
        UPDATE customers 
        SET balance_usd = balance_usd - $1, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $2
      `, [payment.amount, payment.customer_id]);
    } else if (currency === 'EUR') {
      await query(`
        UPDATE customers 
        SET balance_eur = balance_eur - $1, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $2
      `, [payment.amount, payment.customer_id]);
    } else {
      await query(`
        UPDATE customers 
        SET balance = balance - $1, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $2
      `, [payment.amount, payment.customer_id]);
    }

    // Commit transaction
    await query('COMMIT');

    return { success: true, data: paymentResult };
  } catch (error) {
    // Rollback transaction
    await query('ROLLBACK');
    return { success: false, error: error.message };
  }
});

ipcMain.handle('customer-payments:delete', async (_, id) => {
  try {
    // Start transaction
    await query('BEGIN');

    // Önce ödeme bilgilerini al
    const payment = await queryOne('SELECT * FROM customer_payments WHERE id = $1', [id]);

    if (!payment) {
      await query('ROLLBACK');
      return { success: false, error: 'Ödeme bulunamadı' };
    }

    // Ödemeyi sil
    await query('DELETE FROM customer_payments WHERE id = $1', [id]);

    // Müşteri bakiyesini geri artır (ödeme iptal edildiği için) - Para birimine göre
    const currency = payment.currency || 'TRY';
    if (currency === 'USD') {
      await query(`
        UPDATE customers 
        SET balance_usd = balance_usd + $1, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $2
      `, [payment.amount, payment.customer_id]);
    } else if (currency === 'EUR') {
      await query(`
        UPDATE customers 
        SET balance_eur = balance_eur + $1, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $2
      `, [payment.amount, payment.customer_id]);
    } else {
      await query(`
        UPDATE customers 
        SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $2
      `, [payment.amount, payment.customer_id]);
    }

    // Commit transaction
    await query('COMMIT');

    return { success: true };
  } catch (error) {
    // Rollback transaction
    await query('ROLLBACK');
    return { success: false, error: error.message };
  }
});

ipcMain.handle('customers:update-balance', async (_, customerId, newBalance) => {
  try {
    const result = await queryOne(`
      UPDATE customers 
      SET balance = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2
      RETURNING *
    `, [newBalance, customerId]);

    if (!result) {
      return { success: false, error: 'Müşteri bulunamadı' };
    }

    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Employee payments handlers
ipcMain.handle('employee-payments:get-by-employee', async (_, employeeId, page = 1, limit = 10) => {
  try {
    // Validate pagination parameters
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit) || 10));
    const offset = (pageNum - 1) * limitNum;

    // Get payments with pagination
    const result = await queryAll(`
      SELECT * FROM employee_payments 
      WHERE employee_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2 OFFSET $3
    `, [employeeId, limitNum, offset]);

    // Get total count
    const countResult = await queryOne(`
      SELECT COUNT(*) as total FROM employee_payments WHERE employee_id = $1
    `, [employeeId]);

    // Get currency totals
    const totalsResult = await queryAll(`
      SELECT 
        currency,
        SUM(amount) as total_amount
      FROM employee_payments 
      WHERE employee_id = $1 
      GROUP BY currency
    `, [employeeId]);

    const totalCount = parseInt(countResult?.total || countResult?.count || 0);

    console.log('🔍 Backend - Employee Payments Query:', {
      employeeId,
      resultCount: result.length,
      countResult,
      totalCount,
      currencyTotals: totalsResult,
      samplePayment: result[0]
    });

    const response = {
      success: true,
      data: result || [],
      total: totalCount,
      page: pageNum,
      limit: limitNum,
      currencyTotals: totalsResult || []
    };

    console.log('📤 Backend Response:', response);

    return response;
  } catch (error) {
    return {
      success: false,
      data: [],
      total: 0,
      page: page || 1,
      limit: limit || 10,
      currencyTotals: [],
      error: error.message
    };
  }
});

ipcMain.handle('employee-payments:create', async (_, payment) => {
  try {
    const result = await queryOne(`
      INSERT INTO employee_payments (employee_id, amount, currency, payment_type, payment_date, notes) 
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      payment.employee_id,
      payment.amount,
      payment.currency || 'USD',
      payment.payment_type || 'salary',
      payment.payment_date || new Date(),
      payment.notes || null
    ]);

    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('employee-payments:delete', async (_, id) => {
  try {
    const result = await query('DELETE FROM employee_payments WHERE id = $1', [id]);

    if (result.rowCount === 0) {
      return { success: false, error: 'Ödeme bulunamadı' };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Categories create handler
ipcMain.handle('categories:create', async (_, category) => {
  try {
    const result = await queryOne(`
      INSERT INTO categories (name, description) 
      VALUES ($1, $2)
      RETURNING *
    `, [category.name, category.description || null]);

    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Colors create handler
ipcMain.handle('colors:create', async (_, color) => {
  try {
    const result = await queryOne(`
      INSERT INTO colors (name, hex_code) 
      VALUES ($1, $2)
      RETURNING *
    `, [color.name, color.hex_code || null]);

    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Settings handlers
ipcMain.handle('settings:get', async (_, key) => {
  try {
    const result = await queryOne('SELECT * FROM settings WHERE key = $1', [key]);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('settings:set', async (_, key, value) => {
  try {
    const result = await queryOne(`
      INSERT INTO settings (key, value, updated_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP)
      ON CONFLICT (key) 
      DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [key, value]);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('settings:getPassword', async () => {
  try {
    const result = await queryOne('SELECT value FROM settings WHERE key = $1', ['app_password']);
    return { success: true, data: result?.value || 'admin123' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('settings:setPassword', async (_, password) => {
  try {
    await queryOne(`
      INSERT INTO settings (key, value, updated_at)
      VALUES ('app_password', $1, CURRENT_TIMESTAMP)
      ON CONFLICT (key) 
      DO UPDATE SET value = $1, updated_at = CURRENT_TIMESTAMP
    `, [password]);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Returns handler
ipcMain.handle('returns:create', async (_, returnData) => {
  try {
    // Start transaction
    await query('BEGIN');

    // Create return record
    const returnResult = await queryOne(`
      INSERT INTO returns (
        sale_id, customer_id, product_id, quantity, unit_price, 
        total_amount, return_date, notes
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      returnData.sale_id,
      returnData.customer_id,
      returnData.product_id,
      returnData.quantity,
      returnData.unit_price,
      returnData.total_amount,
      returnData.return_date || new Date(),
      returnData.notes || null
    ]);

    // Update product stock (add back returned quantity)
    await query(`
      UPDATE products 
      SET stock_quantity = stock_quantity + $1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2
    `, [returnData.quantity, returnData.product_id]);

    // Commit transaction
    await query('COMMIT');

    return { success: true, data: returnResult };
  } catch (error) {
    // Rollback transaction
    await query('ROLLBACK');
    return { success: false, error: error.message };
  }
});

// Additional Cash handlers
ipcMain.handle('cash:create', async (_, transaction) => {
  try {
    const result = await queryOne(`
      INSERT INTO cash_transactions (
        type, amount, currency, category, description, 
        reference_type, reference_id, customer_id, "user"
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      transaction.type,
      transaction.amount,
      transaction.currency || 'TRY',
      transaction.category,
      transaction.description,
      transaction.reference_type || null,
      transaction.reference_id || null,
      transaction.customer_id || null,
      transaction.user || 'system'
    ]);

    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('cash:update', async (_, id, transaction) => {
  try {
    const result = await queryOne(`
      UPDATE cash_transactions 
      SET type = $1, amount = $2, currency = $3, category = $4, description = $5, 
          reference_type = $6, reference_id = $7, customer_id = $8, "user" = $9
      WHERE id = $10
      RETURNING *
    `, [
      transaction.type,
      transaction.amount,
      transaction.currency || 'TRY',
      transaction.category,
      transaction.description,
      transaction.reference_type || null,
      transaction.reference_id || null,
      transaction.customer_id || null,
      transaction.user || 'system',
      id
    ]);

    if (!result) {
      return { success: false, error: 'İşlem bulunamadı' };
    }

    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('cash:delete', async (_, id) => {
  try {
    const result = await query('DELETE FROM cash_transactions WHERE id = $1', [id]);

    if (result.rowCount === 0) {
      return { success: false, error: 'İşlem bulunamadı' };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Additional Purchase handlers
ipcMain.handle('purchases:get-by-id', async (_, id) => {
  try {
    const result = await queryOne(`
      SELECT p.*, c.name as supplier_name 
      FROM purchases p 
      LEFT JOIN customers c ON p.supplier_id = c.id 
      WHERE p.id = $1
    `, [id]);

    if (!result) {
      return { success: false, error: 'Alım bulunamadı' };
    }

    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('purchases:create', async (_, purchase) => {
  try {
    // Start transaction
    await query('BEGIN');

    // Create purchase record
    const purchaseResult = await queryOne(`
      INSERT INTO purchases (supplier_id, total_amount, currency, purchase_date, notes, status) 
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      purchase.supplier_id,
      purchase.total_amount,
      purchase.currency || 'TRY',
      purchase.purchase_date || new Date(),
      purchase.notes || null,
      purchase.status || 'completed'
    ]);

    // Create purchase items
    if (purchase.items && purchase.items.length > 0) {
      for (const item of purchase.items) {
        console.log('Processing purchase item:', {
          product_id: item.product_id,
          brand_from_item: item.brand,
          brand_type: typeof item.brand,
          brand_length: item.brand?.length
        });

        // Get brand from item or materials table
        // Check for both null/undefined and empty string
        let brand = (item.brand && item.brand.trim()) ? item.brand.trim() : null;

        // If brand not provided in item, get from materials table
        if (!brand) {
          const materialInfo = await queryOne(`SELECT brand FROM materials WHERE id = $1`, [item.product_id]);
          brand = materialInfo?.brand || null;
          console.log('Brand from materials table:', brand);
        }

        console.log('Final brand value to insert:', brand);

        await query(`
          INSERT INTO purchase_items (
            purchase_id, product_id, quantity, unit_price, total_price, brand
          ) 
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          purchaseResult.id,
          item.product_id,
          item.quantity,
          item.unit_price,
          item.total_price,
          brand
        ]);

        // Check if it's a material or product and update accordingly
        // First try materials table
        const materialCheck = await query(`SELECT id, name, stock_quantity FROM materials WHERE id = $1`, [item.product_id]);

        let previousStock = 0;
        let newStock = 0;
        let productName = '';

        if (materialCheck.rows.length > 0) {
          // Update material stock
          previousStock = materialCheck.rows[0].stock_quantity || 0;
          newStock = previousStock + item.quantity;
          productName = materialCheck.rows[0].name || 'Bilinmeyen Malzeme';

          await query(`
            UPDATE materials 
            SET stock_quantity = stock_quantity + $1, updated_at = CURRENT_TIMESTAMP 
            WHERE id = $2
          `, [item.quantity, item.product_id]);
        } else {
          // Update product stock
          const productCheck = await query(`SELECT name, stock_quantity FROM products WHERE id = $1`, [item.product_id]);
          previousStock = productCheck.rows[0]?.stock_quantity || 0;
          newStock = previousStock + item.quantity;
          productName = productCheck.rows[0]?.name || 'Bilinmeyen Ürün';

          await query(`
            UPDATE products 
            SET stock_quantity = stock_quantity + $1, updated_at = CURRENT_TIMESTAMP 
            WHERE id = $2
          `, [item.quantity, item.product_id]);
        }

        // Get supplier name
        const supplier = await queryOne(`SELECT name FROM customers WHERE id = $1`, [purchase.supplier_id]);
        const supplierName = supplier?.name || 'Bilinmeyen Tedarikçi';

        // Create stock movement record
        await query(`
          INSERT INTO stock_movements (
            product_id, movement_type, quantity, previous_stock, new_stock, 
            reference_type, reference_id, unit_price, total_amount, notes, "user"
          ) 
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `, [
          item.product_id,
          'in',
          item.quantity,
          previousStock,
          newStock,
          'purchase',
          purchaseResult.id,
          item.unit_price,
          item.total_price,
          `Alım - ${productName} - Tedarikçi: ${supplierName}`,
          'Sistem'
        ]);
      }
    }

    // Commit transaction
    await query('COMMIT');

    return { success: true, data: purchaseResult };
  } catch (error) {
    // Rollback transaction
    await query('ROLLBACK');
    return { success: false, error: error.message };
  }
});

ipcMain.handle('purchases:delete', async (_, id) => {
  try {
    // Start transaction
    await query('BEGIN');

    // Önce alım bilgilerini al (bakiye güncellemesi için)
    const purchase = await queryOne('SELECT supplier_id, total_amount, currency FROM purchases WHERE id = $1', [id]);

    if (!purchase) {
      await query('ROLLBACK');
      return { success: false, error: 'Alım bulunamadı' };
    }

    // Alımı sil (CASCADE ile purchase_items de silinir)
    await query('DELETE FROM purchases WHERE id = $1', [id]);

    // Tedarikçi bakiyesini güncelle (alım tutarını çıkar)
    const currency = purchase.currency || 'TRY';
    const amount = parseFloat(purchase.total_amount) || 0;

    if (currency === 'USD') {
      await query(`
        UPDATE customers 
        SET balance_usd = balance_usd - $1, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $2
      `, [amount, purchase.supplier_id]);
    } else if (currency === 'EUR') {
      await query(`
        UPDATE customers 
        SET balance_eur = balance_eur - $1, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $2
      `, [amount, purchase.supplier_id]);
    } else {
      await query(`
        UPDATE customers 
        SET balance = balance - $1, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $2
      `, [amount, purchase.supplier_id]);
    }

    // Commit transaction
    await query('COMMIT');

    return { success: true };
  } catch (error) {
    // Rollback transaction
    await query('ROLLBACK');
    return { success: false, error: error.message };
  }
});

// Purchase by ID handler (alternative name)
ipcMain.handle('purchases:getById', async (event, purchaseId) => {
  try {
    const queryText = `
      SELECT 
        p.*,
        c.name as supplier_name,
        pi.product_id,
        pi.quantity,
        pi.unit_price,
        pi.total_price,
        pi.brand as purchase_brand,
        m.name as material_name,
        m.category,
        m.color_shade,
        m.brand as material_brand,
        m.code
      FROM purchases p
      LEFT JOIN customers c ON p.supplier_id = c.id
      LEFT JOIN purchase_items pi ON p.id = pi.purchase_id
      LEFT JOIN materials m ON pi.product_id = m.id
      WHERE p.id = $1
    `;

    const purchaseDetailsRows = await queryAll(queryText, [purchaseId]);

    if (!purchaseDetailsRows || purchaseDetailsRows.length === 0) {
      return { success: false, error: 'Alım bulunamadı' };
    }

    const firstRow = purchaseDetailsRows[0];

    if (!firstRow) {
      return { success: false, error: 'Alım verisi bulunamadı' };
    }

    const formattedPurchase = {
      id: firstRow?.id || null,
      supplierId: firstRow?.supplier_id || null,
      supplierName: firstRow?.supplier_name || 'Bilinmeyen Tedarikçi',
      currency: firstRow?.currency || 'TRY',
      total: firstRow?.total_amount || 0,
      date: firstRow?.purchase_date || null,
      notes: firstRow?.notes || '',

      items: purchaseDetailsRows.map(row => ({
        productId: row.product_id,
        productName: row.material_name || `${row.category || 'Bilinmiyor'}${row.color_shade ? ' - ' + row.color_shade : ''}${row.code ? ' - ' + row.code : ''}${row.material_brand ? ' (' + row.material_brand + ')' : ''}`,
        quantity: row.quantity,
        unitPrice: row.unit_price,
        total: row.total_price,
        brand: row.purchase_brand || row.material_brand || null
      })).filter(item => item.productId)
    };

    return { success: true, data: formattedPurchase };
  } catch (error) {
    console.error('Error processing purchase data:', error);
    return { success: false, error: error.message || 'Veri işleme hatası' };
  }
});