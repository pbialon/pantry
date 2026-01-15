-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Add user_id to existing tables
ALTER TABLE products ADD COLUMN user_id INTEGER REFERENCES users(id);
ALTER TABLE inventory ADD COLUMN user_id INTEGER REFERENCES users(id);
ALTER TABLE transactions ADD COLUMN user_id INTEGER REFERENCES users(id);
ALTER TABLE receipts ADD COLUMN user_id INTEGER REFERENCES users(id);
ALTER TABLE shopping_list ADD COLUMN user_id INTEGER REFERENCES users(id);

-- Create indexes for user queries
CREATE INDEX IF NOT EXISTS idx_products_user ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_user ON inventory(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
