const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { initializeDatabase, query, queryOne, queryAll } = require('./database');
const S3Backup = require('./backup/s3Backup');

// Environment detection
const isDev = !app.isPackaged; // Build edilmişse false, dev modda true

let db;
let mainWindow;
let s3Backup = new S3Backup();

// Create database tables
async function createTables() {
  try {
    // ============================================
    // CUSTOMERS TABLE (Müşteriler ve Tedarikçiler)
    // ============================================
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

    // ============================================
    // PRODUCTS TABLE (Satış Ürünleri: Keçi, Koyun)
    // ============================================
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

    // ============================================
    // MATERIALS TABLE (Alım Malzemeleri: Boya, Cila, Binder)
    // ============================================
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
        supplier_id INTEGER REFERENCES customers(id),
        supplier_name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ============================================
    // EMPLOYEES TABLE (Çalışanlar)
    // ============================================
    await query(`
      CREATE TABLE IF NOT EXISTS employees (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(50),
        position VARCHAR(100),
        salary DECIMAL(15,2) DEFAULT 0,
        salary_currency VARCHAR(10) DEFAULT 'TRY',
        balance DECIMAL(15,2) DEFAULT 0,
        hire_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ============================================
    // SALES TABLE (Satışlar)
    // ============================================
    await query(`
      CREATE TABLE IF NOT EXISTS sales (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id),
        total_amount DECIMAL(15,2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'TRY',
        payment_status VARCHAR(20) DEFAULT 'pending',
        sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ============================================
    // SALE ITEMS TABLE (Satış Kalemleri)
    // ============================================
    await query(`
      CREATE TABLE IF NOT EXISTS sale_items (
        id SERIAL PRIMARY KEY,
        sale_id INTEGER REFERENCES sales(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(id),
        product_name VARCHAR(255),
        color VARCHAR(50),
        quantity_pieces INTEGER NOT NULL,
        quantity_desi DECIMAL(10,2) NOT NULL,
        unit_price_per_desi DECIMAL(15,2) NOT NULL,
        total_price DECIMAL(15,2) NOT NULL,
        unit VARCHAR(10) DEFAULT 'desi',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ============================================
    // STOCK MOVEMENTS TABLE (Ürün Stok Hareketleri)
    // ============================================
    await query(`
      CREATE TABLE IF NOT EXISTS stock_movements (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(id),
        movement_type VARCHAR(50) NOT NULL CHECK (movement_type IN ('in', 'out', 'adjustment')),
        quantity INTEGER NOT NULL,
        previous_stock INTEGER,
        new_stock INTEGER,
        reference_type VARCHAR(50),
        reference_id INTEGER,
        customer_id INTEGER REFERENCES customers(id),
        unit_price DECIMAL(15,2),
        total_amount DECIMAL(15,2),
        currency VARCHAR(10) DEFAULT 'TRY',
        notes TEXT,
        "user" VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ============================================
    // CUSTOMER PAYMENTS TABLE (Müşteri Ödemeleri)
    // ============================================
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

    // ============================================
    // PURCHASES TABLE (Alımlar)
    // ============================================
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

    // ============================================
    // PURCHASE ITEMS TABLE (Alım Kalemleri)
    // ============================================
    await query(`
      CREATE TABLE IF NOT EXISTS purchase_items (
        id SERIAL PRIMARY KEY,
        purchase_id INTEGER REFERENCES purchases(id) ON DELETE CASCADE,
        product_id INTEGER,
        quantity DECIMAL(10,2) NOT NULL,
        unit_price DECIMAL(15,2) NOT NULL,
        total_price DECIMAL(15,2) NOT NULL,
        brand TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ============================================
    // CASH TRANSACTIONS TABLE (Kasa İşlemleri)
    // ============================================
    await query(`
      CREATE TABLE IF NOT EXISTS cash_transactions (
        id SERIAL PRIMARY KEY,
        type VARCHAR(10) NOT NULL CHECK (type IN ('in', 'out')),
        amount DECIMAL(15,2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'TRY',
        category VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        reference_type VARCHAR(50),
        reference_id INTEGER,
        customer_id INTEGER REFERENCES customers(id),
        "user" VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ============================================
    // CHECK TRANSACTIONS TABLE (Çek-Senet İşlemleri)
    // ============================================
    await query(`
      CREATE TABLE IF NOT EXISTS check_transactions (
        id SERIAL PRIMARY KEY,
        sequence_number VARCHAR(20),
        is_official BOOLEAN DEFAULT true,
        type VARCHAR(10) NOT NULL CHECK (type IN ('in', 'out')),
        amount DECIMAL(15,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'TRY',
        check_type VARCHAR(20) NOT NULL CHECK (check_type IN ('check', 'promissory_note')),
        check_number VARCHAR(50),
        received_date DATE,
        received_from VARCHAR(255),
        first_endorser VARCHAR(255),
        last_endorser VARCHAR(255),
        bank_name VARCHAR(100),
        branch_name VARCHAR(100),
        due_date DATE,
        account_number VARCHAR(50),
        description TEXT,
        customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
        customer_name VARCHAR(255),
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'collected', 'used', 'protested')),
        protested_at TIMESTAMP,
        protest_reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Check transactions indeksleri
    await query(`
      CREATE INDEX IF NOT EXISTS idx_check_transactions_type ON check_transactions(type)
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_check_transactions_check_type ON check_transactions(check_type)
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_check_transactions_customer_id ON check_transactions(customer_id)
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_check_transactions_created_at ON check_transactions(created_at)
    `);

    // Check transactions için yeni kolonları ekle (eğer yoksa)
    try {
      await query(`ALTER TABLE check_transactions ADD COLUMN IF NOT EXISTS sequence_number VARCHAR(20)`);
      await query(`ALTER TABLE check_transactions ADD COLUMN IF NOT EXISTS is_official BOOLEAN DEFAULT true`);
      await query(`ALTER TABLE check_transactions ADD COLUMN IF NOT EXISTS received_date DATE`);
      await query(`ALTER TABLE check_transactions ADD COLUMN IF NOT EXISTS received_from VARCHAR(255)`);
      await query(`ALTER TABLE check_transactions ADD COLUMN IF NOT EXISTS first_endorser VARCHAR(255)`);
      await query(`ALTER TABLE check_transactions ADD COLUMN IF NOT EXISTS last_endorser VARCHAR(255)`);
      await query(`ALTER TABLE check_transactions ADD COLUMN IF NOT EXISTS branch_name VARCHAR(100)`);
      await query(`ALTER TABLE check_transactions ADD COLUMN IF NOT EXISTS account_number VARCHAR(50)`);
      await query(`ALTER TABLE check_transactions ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'`);
      await query(`ALTER TABLE check_transactions ADD COLUMN IF NOT EXISTS is_cashed BOOLEAN DEFAULT FALSE`);
      await query(`ALTER TABLE check_transactions ADD COLUMN IF NOT EXISTS cashed_at TIMESTAMP`);
      await query(`ALTER TABLE check_transactions ADD COLUMN IF NOT EXISTS original_transaction_id INTEGER`);
      await query(`ALTER TABLE check_transactions ADD COLUMN IF NOT EXISTS payment_id INTEGER`);
      await query(`ALTER TABLE check_transactions ADD COLUMN IF NOT EXISTS is_converted BOOLEAN DEFAULT FALSE`);
      await query(`ALTER TABLE check_transactions ADD COLUMN IF NOT EXISTS original_currency VARCHAR(3)`);
      await query(`ALTER TABLE check_transactions ADD COLUMN IF NOT EXISTS original_amount DECIMAL(15,2)`);
      await query(`ALTER TABLE check_transactions ADD COLUMN IF NOT EXISTS conversion_rate DECIMAL(10,4)`);
      await query(`ALTER TABLE check_transactions ADD COLUMN IF NOT EXISTS converted_amount DECIMAL(15,2)`);
      await query(`ALTER TABLE check_transactions ADD COLUMN IF NOT EXISTS received_converted_currency VARCHAR(3)`);
      await query(`ALTER TABLE check_transactions ADD COLUMN IF NOT EXISTS received_converted_amount DECIMAL(15,2)`);
      await query(`ALTER TABLE check_transactions ADD COLUMN IF NOT EXISTS received_conversion_rate DECIMAL(10,4)`);
      await query(`ALTER TABLE check_transactions ADD COLUMN IF NOT EXISTS given_converted_currency VARCHAR(3)`);
      await query(`ALTER TABLE check_transactions ADD COLUMN IF NOT EXISTS given_converted_amount DECIMAL(15,2)`);
      await query(`ALTER TABLE check_transactions ADD COLUMN IF NOT EXISTS given_conversion_rate DECIMAL(10,4)`);
      await query(`ALTER TABLE check_transactions ADD COLUMN IF NOT EXISTS protested_at TIMESTAMP`);
      await query(`ALTER TABLE check_transactions ADD COLUMN IF NOT EXISTS protest_reason TEXT`);
    } catch (error) {
      console.log('Check transactions kolonları zaten mevcut veya eklenemedi:', error.message);
    }

    // ============================================
    // MATERIAL MOVEMENTS TABLE (Malzeme Stok Hareketleri)
    // ============================================
    await query(`
      CREATE TABLE IF NOT EXISTS material_movements (
        id SERIAL PRIMARY KEY,
        material_id INTEGER REFERENCES materials(id) ON DELETE CASCADE,
        movement_type VARCHAR(20) CHECK (movement_type IN ('in', 'out', 'adjustment')),
        quantity DECIMAL(10,2) NOT NULL,
        previous_stock DECIMAL(10,2),
        new_stock DECIMAL(10,2),
        reference_type VARCHAR(50),
        reference_id INTEGER,
        supplier_id INTEGER REFERENCES customers(id),
        unit_price DECIMAL(15,2),
        total_amount DECIMAL(15,2),
        currency VARCHAR(10) DEFAULT 'TRY',
        notes TEXT,
        "user" VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ============================================
    // EMPLOYEE PAYMENTS TABLE (Çalışan Ödemeleri)
    // ============================================
    await query(`
      CREATE TABLE IF NOT EXISTS employee_payments (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER REFERENCES employees(id),
        amount DECIMAL(15,2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'TRY',
        payment_type VARCHAR(20) DEFAULT 'salary',
        payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ============================================
    // SETTINGS TABLE (Uygulama Ayarları)
    // ============================================
    await query(`
      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        key VARCHAR(100) NOT NULL UNIQUE,
        value TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Default ayarları ekle
    await query(`
      INSERT INTO settings (key, value)
      VALUES 
        ('app_password', NULL),
        ('password_enabled', 'false')
      ON CONFLICT (key) DO NOTHING
    `);

    // // Returns table
    // await query(`
    //   CREATE TABLE IF NOT EXISTS returns (
    //     id SERIAL PRIMARY KEY,
    //     sale_id INTEGER REFERENCES sales(id),
    //     customer_id INTEGER REFERENCES customers(id),
    //     product_id INTEGER REFERENCES products(id),
    //     quantity DECIMAL(10,2) NOT NULL,
    //     unit_price DECIMAL(15,2) NOT NULL,
    //     total_amount DECIMAL(15,2) NOT NULL,
    //     return_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    //     notes TEXT,
    //     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    //   )
    // `);

    // NOT: Default categories ve colors kaldırıldı
    // Artık bunlar koddan geliyor (ProductManagement.tsx)

    // ============================================
    // PERFORMANS İYİLEŞTİRMELERİ - INDEX'LER
    // ============================================

    // Customers indexes
    await query(`CREATE INDEX IF NOT EXISTS idx_customers_type ON customers(type)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name)`);

    // Sales indexes
    await query(`CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON sales(customer_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_sales_sale_date ON sales(sale_date DESC)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at DESC)`);

    // Sale items indexes
    await query(`CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON sale_items(product_id)`);

    // Purchases indexes
    await query(`CREATE INDEX IF NOT EXISTS idx_purchases_supplier_id ON purchases(supplier_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_purchases_purchase_date ON purchases(purchase_date DESC)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_purchases_created_at ON purchases(created_at DESC)`);

    // Purchase items indexes
    await query(`CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase_id ON purchase_items(purchase_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_purchase_items_product_id ON purchase_items(product_id)`);

    // Customer payments indexes
    await query(`CREATE INDEX IF NOT EXISTS idx_customer_payments_customer_id ON customer_payments(customer_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_customer_payments_payment_date ON customer_payments(payment_date DESC)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_customer_payments_created_at ON customer_payments(created_at DESC)`);

    // Cash transactions indexes
    await query(`CREATE INDEX IF NOT EXISTS idx_cash_transactions_type ON cash_transactions(type)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_cash_transactions_customer_id ON cash_transactions(customer_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_cash_transactions_created_at ON cash_transactions(created_at DESC)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_cash_transactions_reference ON cash_transactions(reference_type, reference_id)`);

    // Stock movements indexes
    await query(`CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON stock_movements(product_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON stock_movements(created_at DESC)`);

    // Material movements indexes
    await query(`CREATE INDEX IF NOT EXISTS idx_material_movements_material_id ON material_movements(material_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_material_movements_supplier_id ON material_movements(supplier_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_material_movements_created_at ON material_movements(created_at DESC)`);

    // Materials indexes
    await query(`CREATE INDEX IF NOT EXISTS idx_materials_supplier_id ON materials(supplier_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_materials_category ON materials(category)`);

    // Products indexes
    await query(`CREATE INDEX IF NOT EXISTS idx_products_category ON products(category)`);

    // Employee payments indexes
    await query(`CREATE INDEX IF NOT EXISTS idx_employee_payments_employee_id ON employee_payments(employee_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_employee_payments_payment_date ON employee_payments(payment_date DESC)`);

    console.log('✅ All indexes created successfully');

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

    // Migration 5: Move material movements from stock_movements to material_movements
    try {
      console.log('Starting material movements migration...');

      // Check if migration is needed (are there any records in stock_movements that belong to materials ONLY?)
      // Important: Only migrate if the ID exists in materials but NOT in products
      const materialMovementsInStock = await query(`
        SELECT COUNT(*) as count
        FROM stock_movements sm
        WHERE EXISTS (
          SELECT 1 FROM materials m WHERE m.id = sm.product_id
        )
        AND NOT EXISTS (
          SELECT 1 FROM products p WHERE p.id = sm.product_id
        )
      `);

      if (materialMovementsInStock.rows[0].count > 0) {
        console.log(`Found ${materialMovementsInStock.rows[0].count} material movements to migrate`);

        // Copy material movements to material_movements table
        // Only migrate records where ID exists in materials but NOT in products
        await query(`
          INSERT INTO material_movements (
            material_id, movement_type, quantity, previous_stock, new_stock,
            reference_type, reference_id, supplier_id, unit_price, total_amount,
            notes, "user", created_at
          )
          SELECT 
            sm.product_id as material_id,
            sm.movement_type,
            sm.quantity,
            sm.previous_stock,
            sm.new_stock,
            sm.reference_type,
            sm.reference_id,
            sm.customer_id as supplier_id,
            sm.unit_price,
            sm.total_amount,
            sm.notes,
            sm."user",
            sm.created_at
          FROM stock_movements sm
          WHERE EXISTS (
            SELECT 1 FROM materials m WHERE m.id = sm.product_id
          )
          AND NOT EXISTS (
            SELECT 1 FROM products p WHERE p.id = sm.product_id
          )
          ON CONFLICT DO NOTHING
        `);

        // Delete material movements from stock_movements
        // Only delete records where ID exists in materials but NOT in products
        const deleteResult = await query(`
          DELETE FROM stock_movements
          WHERE EXISTS (
            SELECT 1 FROM materials m WHERE m.id = stock_movements.product_id
          )
          AND NOT EXISTS (
            SELECT 1 FROM products p WHERE p.id = stock_movements.product_id
          )
        `);

        console.log(`Migration completed: Moved ${deleteResult.rowCount} material movements to material_movements table`);
      } else {
        console.log('No material movements found in stock_movements, migration skipped');
      }
    } catch (migrationError) {
      console.error('Migration 5 error:', migrationError);
      console.log('Migration 5 skipped or already completed:', migrationError.message);
    }

    // Migration 6: Add sequence numbers and status to check_transactions
    try {
      console.log('Starting check transactions migration...');

      // ALWAYS update status constraint to include 'protested'
      try {
        console.log('Updating status constraint...');
        // Drop old constraint if exists
        await query(`
          ALTER TABLE check_transactions 
          DROP CONSTRAINT IF EXISTS check_transactions_status_check
        `);
        
        // Add new constraint with protested status
        await query(`
          ALTER TABLE check_transactions 
          ADD CONSTRAINT check_transactions_status_check 
          CHECK (status IN ('active', 'collected', 'used', 'protested'))
        `);
        console.log('Status constraint updated successfully');
      } catch (e) {
        console.log('Status constraint could not be updated:', e.message);
      }

      // Check if migration is needed
      const needsMigration = await query(`
        SELECT COUNT(*) as count 
        FROM check_transactions 
        WHERE sequence_number IS NULL
      `);

      if (needsMigration.rows[0].count > 0) {
        console.log(`Found ${needsMigration.rows[0].count} check transactions without sequence numbers`);

        // Generate sequence numbers for existing records
        // Checks
        const checks = await queryAll(`
          SELECT id, created_at 
          FROM check_transactions 
          WHERE check_type = 'check' AND sequence_number IS NULL
          ORDER BY created_at ASC
        `);

        for (const check of checks) {
          const year = new Date(check.created_at).getFullYear();
          const prefix = 'C';
          
          // Get last sequence number for this year
          const lastSeq = await queryOne(`
            SELECT sequence_number 
            FROM check_transactions 
            WHERE check_type = 'check' 
            AND sequence_number LIKE $1
            ORDER BY id DESC 
            LIMIT 1
          `, [`${prefix}${year}%`]);
          
          let seqNum = 1;
          if (lastSeq && lastSeq.sequence_number) {
            const parts = lastSeq.sequence_number.split('-');
            if (parts.length === 2) {
              seqNum = parseInt(parts[1]) + 1;
            }
          }
          
          const sequenceNumber = `${prefix}${year}-${String(seqNum).padStart(4, '0')}`;
          
          await query(`
            UPDATE check_transactions
            SET sequence_number = $1
            WHERE id = $2
          `, [sequenceNumber, check.id]);
        }

        // Promissory notes
        const notes = await queryAll(`
          SELECT id, created_at 
          FROM check_transactions 
          WHERE check_type = 'promissory_note' AND sequence_number IS NULL
          ORDER BY created_at ASC
        `);

        for (const note of notes) {
          const year = new Date(note.created_at).getFullYear();
          const prefix = 'S';
          
          // Get last sequence number for this year
          const lastSeq = await queryOne(`
            SELECT sequence_number 
            FROM check_transactions 
            WHERE check_type = 'promissory_note' 
            AND sequence_number LIKE $1
            ORDER BY id DESC 
            LIMIT 1
          `, [`${prefix}${year}%`]);
          
          let seqNum = 1;
          if (lastSeq && lastSeq.sequence_number) {
            const parts = lastSeq.sequence_number.split('-');
            if (parts.length === 2) {
              seqNum = parseInt(parts[1]) + 1;
            }
          }
          
          const sequenceNumber = `${prefix}${year}-${String(seqNum).padStart(4, '0')}`;
          
          await query(`
            UPDATE check_transactions
            SET sequence_number = $1
            WHERE id = $2
          `, [sequenceNumber, note.id]);
        }

        // Update status for existing records
        await query(`
          UPDATE check_transactions 
          SET status = 'collected' 
          WHERE is_cashed = true 
          AND (description LIKE '%Tahsil%' OR description LIKE '%tahsil%')
          AND status = 'active'
        `);

        await query(`
          UPDATE check_transactions 
          SET status = 'used' 
          WHERE is_cashed = true 
          AND (description LIKE '%Tedarikçi%' OR description LIKE '%Kullanıldı%' OR description LIKE '%kullanıldı%')
          AND status = 'active'
        `);

        await query(`
          UPDATE check_transactions 
          SET status = 'used' 
          WHERE is_cashed = true 
          AND status = 'active'
        `);

        // Add indexes
        await query(`CREATE INDEX IF NOT EXISTS idx_check_transactions_sequence_number ON check_transactions(sequence_number)`);
        await query(`CREATE INDEX IF NOT EXISTS idx_check_transactions_status ON check_transactions(status)`);

        console.log('Migration completed: Check transactions sequence numbers and status added');
      } else {
        console.log('Check transactions migration not needed, all records have sequence numbers');
      }
    } catch (migrationError) {
      console.error('Migration 6 error:', migrationError);
      console.log('Migration 6 skipped or already completed:', migrationError.message);
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
    mainWindow.webContents.openDevTools(); // Geliştirici araçlarını aç

  } else {
    // PRODUCTION MODU
    // Windows'ta path.join backslash kullanır, URL için forward slash'e çevirmemiz gerekir
    const indexPath = path.join(__dirname, '../../dist-react/index.html');
    htmlPath = `file://${indexPath.replace(/\\/g, '/')}`;
    console.log('PRODUCTION MODU: Yükleniyor:', htmlPath);
    console.log('__dirname:', __dirname);
    console.log('Index path exists:', fs.existsSync(indexPath));

    // Production'da da DevTools aç (hata ayıklama için)
    mainWindow.webContents.openDevTools();
  }

  // Belirlenen yolu yükle
  mainWindow.loadURL(htmlPath).catch(err => {
    console.error('URL yükleme hatası:', err);
  });
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
    // Keçi veya Koyun için sadece kategori kontrolü yap (renk kontrolü yok)
    // Diğer kategoriler için hem kategori hem renk kontrolü yap
    let existing = null;

    if (product.category === 'Keçi' || product.category === 'Koyun') {
      // Keçi veya Koyun için sadece kategori kontrolü
      existing = await queryOne(`
        SELECT * FROM products 
        WHERE category = $1
      `, [product.category]);
    } else {
      // Diğer kategoriler için kategori ve renk kontrolü
      existing = await queryOne(`
        SELECT * FROM products 
        WHERE category = $1 AND color = $2
      `, [product.category, product.color || null]);
    }

    if (existing) {
      // Varsa stok üstüne ekle
      const updated = await queryOne(`
        UPDATE products 
        SET stock_quantity = stock_quantity + $1, 
            updated_at = CURRENT_TIMESTAMP 
        WHERE id = $2
        RETURNING *
      `, [product.stock_quantity || 0, existing.id]);

      return { success: true, data: updated, merged: true };
    }

    // Yoksa yeni ürün oluştur
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

    return { success: true, data: result, merged: false };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// NOT: Categories ve Colors handler'ları kaldırıldı
// Artık kategoriler ve renkler koddan geliyor (ProductManagement.tsx)

// Sales handlers
ipcMain.handle('sales:get-all', async (_, startDate, endDate) => {
  try {
    console.log('📊 sales:get-all çağrıldı, tarih aralığı:', { startDate, endDate });

    let queryText = `
      SELECT 
        s.*,
        c.name as customer_name,
        si.product_id,
        si.product_name,
        si.color,
        si.quantity_pieces,
        si.quantity_desi,
        si.unit_price_per_desi,
        si.total_price,
        si.unit,
        p.category
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

    queryText += whereClause + ' ORDER BY s.sale_date DESC, s.id DESC';

    const result = await queryAll(queryText, params);

    console.log('📊 İlk 3 satış kaydı:', result.slice(0, 3).map(r => ({
      id: r.id,
      product_name: r.product_name,
      color: r.color,
      category: r.category
    })));

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
        si.product_name,
        si.color,
        si.quantity_pieces,
        si.quantity_desi,
        si.unit_price_per_desi,
        si.total_price,
        si.unit,
        p.category
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
        productName: row.product_name || row.category || 'Bilinmiyor',
        color: row.color || 'Belirtilmemiş',
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
      SELECT 
        p.id,
        p.supplier_id,
        p.total_amount,
        p.currency,
        p.purchase_date,
        p.notes,
        p.status,
        p.created_at,
        p.updated_at,
        c.name as supplier_name,
        pi.product_id,
        pi.quantity,
        pi.unit_price,
        pi.total_price,
        COALESCE(m.name, pr.name) as material_name,
        COALESCE(m.unit, pr.unit) as unit
      FROM purchases p 
      LEFT JOIN customers c ON p.supplier_id = c.id 
      LEFT JOIN purchase_items pi ON p.id = pi.purchase_id
      LEFT JOIN materials m ON pi.product_id = m.id
      LEFT JOIN products pr ON pi.product_id = pr.id
      ORDER BY p.created_at DESC 
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    console.log('📦 Backend - İlk 2 alım verisi:', JSON.stringify(result.slice(0, 2), null, 2));

    const countResult = await queryOne('SELECT COUNT(*) as total FROM purchases');

    return {
      success: true,
      data: result,
      total: parseInt(countResult.total),
      page,
      limit
    };
  } catch (error) {
    console.error('❌ Backend - Alım verileri hatası:', error);
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
      INSERT INTO materials (name, category, color, brand, code, stock_quantity, unit, description, supplier_id, supplier_name)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      material.name,
      material.category,
      material.color || null,
      material.brand || null,
      material.code || null,
      material.stock_quantity || 0, // ✅ DÜZELTME: Kullanıcının girdiği stok miktarını kullan
      material.unit || 'kg',
      material.description || null,
      material.supplier_id || null,
      material.supplier_name || null
    ]);

    // ✅ DÜZELTME: Otomatik stok hareketi oluşturma kaldırıldı
    // Stok hareketi sadece gerçek alım yapıldığında (purchases:create) oluşturulacak
    // Bu sayede çift kayıt sorunu çözülüyor

    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('materials:update', async (_, id, material) => {
  try {
    console.log('🔧 materials:update çağrıldı:', {
      id,
      stock_quantity: material.stock_quantity,
      timestamp: new Date()
    });

    // Dinamik olarak güncellenecek alanları belirle
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (material.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(material.name);
    }
    if (material.category !== undefined) {
      updates.push(`category = $${paramIndex++}`);
      values.push(material.category);
    }
    if (material.color_shade !== undefined) {
      updates.push(`color_shade = $${paramIndex++}`);
      values.push(material.color_shade || null);
    }
    if (material.brand !== undefined) {
      updates.push(`brand = $${paramIndex++}`);
      values.push(material.brand || null);
    }
    if (material.code !== undefined) {
      updates.push(`code = $${paramIndex++}`);
      values.push(material.code || null);
    }
    if (material.stock_quantity !== undefined) {
      updates.push(`stock_quantity = $${paramIndex++}`);
      values.push(material.stock_quantity || 0);
    }
    if (material.unit !== undefined) {
      updates.push(`unit = $${paramIndex++}`);
      values.push(material.unit || 'kg');
    }
    if (material.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(material.description || null);
    }

    if (updates.length === 0) {
      return { success: false, error: 'Güncellenecek alan bulunamadı' };
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await queryOne(`
      UPDATE materials 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, values);

    if (!result) {
      return { success: false, error: 'Malzeme bulunamadı' };
    }

    console.log('✅ materials:update tamamlandı:', {
      id: result.id,
      new_stock: result.stock_quantity
    });

    // ⚠️ DİKKAT: Burada stok hareketi OLUŞTURULMAMALI
    // Stok hareketi sadece purchases:create'de oluşturulmalı

    return { success: true, data: result };
  } catch (error) {
    console.error('❌ materials:update error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('materials:delete', async (_, id) => {
  try {
    // Start transaction
    await query('BEGIN');

    // Önce purchase_items'ları sil
    await query('DELETE FROM purchase_items WHERE product_id = $1', [id]);

    // material_movements CASCADE ile otomatik silinecek
    // En son malzemeyi sil
    const result = await query('DELETE FROM materials WHERE id = $1', [id]);

    if (result.rowCount === 0) {
      await query('ROLLBACK');
      return { success: false, error: 'Malzeme bulunamadı' };
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

// Stock movements handlers (for products only)
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
    // Validate that this is a product, not a material
    const productCheck = await queryOne('SELECT id FROM products WHERE id = $1', [productId]);
    if (!productCheck) {
      return { success: false, error: 'Ürün bulunamadı' };
    }

    const result = await queryAll('SELECT * FROM stock_movements WHERE product_id = $1 ORDER BY created_at DESC', [productId]);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('stock-movements:create', async (_, movement) => {
  try {
    // Validate that this is a product, not a material
    const productCheck = await queryOne('SELECT id FROM products WHERE id = $1', [movement.product_id]);
    if (!productCheck) {
      return { success: false, error: 'Ürün bulunamadı. Malzemeler için material-movements kullanın.' };
    }

    const result = await queryOne(`
      INSERT INTO stock_movements (
        product_id, movement_type, quantity, previous_stock, new_stock, 
        reference_type, reference_id, customer_id, unit_price, total_amount, 
        currency, notes, "user", created_at
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, COALESCE($14, CURRENT_TIMESTAMP))
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
      movement.currency || 'TRY',
      movement.notes || null,
      movement.user || 'system',
      movement.created_at || null
    ]);

    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Material movements handlers (for materials only)
ipcMain.handle('material-movements:get-all', async () => {
  try {
    const result = await queryAll('SELECT * FROM material_movements ORDER BY created_at DESC');
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('material-movements:get-by-material', async (_, materialId) => {
  try {
    const result = await queryAll('SELECT * FROM material_movements WHERE material_id = $1 ORDER BY created_at DESC', [materialId]);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('material-movements:create', async (_, movement) => {
  try {
    // Validate material exists
    const material = await queryOne('SELECT id FROM materials WHERE id = $1', [movement.material_id]);
    if (!material) {
      return { success: false, error: 'Malzeme bulunamadı' };
    }

    const result = await queryOne(`
      INSERT INTO material_movements (
        material_id, movement_type, quantity, previous_stock, new_stock,
        reference_type, reference_id, supplier_id, unit_price, total_amount,
        currency, notes, "user", created_at
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, COALESCE($14, CURRENT_TIMESTAMP))
      RETURNING *
    `, [
      movement.material_id,
      movement.movement_type,
      movement.quantity,
      movement.previous_stock || null,
      movement.new_stock || null,
      movement.reference_type || null,
      movement.reference_id || null,
      movement.supplier_id || null,
      movement.unit_price || null,
      movement.total_amount || null,
      movement.currency || 'TRY',
      movement.notes || null,
      movement.user || 'system',
      movement.created_at || null
    ]);

    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Sales create handler
ipcMain.handle('sales:create', async (_, sale) => {
  try {
    console.log('📥 Backend - Gelen satış verisi:', JSON.stringify(sale, null, 2));

    // Start transaction
    await query('BEGIN');

    // Tarih kontrolü ve düzeltmesi
    console.log('🛒 Satış tarihi (frontend):', sale.sale_date, typeof sale.sale_date);
    const saleDate = sale.sale_date ? new Date(sale.sale_date) : new Date();
    console.log('🛒 Satış tarihi (backend):', saleDate);

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
      saleDate,
      sale.notes || null
    ]);

    console.log('✅ Satış kaydı oluşturuldu, ID:', saleResult.id);

    // Create sale items
    if (sale.items && sale.items.length > 0) {
      for (const item of sale.items) {
        console.log('📦 Satış kalemi ekleniyor:', {
          sale_id: saleResult.id,
          product_id: item.product_id,
          product_name: item.product_name,
          color: item.color,
          quantity_pieces: item.quantity_pieces
        });

        await query(`
          INSERT INTO sale_items (
            sale_id, product_id, product_name, color, quantity_pieces, quantity_desi, 
            unit_price_per_desi, total_price, unit
          ) 
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          saleResult.id,
          item.product_id,
          item.product_name || 'Deri',
          item.color || 'Belirtilmemiş',
          item.quantity_pieces,
          item.quantity_desi,
          item.unit_price_per_desi,
          item.total_price,
          item.unit || 'desi'
        ]);

        console.log('✅ Satış kalemi eklendi');

        // Get product info including category
        const productInfo = await queryOne('SELECT id, category, color, stock_quantity FROM products WHERE id = $1', [item.product_id]);

        // Keçi alt kategorileri için Keçi stoğundan düşülecek
        const keciSubCategories = ['Keçi-Oğlak', 'Keçi-Palto', 'Çoraplık', 'Baskılık'];
        let stockProductId = item.product_id;
        let stockCategory = productInfo.category;

        // Eğer Keçi alt kategorisiyse, Keçi stoğunu bul (renk olmadan)
        if (keciSubCategories.includes(productInfo.category)) {
          const keciProduct = await queryOne(
            'SELECT id, stock_quantity FROM products WHERE category = $1 LIMIT 1',
            ['Keçi']
          );

          if (keciProduct) {
            stockProductId = keciProduct.id;
            stockCategory = 'Keçi';
            console.log(`${productInfo.category} satışı için Keçi stoğu kullanılıyor:`, {
              original_product: item.product_id,
              keci_product: keciProduct.id,
              sale_color: item.color
            });
          } else {
            throw new Error(`${productInfo.category} için Keçi stoğu bulunamadı!`);
          }
        }

        // Get current stock before update
        const currentProduct = await queryOne('SELECT stock_quantity FROM products WHERE id = $1', [stockProductId]);
        const previousStock = currentProduct ? currentProduct.stock_quantity : 0;
        
        // İade işlemi için negatif miktar kontrolü
        const isReturn = item.quantity_pieces < 0;
        const absQuantity = Math.abs(item.quantity_pieces);
        const newStock = isReturn ? previousStock + absQuantity : previousStock - absQuantity;

        console.log('Satış/İade stok hareketi:', {
          isReturn,
          sale_category: productInfo.category,
          stock_category: stockCategory,
          product_id: item.product_id,
          stock_product_id: stockProductId,
          quantity_pieces: item.quantity_pieces,
          absQuantity,
          previousStock,
          newStock
        });

        // Update product stock (iade ise ekle, satış ise çıkar)
        await query(`
          UPDATE products 
          SET stock_quantity = stock_quantity ${isReturn ? '+' : '-'} $1, updated_at = CURRENT_TIMESTAMP 
          WHERE id = $2
        `, [absQuantity, stockProductId]);

        // Create stock movement record (stok düşen/artan ürün için)
        // Müşteri adını al
        const customerInfo = await queryOne('SELECT name FROM customers WHERE id = $1', [sale.customer_id]);
        const customerName = customerInfo?.name || 'Bilinmeyen Müşteri';
        
        const movementType = isReturn ? 'in' : 'out';
        const movementNote = isReturn 
          ? `İade - ${customerName} - ${item.product_name || productInfo.category} ${item.color || ''} - ${absQuantity} adet`
          : `Satış - ${customerName} - ${item.product_name || productInfo.category} ${item.color || ''} - ${absQuantity} adet`;
        
        console.log('📝 Stok hareketi kaydediliyor:', {
          isReturn,
          movementType,
          quantity: absQuantity,
          movementNote
        });
        
        await query(`
          INSERT INTO stock_movements (
            product_id, movement_type, quantity, previous_stock, new_stock, 
            reference_type, reference_id, customer_id, unit_price, total_amount, 
            currency, notes, "user"
          ) 
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        `, [
          stockProductId,
          movementType,
          absQuantity, // Her zaman pozitif değer
          previousStock,
          newStock,
          isReturn ? 'return' : 'sale',
          saleResult.id,
          sale.customer_id,
          Math.abs(item.unit_price_per_desi),
          Math.abs(item.total_price),
          sale.currency || 'TRY',
          movementNote,
          'system'
        ]);
      }
    }

    // Müşteri bakiyesini güncelle (satış tutarı kadar artır, iade ise azalt) - Para birimine göre
    // total_amount negatifse iade, pozitifse satış
    const currency = sale.currency || 'TRY';
    const balanceChange = parseFloat(sale.total_amount);
    
    console.log('Müşteri bakiye güncellemesi:', {
      customer_id: sale.customer_id,
      currency,
      balanceChange,
      isReturn: balanceChange < 0
    });
    
    if (currency === 'USD') {
      await query(`
        UPDATE customers 
        SET balance_usd = balance_usd + $1, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $2
      `, [balanceChange, sale.customer_id]);
    } else if (currency === 'EUR') {
      await query(`
        UPDATE customers 
        SET balance_eur = balance_eur + $1, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $2
      `, [balanceChange, sale.customer_id]);
    } else {
      await query(`
        UPDATE customers 
        SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $2
      `, [balanceChange, sale.customer_id]);
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

    // İade mi kontrol et
    const isReturn = sale.notes && sale.notes.includes('İADE');
    
    console.log('🗑️ Satış siliniyor:', {
      saleId,
      isReturn,
      notes: sale.notes,
      itemsCount: saleItems.length
    });

    // Her ürün için stok güncelle
    for (const item of saleItems) {
      // İade ise: quantity_pieces negatif, stoktan ÇIKAR (iade iptal = stok azalt)
      // Satış ise: quantity_pieces pozitif, stoğa EKLE (satış iptal = stok artır)
      const stockChange = isReturn ? -Math.abs(item.quantity_pieces) : Math.abs(item.quantity_pieces);
      
      console.log('📦 Stok güncelleniyor:', {
        product_id: item.product_id,
        quantity_pieces: item.quantity_pieces,
        stockChange,
        isReturn
      });
      
      await query(`
        UPDATE products 
        SET stock_quantity = stock_quantity + $1, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $2
      `, [stockChange, item.product_id]);
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

ipcMain.handle('customer-payments:get-by-customer', async (_, customerId, startDate, endDate) => {
  try {
    let queryText = 'SELECT * FROM customer_payments WHERE customer_id = $1';
    const params = [customerId];

    // Tarih filtresi ekle
    if (startDate && endDate) {
      queryText += ' AND DATE(payment_date) BETWEEN $2 AND $3';
      params.push(startDate, endDate);
    }

    queryText += ' ORDER BY created_at DESC';

    const result = await queryAll(queryText, params);

    // Toplam hesapla (para birimi bazında)
    const totals = result.reduce((acc, payment) => {
      const currency = payment.currency || 'TRY';
      if (!acc[currency]) {
        acc[currency] = 0;
      }
      acc[currency] += parseFloat(payment.amount) || 0;
      return acc;
    }, {});

    return {
      success: true,
      data: result,
      totals: totals // { TRY: 1000, USD: 500, EUR: 200 }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('customer-payments:create', async (_, payment) => {
  try {
    // Start transaction
    await query('BEGIN');

    // Tarih kontrolü ve düzeltmesi
    console.log('💰 Ödeme tarihi (frontend):', payment.payment_date, typeof payment.payment_date);
    const paymentDate = payment.payment_date ? new Date(payment.payment_date) : new Date();
    console.log('💰 Ödeme tarihi (backend):', paymentDate);

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
      paymentDate,
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
    // Tarih kontrolü ve düzeltmesi
    console.log('👷 Çalışan ödemesi tarihi (frontend):', payment.payment_date, typeof payment.payment_date);
    const paymentDate = payment.payment_date ? new Date(payment.payment_date) : new Date();
    console.log('👷 Çalışan ödemesi tarihi (backend):', paymentDate);

    const result = await queryOne(`
      INSERT INTO employee_payments (employee_id, amount, currency, payment_type, payment_date, notes) 
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      payment.employee_id,
      payment.amount,
      payment.currency || 'USD',
      payment.payment_type || 'salary',
      paymentDate,
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

// NOT: Categories ve Colors create handler'ları kaldırıldı
// Artık kategoriler ve renkler koddan geliyor

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

// NOT: Returns handler kaldırıldı - İade özelliği kullanılmıyor

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
    console.log('🚀 purchases:create BAŞLADI:', {
      supplier_id: purchase.supplier_id,
      items_count: purchase.items?.length,
      timestamp: new Date()
    });

    // Start transaction
    await query('BEGIN');

    // Tarih kontrolü ve düzeltmesi
    console.log('📦 Alım tarihi (frontend):', purchase.purchase_date, typeof purchase.purchase_date);
    const purchaseDate = purchase.purchase_date ? new Date(purchase.purchase_date) : new Date();
    console.log('📦 Alım tarihi (backend):', purchaseDate);

    // Create purchase record
    const purchaseResult = await queryOne(`
      INSERT INTO purchases (supplier_id, total_amount, currency, purchase_date, notes, status) 
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      purchase.supplier_id,
      purchase.total_amount,
      purchase.currency || 'TRY',
      purchaseDate,
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
        let isMaterial = false;

        if (materialCheck.rows.length > 0) {
          // Update material stock and supplier info
          isMaterial = true;
          previousStock = materialCheck.rows[0].stock_quantity || 0;
          newStock = previousStock + item.quantity;
          productName = materialCheck.rows[0].name || 'Bilinmeyen Malzeme';

          // Get supplier name
          const supplier = await queryOne(`SELECT name FROM customers WHERE id = $1`, [purchase.supplier_id]);
          const supplierName = supplier?.name || 'Bilinmeyen Tedarikçi';

          await query(`
            UPDATE materials 
            SET stock_quantity = stock_quantity + $1, 
                supplier_id = $2,
                supplier_name = $3,
                updated_at = CURRENT_TIMESTAMP 
            WHERE id = $4
          `, [item.quantity, purchase.supplier_id, supplierName, item.product_id]);
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

        // Create movement record - use material_movements for materials, stock_movements for products
        if (isMaterial) {
          console.log('📦 Material movement oluşturuluyor:', {
            material_id: item.product_id,
            productName,
            quantity: item.quantity,
            previousStock,
            newStock,
            purchase_id: purchaseResult.id,
            timestamp: new Date()
          });

          // ✅ created_at açıkça belirtilmedi - PostgreSQL DEFAULT CURRENT_TIMESTAMP kullanacak
          // Bu sayede timezone tutarlı olacak
          await query(`
            INSERT INTO material_movements (
              material_id, movement_type, quantity, previous_stock, new_stock, 
              reference_type, reference_id, supplier_id, unit_price, total_amount, currency, notes, "user"
            ) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          `, [
            item.product_id,
            'in',
            item.quantity,
            previousStock,
            newStock,
            'purchase',
            purchaseResult.id,
            purchase.supplier_id,
            item.unit_price,
            item.total_price,
            purchase.currency || 'TRY',
            `Alım - ${productName} - Tedarikçi: ${supplierName}`,
            'Sistem'
          ]);

          console.log('✅ Material movement oluşturuldu');
        } else {
          await query(`
            INSERT INTO stock_movements (
              product_id, movement_type, quantity, previous_stock, new_stock, 
              reference_type, reference_id, unit_price, total_amount, currency, notes, "user"
            ) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
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
            purchase.currency || 'TRY',
            `Alım - ${productName} - Tedarikçi: ${supplierName}`,
            'Sistem'
          ]);
        }
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


// ============================================
// BACKUP HANDLERS
// ============================================

// Backup işlemini başlat
ipcMain.handle('backup:start', async (event) => {
  try {
    const result = await s3Backup.performBackup((message, progress) => {
      // Progress güncellemelerini frontend'e gönder
      event.sender.send('backup:progress', { message, progress });
    });

    if (result.success) {
      await s3Backup.saveLastBackupDate();
    }

    return result;
  } catch (error) {
    console.error('Backup handler error:', error);
    return {
      success: false,
      message: error.message
    };
  }
});

// Bugün yedekleme gerekli mi kontrol et
ipcMain.handle('backup:check-needed', async () => {
  try {
    const needed = await s3Backup.isBackupNeededToday();
    return { needed };
  } catch (error) {
    console.error('Backup check error:', error);
    return { needed: false };
  }
});

// Son yedekleme tarihini al
ipcMain.handle('backup:get-last-date', async () => {
  try {
    const lastDate = await s3Backup.getLastBackupDate();
    return { lastDate };
  } catch (error) {
    return { lastDate: null };
  }
});

// Yedek geri yükleme
ipcMain.handle('backup:restore', async (_, filePath) => {
  try {
    const { exec } = require('child_process');
    const path = require('path');
    const fs = require('fs');

    const dbHost = process.env.DB_HOST || 'localhost';
    const dbPort = process.env.DB_PORT || '5432';
    const dbName = process.env.DB_NAME || 'duha_deri_db';
    const dbUser = process.env.DB_USER || 'postgres';
    const dbPassword = process.env.DB_PASSWORD || '';

    // Dosya uzantısını kontrol et
    const fileExtension = path.extname(filePath).toLowerCase();
    const isSqlFile = fileExtension === '.sql';

    // Windows için PostgreSQL araçları
    const pgRestorePath = `"C:\\Program Files\\PostgreSQL\\16\\bin\\pg_restore.exe"`;
    const psqlPath = `"C:\\Program Files\\PostgreSQL\\16\\bin\\psql.exe"`;

    // Veritabanı yönetim komutları
    const dropCommand = `${psqlPath} -h ${dbHost} -p ${dbPort} -U ${dbUser} -d postgres -c "DROP DATABASE IF EXISTS ${dbName};"`;
    const createCommand = `${psqlPath} -h ${dbHost} -p ${dbPort} -U ${dbUser} -d postgres -c "CREATE DATABASE ${dbName};"`;

    const env = { ...process.env };
    if (dbPassword) env.PGPASSWORD = dbPassword;

    return new Promise((resolve, reject) => {
      console.log(`📦 Yedek geri yükleniyor: ${filePath}`);
      console.log(`📄 Dosya formatı: ${isSqlFile ? 'SQL' : 'Custom (binary)'}`);

      // 1. Veritabanını sil
      exec(dropCommand, { env }, (error) => {
        if (error) {
          console.error('Drop database error:', error);
          // Devam et, veritabanı zaten yoksa hata verir
        }

        // 2. Yeni veritabanı oluştur
        exec(createCommand, { env }, (error) => {
          if (error) {
            console.error('Create database error:', error);
            reject(new Error('Veritabanı oluşturulamadı'));
            return;
          }

          // 3. Yedeği geri yükle - dosya formatına göre
          let restoreCommand;

          if (isSqlFile) {
            // SQL dosyası için psql kullan
            restoreCommand = `${psqlPath} -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -f "${filePath}"`;
            console.log('🔄 SQL dosyası geri yükleniyor (psql)...');
          } else {
            // Custom format için pg_restore kullan
            restoreCommand = `${pgRestorePath} -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -v "${filePath}"`;
            console.log('🔄 Custom format geri yükleniyor (pg_restore)...');
          }

          exec(restoreCommand, { env, maxBuffer: 50 * 1024 * 1024 }, (error, stdout, stderr) => {
            if (error) {
              console.error('Restore error:', error);
              console.error('stderr:', stderr);
              reject(new Error('Yedek geri yüklenemedi: ' + error.message));
              return;
            }

            if (stderr && !stderr.includes('WARNING')) {
              console.warn('⚠️ Restore warnings:', stderr);
            }

            console.log('✅ Yedek başarıyla geri yüklendi');
            resolve({
              success: true,
              message: 'Yedek başarıyla geri yüklendi'
            });
          });
        });
      });
    });
  } catch (error) {
    console.error('Restore handler error:', error);
    return {
      success: false,
      message: error.message
    };
  }
});


// Müşteriye özel satışları getir (toplam ile)
ipcMain.handle('sales:get-by-customer', async (_, customerId, startDate, endDate) => {
  try {
    let queryText = `
      SELECT 
        s.*,
        c.name as customer_name,
        si.product_id,
        si.product_name,
        si.color,
        si.quantity_pieces,
        si.quantity_desi,
        si.unit_price_per_desi,
        si.total_price,
        si.unit,
        p.category
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN sale_items si ON s.id = si.sale_id
      LEFT JOIN products p ON si.product_id = p.id
      WHERE s.customer_id = $1
    `;

    const params = [customerId];

    // Tarih filtresi ekle
    if (startDate && endDate) {
      queryText += ' AND DATE(s.sale_date) BETWEEN $2 AND $3';
      params.push(startDate, endDate);
    }

    queryText += ' ORDER BY s.created_at DESC';

    const result = await queryAll(queryText, params);

    // Toplam hesapla (para birimi bazında)
    const totals = {};
    const processedSales = new Set();

    result.forEach(row => {
      // Her satışı sadece bir kez say (sale_items join'i nedeniyle tekrar edebilir)
      if (!processedSales.has(row.id)) {
        processedSales.add(row.id);
        const currency = row.currency || 'TRY';
        if (!totals[currency]) {
          totals[currency] = 0;
        }
        totals[currency] += parseFloat(row.total_amount) || 0;
      }
    });

    return {
      success: true,
      data: result,
      totals: totals // { TRY: 5000, USD: 1000, EUR: 500 }
    };
  } catch (error) {
    console.error('sales:get-by-customer error:', error);
    return { success: false, error: error.message };
  }
});

// ==================== ÇEK-SENET İŞLEMLERİ ====================

// Çek-Senet işlemlerini getir
ipcMain.handle('get-check-transactions', async () => {
  try {
    const result = await queryAll(`
      SELECT ct.*, c.name as customer_name 
      FROM check_transactions ct
      LEFT JOIN customers c ON ct.customer_id = c.id
      ORDER BY ct.created_at DESC
    `);
    return { success: true, data: result };
  } catch (error) {
    console.error('Çek işlemleri getirme hatası:', error);
    return { success: false, error: error.message };
  }
});

// Çek-Senet işlemi ekle
ipcMain.handle('add-check-transaction', async (event, transaction) => {
  try {
    // Sıra numarası oluştur
    const year = new Date().getFullYear();
    const checkTypePrefix = transaction.check_type === 'check' ? 'C' : 'S';
    
    // Son sıra numarasını al
    const lastSeq = await queryOne(`
      SELECT sequence_number 
      FROM check_transactions 
      WHERE check_type = $1 
      AND sequence_number LIKE $2
      ORDER BY id DESC 
      LIMIT 1
    `, [transaction.check_type, `${checkTypePrefix}${year}%`]);
    
    let sequenceNumber;
    if (lastSeq && lastSeq.sequence_number) {
      const lastNum = parseInt(lastSeq.sequence_number.split('-')[1]);
      sequenceNumber = `${checkTypePrefix}${year}-${String(lastNum + 1).padStart(4, '0')}`;
    } else {
      sequenceNumber = `${checkTypePrefix}${year}-0001`;
    }
    
    const result = await queryOne(`
      INSERT INTO check_transactions (
        sequence_number, is_official, type, amount, currency, check_type, check_number, received_date, 
        received_from, first_endorser, last_endorser, bank_name, branch_name,
        due_date, account_number, description, customer_id, customer_name, payment_id, status,
        is_converted, received_converted_currency, received_converted_amount,
        given_converted_currency, given_converted_amount
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
      RETURNING *
    `, [
      sequenceNumber,
      transaction.is_official !== undefined ? transaction.is_official : true,
      transaction.type,
      transaction.amount,
      transaction.currency || 'TRY',
      transaction.check_type,
      transaction.check_number,
      transaction.received_date,
      transaction.received_from,
      transaction.first_endorser,
      transaction.last_endorser,
      transaction.bank_name,
      transaction.branch_name,
      transaction.due_date,
      transaction.account_number,
      transaction.description,
      transaction.customer_id,
      transaction.customer_name,
      transaction.payment_id || null,
      transaction.status || 'active',
      transaction.is_converted || false,
      transaction.received_converted_currency || null,
      transaction.received_converted_amount || null,
      transaction.given_converted_currency || null,
      transaction.given_converted_amount || null
    ]);
    return { success: true, data: result };
  } catch (error) {
    console.error('Çek işlemi ekleme hatası:', error);
    return { success: false, error: error.message };
  }
});

// Çek-Senet işlemi güncelle
ipcMain.handle('update-check-transaction', async (event, id, transaction) => {
  try {
    const result = await queryOne(`
      UPDATE check_transactions 
      SET is_official = $1, type = $2, amount = $3, currency = $4, check_type = $5, 
          check_number = $6, received_date = $7, received_from = $8,
          first_endorser = $9, last_endorser = $10, bank_name = $11, 
          branch_name = $12, due_date = $13, account_number = $14,
          description = $15, customer_name = $16, is_cashed = $17,
          cashed_at = $18, status = $19, is_converted = $20,
          original_currency = $21, original_amount = $22, 
          conversion_rate = $23, converted_amount = $24,
          protested_at = $25, protest_reason = $26,
          received_converted_currency = $27, received_converted_amount = $28,
          given_converted_currency = $29, given_converted_amount = $30,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $31
      RETURNING *
    `, [
      transaction.is_official !== undefined ? transaction.is_official : true,
      transaction.type,
      transaction.amount,
      transaction.currency || 'TRY',
      transaction.check_type,
      transaction.check_number,
      transaction.received_date,
      transaction.received_from,
      transaction.first_endorser,
      transaction.last_endorser,
      transaction.bank_name,
      transaction.branch_name,
      transaction.due_date,
      transaction.account_number,
      transaction.description,
      transaction.customer_name,
      transaction.is_cashed || false,
      transaction.cashed_at || null,
      transaction.status || 'active',
      transaction.is_converted || false,
      transaction.original_currency || null,
      transaction.original_amount || null,
      transaction.conversion_rate || null,
      transaction.converted_amount || null,
      transaction.protested_at || null,
      transaction.protest_reason || null,
      transaction.received_converted_currency || null,
      transaction.received_converted_amount || null,
      transaction.given_converted_currency || null,
      transaction.given_converted_amount || null,
      id
    ]);
    
    if (!result) {
      return { success: false, error: 'İşlem bulunamadı' };
    }
    
    return { success: true, data: result };
  } catch (error) {
    console.error('Çek işlemi güncelleme hatası:', error);
    return { success: false, error: error.message };
  }
});

// Çek-Senet işlemi sil
ipcMain.handle('delete-check-transaction', async (event, id) => {
  try {
    const result = await queryOne(
      'DELETE FROM check_transactions WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (!result) {
      return { success: false, error: 'İşlem bulunamadı' };
    }
    
    return { success: true, data: result };
  } catch (error) {
    console.error('Çek işlemi silme hatası:', error);
    return { success: false, error: error.message };
  }
});
