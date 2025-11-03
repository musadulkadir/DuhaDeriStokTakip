-- DUHA DERİ STOK TAKİP - TEMİZ VERİTABANI ŞEMASI
-- Tüm tabloları sil ve yeniden oluştur

-- Önce tüm tabloları sil
DROP TABLE IF EXISTS employee_payments CASCADE;
DROP TABLE IF EXISTS material_movements CASCADE;
DROP TABLE IF EXISTS stock_movements CASCADE;
DROP TABLE IF EXISTS cash_transactions CASCADE;
DROP TABLE IF EXISTS purchase_items CASCADE;
DROP TABLE IF EXISTS purchases CASCADE;
DROP TABLE IF EXISTS customer_payments CASCADE;
DROP TABLE IF EXISTS sale_items CASCADE;
DROP TABLE IF EXISTS sales CASCADE;
DROP TABLE IF EXISTS returns CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS materials CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS settings CASCADE;
DROP TABLE IF EXISTS colors CASCADE;
DROP TABLE IF EXISTS categories CASCADE;

-- Customers (Müşteriler ve Tedarikçiler)
CREATE TABLE customers (
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
);

-- Products (Sadece Keçi ve Koyun)
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  color VARCHAR(50),
  stock_quantity INTEGER DEFAULT 0,
  unit VARCHAR(20) DEFAULT 'adet',
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Materials (Boya, Cila, Binder)
CREATE TABLE materials (
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
);

-- Employees
CREATE TABLE employees (
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
);

-- Sales
CREATE TABLE sales (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id),
  total_amount DECIMAL(15,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'TRY',
  payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('paid', 'partial', 'pending')),
  sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sale Items (Detaylı kategoriler burada: Keçi-Palto, Keçi-Oğlak, Çoraplık)
CREATE TABLE sale_items (
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
);

-- Customer Payments
CREATE TABLE customer_payments (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id),
  amount DECIMAL(15,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'TRY',
  payment_type VARCHAR(50),
  payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Purchases
CREATE TABLE purchases (
  id SERIAL PRIMARY KEY,
  supplier_id INTEGER REFERENCES customers(id),
  total_amount DECIMAL(15,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'TRY',
  purchase_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Purchase Items
CREATE TABLE purchase_items (
  id SERIAL PRIMARY KEY,
  purchase_id INTEGER REFERENCES purchases(id) ON DELETE CASCADE,
  product_id INTEGER,
  quantity DECIMAL(10,2) NOT NULL,
  unit_price DECIMAL(15,2) NOT NULL,
  total_price DECIMAL(15,2) NOT NULL,
  brand VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cash Transactions
CREATE TABLE cash_transactions (
  id SERIAL PRIMARY KEY,
  type VARCHAR(10) CHECK (type IN ('in', 'out')),
  amount DECIMAL(15,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'TRY',
  category VARCHAR(100),
  description TEXT,
  reference_type VARCHAR(50),
  reference_id INTEGER,
  customer_id INTEGER REFERENCES customers(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "user" VARCHAR(255)
);

-- Stock Movements
CREATE TABLE stock_movements (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id),
  movement_type VARCHAR(20) CHECK (movement_type IN ('in', 'out', 'adjustment')),
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
);

-- Material Movements
CREATE TABLE material_movements (
  id SERIAL PRIMARY KEY,
  material_id INTEGER REFERENCES materials(id),
  movement_type VARCHAR(20) CHECK (movement_type IN ('in', 'out', 'adjustment')),
  quantity DECIMAL(10,2) NOT NULL,
  previous_stock DECIMAL(10,2),
  new_stock DECIMAL(10,2),
  reference_type VARCHAR(50),
  supplier_id INTEGER REFERENCES customers(id),
  unit_price DECIMAL(15,2),
  total_amount DECIMAL(15,2),
  currency VARCHAR(10) DEFAULT 'TRY',
  notes TEXT,
  "user" VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Employee Payments
CREATE TABLE employee_payments (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER REFERENCES employees(id),
  amount DECIMAL(15,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'TRY',
  payment_type VARCHAR(50),
  payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Returns
CREATE TABLE returns (
  id SERIAL PRIMARY KEY,
  sale_id INTEGER REFERENCES sales(id),
  customer_id INTEGER REFERENCES customers(id),
  product_id INTEGER REFERENCES products(id),
  quantity INTEGER NOT NULL,
  reason TEXT,
  return_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  refund_amount DECIMAL(15,2),
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Settings
CREATE TABLE settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- İlk ayarlar
INSERT INTO settings (key, value) VALUES ('app_password', NULL) ON CONFLICT (key) DO NOTHING;
INSERT INTO settings (key, value) VALUES ('password_enabled', 'false') ON CONFLICT (key) DO NOTHING;

-- NOT: Categories ve Colors tabloları YOK
-- Bunlar artık koddan geliyor (ProductManagement.tsx)

COMMIT;
