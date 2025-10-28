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

    // Products table
    await query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        color VARCHAR(50),
        stock_quantity INTEGER DEFAULT 0,
        unit VARCHAR(20) DEFAULT 'adet',
        description TEXT,
        type VARCHAR(20) DEFAULT 'product' CHECK (type IN ('product', 'material')),
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

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
    const result = await queryOne(`
      UPDATE customers 
      SET name = $1, email = $2, phone = $3, address = $4, balance = $5, type = $6, updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `, [
      customer.name,
      customer.email || null,
      customer.phone || null,
      customer.address || null,
      customer.balance || 0,
      customer.type || 'customer',
      id
    ]);

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
    const result = await query('DELETE FROM customers WHERE id = $1', [id]);

    if (result.rowCount === 0) {
      return { success: false, error: 'Müşteri bulunamadı' };
    }

    return { success: true };
  } catch (error) {
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
    show: false,
    fullscreen: true
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

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });
}

app.whenReady().then(async () => {
  try {
    db = await initializeDatabase();
    await createTables();
    createWindow();
  } catch (error) {
    console.error('Failed to initialize database:', error);
    app.quit();
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
      INSERT INTO products (name, category, color, stock_quantity, unit, description, type) 
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      product.name,
      product.category,
      product.color || null,
      product.stock_quantity || 0,
      product.unit || 'adet',
      product.description || null,
      product.type || 'product'
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
    if (startDate && endDate) {
      queryText += ' WHERE s.sale_date BETWEEN $1 AND $2';
      params.push(startDate, endDate);
    }

    queryText += ' ORDER BY s.created_at DESC';

    const result = await queryAll(queryText, params);
    return { success: true, data: result };
  } catch (error) {
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
        total: row.total_price
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
      SET name = $1, category = $2, color = $3, stock_quantity = $4, unit = $5, description = $6, type = $7, updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *
    `, [
      product.name,
      product.category,
      product.color || null,
      product.stock_quantity || 0,
      product.unit || 'adet',
      product.description || null,
      product.type || 'product',
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
            unit_price_per_desi, total_price
          ) 
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          saleResult.id,
          item.product_id,
          item.quantity_pieces,
          item.quantity_desi,
          item.unit_price_per_desi,
          item.total_price
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

// Customer payments handlers
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
        await query(`
          INSERT INTO purchase_items (
            purchase_id, product_id, quantity, unit_price, total_price
          ) 
          VALUES ($1, $2, $3, $4, $5)
        `, [
          purchaseResult.id,
          item.product_id,
          item.quantity,
          item.unit_price,
          item.total_price
        ]);

        // Update product stock
        await query(`
          UPDATE products 
          SET stock_quantity = stock_quantity + $1, updated_at = CURRENT_TIMESTAMP 
          WHERE id = $2
        `, [item.quantity, item.product_id]);
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
    const result = await query('DELETE FROM purchases WHERE id = $1', [id]);

    if (result.rowCount === 0) {
      return { success: false, error: 'Alım bulunamadı' };
    }

    return { success: true };
  } catch (error) {
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
        pr.category,
        pr.color
      FROM purchases p
      LEFT JOIN customers c ON p.supplier_id = c.id
      LEFT JOIN purchase_items pi ON p.id = pi.purchase_id
      LEFT JOIN products pr ON pi.product_id = pr.id
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

      items: purchaseDetailsRows.map(row => ({
        productId: row.product_id,
        productName: `${row.category || 'Bilinmiyor'} - ${row.color || 'Bilinmiyor'}`,
        quantity: row.quantity,
        unitPrice: row.unit_price,
        total: row.total_price
      })).filter(item => item.productId)
    };

    return { success: true, data: formattedPurchase };
  } catch (error) {
    console.error('Error processing purchase data:', error);
    return { success: false, error: error.message || 'Veri işleme hatası' };
  }
});