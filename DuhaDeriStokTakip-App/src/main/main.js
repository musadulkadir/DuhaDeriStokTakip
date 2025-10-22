const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const sqlite3 = require('sqlite3').verbose();

// Environment detection
const isDev = process.env.NODE_ENV === 'development';

// Database setup
const userDataPath = path.join(os.homedir(), 'DuhaDeriStokTakip-Data');
if (!fs.existsSync(userDataPath)) {
  fs.mkdirSync(userDataPath, { recursive: true });
}

const dbPath = path.join(userDataPath, 'duha_deri.db');
let db;

console.log('Database path:', dbPath);

// Initialize database connection
function initializeDatabase() {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Database connection error:', err);
        reject(err);
      } else {
        console.log('Connected to SQLite database');
        resolve(db);
      }
    });
  });
}

// Create database tables
function createTables() {
  return new Promise((resolve, reject) => {
    try {
      // Customers table
      db.run(`
        CREATE TABLE IF NOT EXISTS customers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT,
          phone TEXT,
          address TEXT,
          balance REAL DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Products table
      db.run(`
        CREATE TABLE IF NOT EXISTS products (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          category TEXT NOT NULL,
          color TEXT,
          stock_quantity INTEGER DEFAULT 0,
          unit TEXT DEFAULT 'adet',
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Employees table
      db.run(`
        CREATE TABLE IF NOT EXISTS employees (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT,
          phone TEXT,
          position TEXT,
          salary REAL DEFAULT 0,
          salary_currency TEXT DEFAULT 'USD',
          balance REAL DEFAULT 0,
          hire_date DATETIME DEFAULT CURRENT_TIMESTAMP,
          status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Sales table
      db.run(`
        CREATE TABLE IF NOT EXISTS sales (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          customer_id INTEGER REFERENCES customers(id),
          total_amount REAL NOT NULL,
          payment_status TEXT DEFAULT 'pending',
          sale_date DATETIME DEFAULT CURRENT_TIMESTAMP,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Sale items table
      db.run(`
        CREATE TABLE IF NOT EXISTS sale_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sale_id INTEGER REFERENCES sales(id) ON DELETE CASCADE,
          product_id INTEGER REFERENCES products(id),
          quantity_pieces INTEGER NOT NULL,
          quantity_desi REAL NOT NULL,
          unit_price_per_desi REAL NOT NULL,
          total_price REAL NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Stock movements table
      db.run(`
        CREATE TABLE IF NOT EXISTS stock_movements (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          product_id INTEGER REFERENCES products(id),
          movement_type TEXT NOT NULL,
          quantity INTEGER NOT NULL,
          previous_stock INTEGER,
          new_stock INTEGER,
          reference_type TEXT,
          reference_id INTEGER,
          customer_id INTEGER,
          unit_price REAL,
          total_amount REAL,
          notes TEXT,
          user TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Customer payments table
      db.run(`
        CREATE TABLE IF NOT EXISTS customer_payments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          customer_id INTEGER REFERENCES customers(id),
          amount REAL NOT NULL,
          payment_type TEXT DEFAULT 'cash',
          payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Cash transactions table
      db.run(`
        CREATE TABLE IF NOT EXISTS cash_transactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          type TEXT NOT NULL CHECK (type IN ('in', 'out')),
          amount REAL NOT NULL,
          currency TEXT DEFAULT 'USD',
          category TEXT NOT NULL,
          description TEXT NOT NULL,
          reference_type TEXT,
          reference_id INTEGER,
          customer_id INTEGER REFERENCES customers(id),
          user TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Employee payments table
      db.run(`
        CREATE TABLE IF NOT EXISTS employee_payments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          employee_id INTEGER REFERENCES employees(id),
          amount REAL NOT NULL,
          currency TEXT DEFAULT 'USD',
          payment_type TEXT DEFAULT 'salary',
          payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Categories table (Dericilik kategorileri)
      db.run(`
        CREATE TABLE IF NOT EXISTS categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Colors table (Deri renkleri)
      db.run(`
        CREATE TABLE IF NOT EXISTS colors (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          hex_code TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Returns table (İade işlemleri)
      db.run(`
        CREATE TABLE IF NOT EXISTS returns (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sale_id INTEGER REFERENCES sales(id),
          customer_id INTEGER REFERENCES customers(id),
          product_id INTEGER REFERENCES products(id),
          quantity REAL NOT NULL,
          unit_price REAL NOT NULL,
          total_amount REAL NOT NULL,
          return_date DATETIME DEFAULT CURRENT_TIMESTAMP,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Ön tanımlı kategorileri ekle
      const defaultCategories = [
        'Keçi', 'Koyun', 'Oğlak', 'Dana'
      ];
      
      defaultCategories.forEach(category => {
        db.run('INSERT OR IGNORE INTO categories (name) VALUES (?)', [category]);
      });

      // Ön tanımlı renkleri ekle
      const defaultColors = [
        { name: 'Siyah', hex: '#000000' },
        { name: 'Bej', hex: '#F5F5DC' },
        { name: 'Beyaz', hex: '#FFFFFF' },
        { name: 'Kahverengi', hex: '#8B4513' },
        { name: 'Kırmızı', hex: '#FF0000' },
        { name: 'Bordo', hex: '#800020' },
        { name: 'Taba', hex: '#D2B48C' }
      ];
      
      defaultColors.forEach(color => {
        db.run('INSERT OR IGNORE INTO colors (name, hex_code) VALUES (?, ?)', [color.name, color.hex]);
      });

      console.log('Database tables created successfully');
      resolve();
    } catch (error) {
      console.error('Table creation error:', error);
      reject(error);
    }
  });
}

// Database API handlers (converted to async/await pattern)
ipcMain.handle('db:test-connection', async () => {
  return new Promise((resolve) => {
    db.get('SELECT 1', (err) => {
      resolve(!err);
    });
  });
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
  return new Promise((resolve) => {
    const offset = (page - 1) * limit;
    
    db.all('SELECT * FROM customers ORDER BY created_at DESC LIMIT ? OFFSET ?', [limit, offset], (err, rows) => {
      if (err) {
        resolve({
          success: false,
          data: [],
          total: 0,
          page,
          limit,
          error: err.message
        });
      } else {
        db.get('SELECT COUNT(*) as count FROM customers', (countErr, countResult) => {
          resolve({
            success: true,
            data: rows,
            total: countResult ? countResult.count : 0,
            page,
            limit
          });
        });
      }
    });
  });
});

ipcMain.handle('customers:get-by-id', async (_, id) => {
  return new Promise((resolve) => {
    db.get('SELECT * FROM customers WHERE id = ?', [id], (err, row) => {
      if (err) {
        resolve({ success: false, error: err.message });
      } else if (!row) {
        resolve({ success: false, error: 'Müşteri bulunamadı' });
      } else {
        resolve({ success: true, data: row });
      }
    });
  });
});

ipcMain.handle('customers:create', async (_, customer) => {
  return new Promise((resolve) => {
    const stmt = db.prepare(`
      INSERT INTO customers (name, email, phone, address, balance) 
      VALUES (?, ?, ?, ?, ?)
    `);
    
    stmt.run([
      customer.name,
      customer.email || null,
      customer.phone || null,
      customer.address || null,
      customer.balance || 0
    ], function(err) {
      if (err) {
        resolve({ success: false, error: err.message });
      } else {
        db.get('SELECT * FROM customers WHERE id = ?', [this.lastID], (selectErr, newCustomer) => {
          if (selectErr) {
            resolve({ success: false, error: selectErr.message });
          } else {
            resolve({ success: true, data: newCustomer });
          }
        });
      }
    });
    
    stmt.finalize();
  });
});

ipcMain.handle('customers:update', async (_, id, customer) => {
  return new Promise((resolve) => {
    const stmt = db.prepare(`
      UPDATE customers 
      SET name = ?, email = ?, phone = ?, address = ?, balance = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    
    stmt.run([
      customer.name,
      customer.email || null,
      customer.phone || null,
      customer.address || null,
      customer.balance || 0,
      id
    ], function(err) {
      if (err) {
        resolve({ success: false, error: err.message });
      } else if (this.changes === 0) {
        resolve({ success: false, error: 'Müşteri bulunamadı' });
      } else {
        db.get('SELECT * FROM customers WHERE id = ?', [id], (selectErr, updatedCustomer) => {
          if (selectErr) {
            resolve({ success: false, error: selectErr.message });
          } else {
            resolve({ success: true, data: updatedCustomer });
          }
        });
      }
    });
    
    stmt.finalize();
  });
});

ipcMain.handle('customers:delete', async (_, id) => {
  return new Promise((resolve) => {
    const stmt = db.prepare('DELETE FROM customers WHERE id = ?');
    
    stmt.run([id], function(err) {
      if (err) {
        resolve({ success: false, error: err.message });
      } else if (this.changes === 0) {
        resolve({ success: false, error: 'Müşteri bulunamadı' });
      } else {
        resolve({ success: true, data: true });
      }
    });
    
    stmt.finalize();
  });
});

// Product handlers
ipcMain.handle('products:get-all', async (_, page = 1, limit = 50) => {
  return new Promise((resolve) => {
    const offset = (page - 1) * limit;
    
    db.all('SELECT * FROM products ORDER BY created_at DESC LIMIT ? OFFSET ?', [limit, offset], (err, rows) => {
      if (err) {
        resolve({
          success: false,
          data: [],
          total: 0,
          page,
          limit,
          error: err.message
        });
      } else {
        db.get('SELECT COUNT(*) as count FROM products', (countErr, countResult) => {
          resolve({
            success: true,
            data: rows,
            total: countResult ? countResult.count : 0,
            page,
            limit
          });
        });
      }
    });
  });
});

ipcMain.handle('products:get-by-id', async (_, id) => {
  return new Promise((resolve) => {
    db.get('SELECT * FROM products WHERE id = ?', [id], (err, row) => {
      if (err) {
        resolve({ success: false, error: err.message });
      } else if (!row) {
        resolve({ success: false, error: 'Ürün bulunamadı' });
      } else {
        resolve({ success: true, data: row });
      }
    });
  });
});

ipcMain.handle('products:create', async (_, product) => {
  return new Promise((resolve) => {
    console.log('Creating product:', product);
    const stmt = db.prepare(`
      INSERT INTO products (name, category, color, stock_quantity, unit, description) 
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run([
      product.name,
      product.category,
      product.color || null,
      product.stock_quantity || 0,
      'desi',
      product.description || null
    ], function(err) {
      if (err) {
        console.error('Product creation error:', err);
        resolve({ success: false, error: err.message });
      } else {
        db.get('SELECT * FROM products WHERE id = ?', [this.lastID], (selectErr, newProduct) => {
          if (selectErr) {
            resolve({ success: false, error: selectErr.message });
          } else {
            resolve({ success: true, data: newProduct });
          }
        });
      }
    });
    
    stmt.finalize();
  });
});

ipcMain.handle('products:update', async (_, id, product) => {
  return new Promise((resolve) => {
    const stmt = db.prepare(`
      UPDATE products 
      SET name = ?, category = ?, color = ?, stock_quantity = ?, description = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    
    stmt.run([
      product.name,
      product.category,
      product.color || null,
      product.stock_quantity || 0,
      product.description || null,
      id
    ], function(err) {
      if (err) {
        resolve({ success: false, error: err.message });
      } else if (this.changes === 0) {
        resolve({ success: false, error: 'Ürün bulunamadı' });
      } else {
        db.get('SELECT * FROM products WHERE id = ?', [id], (selectErr, updatedProduct) => {
          if (selectErr) {
            resolve({ success: false, error: selectErr.message });
          } else {
            resolve({ success: true, data: updatedProduct });
          }
        });
      }
    });
    
    stmt.finalize();  
  });
});

ipcMain.handle('products:delete', async (_, id) => {
  return new Promise((resolve) => {
    const stmt = db.prepare('DELETE FROM products WHERE id = ?');
    
    stmt.run([id], function(err) {
      if (err) {
        resolve({ success: false, error: err.message });
      } else if (this.changes === 0) {
        resolve({ success: false, error: 'Ürün bulunamadı' });
      } else {
        resolve({ success: true, data: true });
      }
    });
    
    stmt.finalize();
  });
});

ipcMain.handle('products:update-stock', async (_, id, newStock) => {
  return new Promise((resolve) => {
    const stmt = db.prepare('UPDATE products SET stock_quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    
    stmt.run([newStock, id], function(err) {
      if (err) {
        resolve({ success: false, error: err.message });
      } else if (this.changes === 0) {
        resolve({ success: false, error: 'Ürün bulunamadı' });
      } else {
        db.get('SELECT * FROM products WHERE id = ?', [id], (selectErr, updatedProduct) => {
          if (selectErr) {
            resolve({ success: false, error: selectErr.message });
          } else {
            resolve({ success: true, data: updatedProduct });
          }
        });
      }
    });
    
    stmt.finalize();
  });
});

// Employee handlers
ipcMain.handle('employees:get-all', async (_, page = 1, limit = 50) => {
  return new Promise((resolve) => {
    const offset = (page - 1) * limit;
    
    db.all('SELECT * FROM employees ORDER BY created_at DESC LIMIT ? OFFSET ?', [limit, offset], (err, rows) => {
      if (err) {
        resolve({
          success: false,
          data: [],
          total: 0,
          page,
          limit,
          error: err.message
        });
      } else {
        db.get('SELECT COUNT(*) as count FROM employees', (countErr, countResult) => {
          resolve({
            success: true,
            data: rows,
            total: countResult ? countResult.count : 0,
            page,
            limit
          });
        });
      }
    });
  });
});

ipcMain.handle('employees:create', async (_, employee) => {
  return new Promise((resolve) => {
    console.log('Creating employee:', employee);
    const stmt = db.prepare(`
      INSERT INTO employees (name, email, phone, position, salary, salary_currency, balance, hire_date, status) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run([
      employee.name,
      employee.email || null,
      employee.phone || null,
      employee.position || null,
      employee.salary || 0,
      employee.salary_currency || 'USD',
      employee.balance || 0,
      employee.hire_date || new Date().toISOString(),
      employee.status || 'active'
    ], function(err) {
      if (err) {
        console.error('Employee creation error:', err);
        resolve({ success: false, error: err.message });
      } else {
        db.get('SELECT * FROM employees WHERE id = ?', [this.lastID], (selectErr, newEmployee) => {
          if (selectErr) {
            resolve({ success: false, error: selectErr.message });
          } else {
            resolve({ success: true, data: newEmployee });
          }
        });
      }
    });
    
    stmt.finalize();
  });
});

ipcMain.handle('employees:update', async (_, id, employee) => {
  return new Promise((resolve) => {
    const stmt = db.prepare(`
      UPDATE employees 
      SET name = ?, email = ?, phone = ?, position = ?, salary = ?, salary_currency = ?, balance = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    
    stmt.run([
      employee.name,
      employee.email || null,
      employee.phone || null,
      employee.position || null,
      employee.salary || 0,
      employee.salary_currency || 'USD',
      employee.balance || 0,
      employee.status || 'active',
      id
    ], function(err) {
      if (err) {
        resolve({ success: false, error: err.message });
      } else if (this.changes === 0) {
        resolve({ success: false, error: 'Çalışan bulunamadı' });
      } else {
        db.get('SELECT * FROM employees WHERE id = ?', [id], (selectErr, updatedEmployee) => {
          if (selectErr) {
            resolve({ success: false, error: selectErr.message });
          } else {
            resolve({ success: true, data: updatedEmployee });
          }
        });
      }
    });
    
    stmt.finalize();
  });
});

ipcMain.handle('employees:get-by-id', async (_, id) => {
  return new Promise((resolve) => {
    db.get('SELECT * FROM employees WHERE id = ?', [id], (err, row) => {
      if (err) {
        resolve({ success: false, error: err.message });
      } else if (!row) {
        resolve({ success: false, error: 'Çalışan bulunamadı' });
      } else {
        resolve({ success: true, data: row });
      }
    });
  });
});

ipcMain.handle('employees:delete', async (_, id) => {
  return new Promise((resolve) => {
    const stmt = db.prepare('DELETE FROM employees WHERE id = ?');
    
    stmt.run([id], function(err) {
      if (err) {
        resolve({ success: false, error: err.message });
      } else if (this.changes === 0) {
        resolve({ success: false, error: 'Çalışan bulunamadı' });
      } else {
        resolve({ success: true, data: true });
      }
    });
    
    stmt.finalize();
  });
});

// Stock movements handlers
ipcMain.handle('stock-movements:get-all', async () => {
  return new Promise((resolve) => {
    db.all('SELECT * FROM stock_movements ORDER BY created_at DESC', (err, rows) => {
      if (err) {
        resolve({ success: false, data: [], error: err.message });
      } else {
        resolve({ success: true, data: rows });
      }
    });
  });
});

ipcMain.handle('stock-movements:get-by-product', async (_, productId) => {
  return new Promise((resolve) => {
    db.all('SELECT * FROM stock_movements WHERE product_id = ? ORDER BY created_at DESC', [productId], (err, rows) => {
      if (err) {
        resolve({ success: false, data: [], error: err.message });
      } else {
        resolve({ success: true, data: rows });
      }
    });
  });
});

ipcMain.handle('stock-movements:create', async (_, movement) => {
  return new Promise((resolve) => {
    const stmt = db.prepare(`
      INSERT INTO stock_movements (product_id, movement_type, quantity, previous_stock, new_stock, reference_type, reference_id, customer_id, unit_price, total_amount, notes, user) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run([
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
      movement.user || 'System'
    ], function(err) {
      if (err) {
        resolve({ success: false, error: err.message });
      } else {
        db.get('SELECT * FROM stock_movements WHERE id = ?', [this.lastID], (selectErr, newMovement) => {
          if (selectErr) {
            resolve({ success: false, error: selectErr.message });
          } else {
            resolve({ success: true, data: newMovement });
          }
        });
      }
    });
    
    stmt.finalize();
  });
});

// Sales handlers
ipcMain.handle('sales:get-all', async () => {
  return new Promise((resolve) => {
    db.all('SELECT * FROM sales ORDER BY created_at DESC', (err, rows) => {
      if (err) {
        resolve({ success: false, data: [], error: err.message });
      } else {
        resolve({ success: true, data: rows });
      }
    });
  });
});

ipcMain.handle('sales:create', async (_, sale) => {
  return new Promise((resolve) => {
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      
      try {
        // Satış kaydı oluştur
        const saleStmt = db.prepare(`
          INSERT INTO sales (customer_id, total_amount, payment_status, sale_date, notes) 
          VALUES (?, ?, ?, ?, ?)
        `);
        
        saleStmt.run([
          sale.customer_id,
          sale.total_amount,
          sale.payment_status || 'pending',
          sale.sale_date || new Date().toISOString(),
          sale.notes || null
        ], function(saleErr) {
          if (saleErr) {
            db.run('ROLLBACK');
            resolve({ success: false, error: saleErr.message });
            return;
          }
          
          const saleId = this.lastID;
          
          // Satış detaylarını ekle ve stok güncelle
          let completedItems = 0;
          const totalItems = sale.items.length;
          
          if (totalItems === 0) {
            db.run('COMMIT');
            resolve({ success: true, data: { id: saleId, ...sale } });
            return;
          }
          
          sale.items.forEach((item) => {
            // Satış detayı ekle
            const itemStmt = db.prepare(`
              INSERT INTO sale_items (sale_id, product_id, quantity_pieces, quantity_desi, unit_price_per_desi, total_price) 
              VALUES (?, ?, ?, ?, ?, ?)
            `);
            
            itemStmt.run([
              saleId,
              item.product_id,
              item.quantity_pieces,
              item.quantity_desi,
              item.unit_price_per_desi,
              item.total_price
            ], function(itemErr) {
              if (itemErr) {
                db.run('ROLLBACK');
                resolve({ success: false, error: itemErr.message });
                return;
              }
              
              // Ürün stokunu güncelle (adet cinsinden düş)
              const updateStockStmt = db.prepare(`
                UPDATE products 
                SET stock_quantity = stock_quantity - ?, updated_at = CURRENT_TIMESTAMP 
                WHERE id = ?
              `);
              
              updateStockStmt.run([item.quantity_pieces, item.product_id], function(stockErr) {
                if (stockErr) {
                  db.run('ROLLBACK');
                  resolve({ success: false, error: stockErr.message });
                  return;
                }
                
                // Stok hareketi kaydet
                const movementStmt = db.prepare(`
                  INSERT INTO stock_movements (product_id, movement_type, quantity, reference_type, reference_id, customer_id, unit_price, total_amount, notes, user) 
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `);
                
                movementStmt.run([
                  item.product_id,
                  'out',
                  item.quantity_pieces,
                  'sale',
                  saleId,
                  sale.customer_id,
                  item.unit_price_per_desi,
                  item.total_price,
                  `Satış - ${item.quantity_pieces} adet (${item.quantity_desi} desi) - ${sale.notes || ''}`,
                  'System'
                ], function(movementErr) {
                  if (movementErr) {
                    db.run('ROLLBACK');
                    resolve({ success: false, error: movementErr.message });
                    return;
                  }
                  
                  completedItems++;
                  if (completedItems === totalItems) {
                    db.run('COMMIT');
                    resolve({ success: true, data: { id: saleId, ...sale } });
                  }
                });
                
                movementStmt.finalize();
              });
              
              updateStockStmt.finalize();
            });
            
            itemStmt.finalize();
          });
        });
        
        saleStmt.finalize();
      } catch (error) {
        db.run('ROLLBACK');
        resolve({ success: false, error: error.message });
      }
    });
  });
});

// Customer payments handlers
ipcMain.handle('customer-payments:get-by-customer', async (_, customerId) => {
  return new Promise((resolve) => {
    db.all('SELECT * FROM customer_payments WHERE customer_id = ? ORDER BY created_at DESC', [customerId], (err, rows) => {
      if (err) {
        resolve({ success: false, data: [], error: err.message });
      } else {
        resolve({ success: true, data: rows });
      }
    });
  });
});

ipcMain.handle('customer-payments:create', async (_, payment) => {
  return new Promise((resolve) => {
    const stmt = db.prepare(`
      INSERT INTO customer_payments (customer_id, amount, payment_type, payment_date, notes) 
      VALUES (?, ?, ?, ?, ?)
    `);
    
    stmt.run([
      payment.customer_id,
      payment.amount,
      payment.payment_type || 'cash',
      payment.payment_date || new Date().toISOString(),
      payment.notes || null
    ], function(err) {
      if (err) {
        resolve({ success: false, error: err.message });
      } else {
        db.get('SELECT * FROM customer_payments WHERE id = ?', [this.lastID], (selectErr, newPayment) => {
          if (selectErr) {
            resolve({ success: false, error: selectErr.message });
          } else {
            resolve({ success: true, data: newPayment });
          }
        });
      }
    });
    
    stmt.finalize();
  });
});

ipcMain.handle('customer-payments:delete', async (_, id) => {
  return new Promise((resolve) => {
    const stmt = db.prepare('DELETE FROM customer_payments WHERE id = ?');
    
    stmt.run([id], function(err) {
      if (err) {
        resolve({ success: false, error: err.message });
      } else if (this.changes === 0) {
        resolve({ success: false, error: 'Ödeme kaydı bulunamadı' });
      } else {
        resolve({ success: true, data: true });
      }
    });
    
    stmt.finalize();
  });
});

// Customer balance update
ipcMain.handle('customers:update-balance', async (_, customerId, newBalance) => {
  return new Promise((resolve) => {
    const stmt = db.prepare('UPDATE customers SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    
    stmt.run([newBalance, customerId], function(err) {
      if (err) {
        resolve({ success: false, error: err.message });
      } else if (this.changes === 0) {
        resolve({ success: false, error: 'Müşteri bulunamadı' });
      } else {
        resolve({ success: true, data: { id: customerId, balance: newBalance } });
      }
    });
    
    stmt.finalize();
  });
});

// Employee payments handlers
ipcMain.handle('employee-payments:get-by-employee', async (_, employeeId) => {
  return new Promise((resolve) => {
    db.all('SELECT * FROM employee_payments WHERE employee_id = ? ORDER BY created_at DESC', [employeeId], (err, rows) => {
      if (err) {
        resolve({ success: false, data: [], error: err.message });
      } else {
        resolve({ success: true, data: rows });
      }
    });
  });
});

ipcMain.handle('employee-payments:create', async (_, payment) => {
  return new Promise((resolve) => {
    const stmt = db.prepare(`
      INSERT INTO employee_payments (employee_id, amount, currency, payment_type, payment_date, notes) 
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run([
      payment.employee_id,
      payment.amount,
      payment.currency || 'USD',
      payment.payment_type || 'salary',
      payment.payment_date || new Date().toISOString(),
      payment.notes || null
    ], function(err) {
      if (err) {
        resolve({ success: false, error: err.message });
      } else {
        db.get('SELECT * FROM employee_payments WHERE id = ?', [this.lastID], (selectErr, newPayment) => {
          if (selectErr) {
            resolve({ success: false, error: selectErr.message });
          } else {
            resolve({ success: true, data: newPayment });
          }
        });
      }
    });
    
    stmt.finalize();
  });
});

ipcMain.handle('employee-payments:delete', async (_, id) => {
  return new Promise((resolve) => {
    const stmt = db.prepare('DELETE FROM employee_payments WHERE id = ?');
    
    stmt.run([id], function(err) {
      if (err) {
        resolve({ success: false, error: err.message });
      } else if (this.changes === 0) {
        resolve({ success: false, error: 'Ödeme kaydı bulunamadı' });
      } else {
        resolve({ success: true, data: true });
      }
    });
    
    stmt.finalize();
  });
});

// Employee balance update
ipcMain.handle('employees:update-balance', async (_, employeeId, newBalance) => {
  return new Promise((resolve) => {
    const stmt = db.prepare('UPDATE employees SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    
    stmt.run([newBalance, employeeId], function(err) {
      if (err) {
        resolve({ success: false, error: err.message });
      } else if (this.changes === 0) {
        resolve({ success: false, error: 'Çalışan bulunamadı' });
      } else {
        resolve({ success: true, data: { id: employeeId, balance: newBalance } });
      }
    });
    
    stmt.finalize();
  });
});

// Categories handlers
ipcMain.handle('categories:get-all', async () => {
  return new Promise((resolve) => {
    db.all('SELECT * FROM categories ORDER BY name', (err, rows) => {
      if (err) {
        resolve({ success: false, data: [], error: err.message });
      } else {
        resolve({ success: true, data: rows });
      }
    });
  });
});

ipcMain.handle('categories:create', async (_, category) => {
  return new Promise((resolve) => {
    const stmt = db.prepare('INSERT INTO categories (name, description) VALUES (?, ?)');
    
    stmt.run([category.name, category.description || null], function(err) {
      if (err) {
        resolve({ success: false, error: err.message });
      } else {
        db.get('SELECT * FROM categories WHERE id = ?', [this.lastID], (selectErr, newCategory) => {
          if (selectErr) {
            resolve({ success: false, error: selectErr.message });
          } else {
            resolve({ success: true, data: newCategory });
          }
        });
      }
    });
    
    stmt.finalize();
  });
});

// Colors handlers
ipcMain.handle('colors:get-all', async () => {
  return new Promise((resolve) => {
    db.all('SELECT * FROM colors ORDER BY name', (err, rows) => {
      if (err) {
        resolve({ success: false, data: [], error: err.message });
      } else {
        resolve({ success: true, data: rows });
      }
    });
  });
});

ipcMain.handle('colors:create', async (_, color) => {
  return new Promise((resolve) => {
    const stmt = db.prepare('INSERT INTO colors (name, hex_code) VALUES (?, ?)');
    
    stmt.run([color.name, color.hex_code || null], function(err) {
      if (err) {
        resolve({ success: false, error: err.message });
      } else {
        db.get('SELECT * FROM colors WHERE id = ?', [this.lastID], (selectErr, newColor) => {
          if (selectErr) {
            resolve({ success: false, error: selectErr.message });
          } else {
            resolve({ success: true, data: newColor });
          }
        });
      }
    });
    
    stmt.finalize();
  });
});

// Returns handlers
ipcMain.handle('returns:create', async (_, returnData) => {
  return new Promise((resolve) => {
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      
      try {
        // İade kaydı oluştur
        const returnStmt = db.prepare(`
          INSERT INTO returns (sale_id, customer_id, product_id, quantity, unit_price, total_amount, return_date, notes) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        returnStmt.run([
          returnData.sale_id,
          returnData.customer_id,
          returnData.product_id,
          returnData.quantity,
          returnData.unit_price,
          returnData.total_amount,
          returnData.return_date || new Date().toISOString(),
          returnData.notes || null
        ], function(returnErr) {
          if (returnErr) {
            db.run('ROLLBACK');
            resolve({ success: false, error: returnErr.message });
            return;
          }
          
          const returnId = this.lastID;
          
          // Stok güncelle (iade edilen miktar kadar artır)
          const updateStockStmt = db.prepare(`
            UPDATE products 
            SET stock_quantity = stock_quantity + ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
          `);
          
          updateStockStmt.run([returnData.quantity, returnData.product_id], function(stockErr) {
            if (stockErr) {
              db.run('ROLLBACK');
              resolve({ success: false, error: stockErr.message });
              return;
            }
            
            // Stok hareketi kaydet
            const movementStmt = db.prepare(`
              INSERT INTO stock_movements (product_id, movement_type, quantity, reference_type, reference_id, customer_id, unit_price, total_amount, notes, user) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            
            movementStmt.run([
              returnData.product_id,
              'in',
              returnData.quantity,
              'return',
              returnId,
              returnData.customer_id,
              returnData.unit_price,
              returnData.total_amount,
              `İade - ${returnData.notes || ''}`,
              'System'
            ], function(movementErr) {
              if (movementErr) {
                db.run('ROLLBACK');
                resolve({ success: false, error: movementErr.message });
                return;
              }
              
              // Müşteri bakiyesini güncelle (iade tutarı kadar borç azalt)
              const updateBalanceStmt = db.prepare(`
                UPDATE customers 
                SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP 
                WHERE id = ?
              `);
              
              updateBalanceStmt.run([returnData.total_amount, returnData.customer_id], function(balanceErr) {
                if (balanceErr) {
                  db.run('ROLLBACK');
                  resolve({ success: false, error: balanceErr.message });
                  return;
                }
                
                db.run('COMMIT');
                resolve({ success: true, data: { id: returnId, ...returnData } });
              });
              
              updateBalanceStmt.finalize();
            });
            
            movementStmt.finalize();
          });
          
          updateStockStmt.finalize();
        });
        
        returnStmt.finalize();
      } catch (error) {
        db.run('ROLLBACK');
        resolve({ success: false, error: error.message });
      }
    });
  });
});

// Cash handlers
ipcMain.handle('cash:get-all', async () => {
  return new Promise((resolve) => {
    db.all('SELECT * FROM cash_transactions ORDER BY created_at DESC', (err, rows) => {
      if (err) {
        resolve({ success: false, data: [], error: err.message });
      } else {
        resolve({ success: true, data: rows });
      }
    });
  });
});

ipcMain.handle('cash:create', async (_, transaction) => {
  return new Promise((resolve) => {
    const stmt = db.prepare(`
      INSERT INTO cash_transactions (type, amount, currency, category, description, reference_type, reference_id, customer_id, user) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run([
      transaction.type,
      transaction.amount,
      transaction.currency || 'USD',
      transaction.category,
      transaction.description,
      transaction.reference_type || null,
      transaction.reference_id || null,
      transaction.customer_id || null,
      transaction.user
    ], function(err) {
      if (err) {
        resolve({ success: false, error: err.message });
      } else {
        db.get('SELECT * FROM cash_transactions WHERE id = ?', [this.lastID], (selectErr, newTransaction) => {
          if (selectErr) {
            resolve({ success: false, error: selectErr.message });
          } else {
            resolve({ success: true, data: newTransaction });
          }
        });
      }
    });
    
    stmt.finalize();
  });
});

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Environment-aware URL loading
  if (isDev) {
    // Development mode: load from Vite dev server
    mainWindow.loadURL('http://localhost:3000');
    
    // Open DevTools in development
    mainWindow.webContents.openDevTools();
  } else {
    // Production mode: load from built files
    // __dirname is src/main, so we need to go up two levels to reach project root
    const projectRoot = path.join(__dirname, '../..');
    const htmlPath = path.join(projectRoot, 'dist-react/index.html');
    console.log('Production HTML path:', htmlPath);
    
    if (fs.existsSync(htmlPath)) {
      mainWindow.loadFile(htmlPath);
    } else {
      console.error('Production HTML file not found:', htmlPath);
      console.log('Project root:', projectRoot);
      console.log('Available files in project root:', fs.readdirSync(projectRoot));
    }
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  try {
    await initializeDatabase();
    await createTables();
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  } catch (error) {
    console.error('App initialization error:', error);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (db) {
      db.close((err) => {
        if (err) {
          console.error('Error closing database:', err);
        } else {
          console.log('Database connection closed');
        }
      });
    }
    app.quit();
  }
});