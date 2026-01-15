-- Households for shared accounts
CREATE TABLE IF NOT EXISTS households (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Household members
CREATE TABLE IF NOT EXISTS household_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  household_id INTEGER NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  joined_at TEXT DEFAULT (datetime('now')),
  UNIQUE(household_id, user_id)
);

-- Household invites
CREATE TABLE IF NOT EXISTS household_invites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  household_id INTEGER NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  invited_by INTEGER NOT NULL REFERENCES users(id),
  expires_at TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  created_at TEXT DEFAULT (datetime('now'))
);

-- Add household_id to existing tables
ALTER TABLE products ADD COLUMN household_id INTEGER REFERENCES households(id);
ALTER TABLE inventory ADD COLUMN household_id INTEGER REFERENCES households(id);
ALTER TABLE transactions ADD COLUMN household_id INTEGER REFERENCES households(id);
ALTER TABLE transactions ADD COLUMN actor_id INTEGER REFERENCES users(id);
ALTER TABLE shopping_list ADD COLUMN household_id INTEGER REFERENCES households(id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_household_members_user ON household_members(user_id);
CREATE INDEX IF NOT EXISTS idx_household_members_household ON household_members(household_id);
CREATE INDEX IF NOT EXISTS idx_household_invites_token ON household_invites(token);
CREATE INDEX IF NOT EXISTS idx_household_invites_email ON household_invites(email);
CREATE INDEX IF NOT EXISTS idx_products_household ON products(household_id);
CREATE INDEX IF NOT EXISTS idx_inventory_household ON inventory(household_id);
CREATE INDEX IF NOT EXISTS idx_transactions_household ON transactions(household_id);
CREATE INDEX IF NOT EXISTS idx_shopping_list_household ON shopping_list(household_id);
