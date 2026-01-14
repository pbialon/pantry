-- Pantry Manager Database Schema
-- SQLite (Turso/libSQL)

-- Categories table (hierarchical)
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  parent_id INTEGER REFERENCES categories(id),
  icon TEXT,
  default_expiry_days INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Products table (product catalog)
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  barcode TEXT UNIQUE,
  name TEXT NOT NULL,
  brand TEXT,
  category_id INTEGER REFERENCES categories(id),
  default_quantity_unit TEXT DEFAULT 'units',
  image_url TEXT,
  nutrition_info TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Inventory table (current stock)
CREATE TABLE IF NOT EXISTS inventory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity REAL NOT NULL DEFAULT 1,
  quantity_unit TEXT DEFAULT 'units',
  expiry_date TEXT,
  location TEXT,
  purchase_date TEXT,
  purchase_price REAL,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Transactions table (history)
CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id),
  inventory_id INTEGER REFERENCES inventory(id),
  type TEXT NOT NULL CHECK (type IN ('add', 'remove', 'adjust', 'expire')),
  quantity REAL NOT NULL,
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'barcode', 'receipt', 'import')),
  receipt_id INTEGER REFERENCES receipts(id),
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Receipts table (for receipt scanning)
CREATE TABLE IF NOT EXISTS receipts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  store_name TEXT,
  purchase_date TEXT,
  total_amount REAL,
  image_url TEXT,
  raw_ocr_text TEXT,
  parsed_items TEXT,
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processed', 'failed')),
  created_at TEXT DEFAULT (datetime('now'))
);

-- Shopping list table (future feature)
CREATE TABLE IF NOT EXISTS shopping_list (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER REFERENCES products(id),
  product_name TEXT,
  quantity REAL DEFAULT 1,
  quantity_unit TEXT DEFAULT 'units',
  priority INTEGER DEFAULT 0,
  is_purchased INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_expiry ON inventory(expiry_date);
CREATE INDEX IF NOT EXISTS idx_inventory_location ON inventory(location);
CREATE INDEX IF NOT EXISTS idx_transactions_product ON transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);

-- Seed default categories
INSERT OR IGNORE INTO categories (id, name, icon, default_expiry_days) VALUES
  (1, 'Nabial i jajka', 'milk', 14),
  (2, 'Mieso i ryby', 'beef', 5),
  (3, 'Warzywa i owoce', 'salad', 7),
  (4, 'Pieczywo', 'croissant', 5),
  (5, 'Spizarnia', 'cookie', 365),
  (6, 'Konserwy', 'soup', 730),
  (7, 'Mrozonki', 'snowflake', 180),
  (8, 'Napoje', 'cup-soda', 90),
  (9, 'Przekaski', 'popcorn', 60),
  (10, 'Przyprawy', 'flame', 365),
  (11, 'Chemia domowa', 'sparkles', NULL);
