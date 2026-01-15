import { db } from "./client";
import type {
  Category,
  Product,
  InventoryItem,
  Transaction,
  InventoryWithProduct,
  CreateProductInput,
  AddToInventoryInput,
} from "./schema";

// Categories (shared across all users)
export async function getCategories(): Promise<Category[]> {
  const result = await db.execute("SELECT * FROM categories ORDER BY name");
  return result.rows as unknown as Category[];
}

export async function getCategoryById(id: number): Promise<Category | null> {
  const result = await db.execute({
    sql: "SELECT * FROM categories WHERE id = ?",
    args: [id],
  });
  return (result.rows[0] as unknown as Category) || null;
}

export async function getCategoryByName(name: string): Promise<Category | null> {
  const result = await db.execute({
    sql: "SELECT * FROM categories WHERE name = ? OR name LIKE ?",
    args: [name, `%${name}%`],
  });
  return (result.rows[0] as unknown as Category) || null;
}

// Products (user-scoped)
export async function getProducts(userId: number): Promise<Product[]> {
  const result = await db.execute({
    sql: "SELECT * FROM products WHERE user_id = ? ORDER BY name",
    args: [userId],
  });
  return result.rows as unknown as Product[];
}

export async function getProductById(id: number, userId: number): Promise<Product | null> {
  const result = await db.execute({
    sql: "SELECT * FROM products WHERE id = ? AND user_id = ?",
    args: [id, userId],
  });
  return (result.rows[0] as unknown as Product) || null;
}

export async function getProductByBarcode(barcode: string, userId: number): Promise<Product | null> {
  const result = await db.execute({
    sql: "SELECT * FROM products WHERE barcode = ? AND user_id = ?",
    args: [barcode, userId],
  });
  return (result.rows[0] as unknown as Product) || null;
}

export async function createProduct(input: CreateProductInput, userId: number): Promise<Product> {
  const result = await db.execute({
    sql: `INSERT INTO products (barcode, name, brand, category_id, default_quantity_unit, image_url, user_id)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          RETURNING *`,
    args: [
      input.barcode || null,
      input.name,
      input.brand || null,
      input.category_id || null,
      input.default_quantity_unit || "units",
      input.image_url || null,
      userId,
    ],
  });
  return result.rows[0] as unknown as Product;
}

export async function updateProduct(
  id: number,
  input: Partial<CreateProductInput>,
  userId: number
): Promise<Product | null> {
  const updates: string[] = [];
  const args: (string | number | null)[] = [];

  if (input.barcode !== undefined) {
    updates.push("barcode = ?");
    args.push(input.barcode || null);
  }
  if (input.name !== undefined) {
    updates.push("name = ?");
    args.push(input.name);
  }
  if (input.brand !== undefined) {
    updates.push("brand = ?");
    args.push(input.brand || null);
  }
  if (input.category_id !== undefined) {
    updates.push("category_id = ?");
    args.push(input.category_id || null);
  }
  if (input.image_url !== undefined) {
    updates.push("image_url = ?");
    args.push(input.image_url || null);
  }

  if (updates.length === 0) return getProductById(id, userId);

  updates.push("updated_at = datetime('now')");
  args.push(id, userId);

  const result = await db.execute({
    sql: `UPDATE products SET ${updates.join(", ")} WHERE id = ? AND user_id = ? RETURNING *`,
    args,
  });
  return (result.rows[0] as unknown as Product) || null;
}

// Inventory (user-scoped)
export async function getInventory(userId: number): Promise<InventoryWithProduct[]> {
  const result = await db.execute({
    sql: `
    SELECT
      i.*,
      p.barcode as product_barcode,
      p.name as product_name,
      p.brand as product_brand,
      p.category_id as product_category_id,
      p.image_url as product_image_url,
      c.name as category_name,
      c.icon as category_icon
    FROM inventory i
    JOIN products p ON i.product_id = p.id
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE i.user_id = ?
    ORDER BY i.expiry_date ASC NULLS LAST
  `,
    args: [userId],
  });

  return result.rows.map((row: Record<string, unknown>) => ({
    id: row.id as number,
    product_id: row.product_id as number,
    quantity: row.quantity as number,
    quantity_unit: row.quantity_unit as string,
    expiry_date: row.expiry_date as string | null,
    location: row.location as string | null,
    purchase_date: row.purchase_date as string | null,
    purchase_price: row.purchase_price as number | null,
    notes: row.notes as string | null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    product: {
      id: row.product_id as number,
      barcode: row.product_barcode as string | null,
      name: row.product_name as string,
      brand: row.product_brand as string | null,
      category_id: row.product_category_id as number | null,
      image_url: row.product_image_url as string | null,
      default_quantity_unit: "units",
      nutrition_info: null,
      created_at: "",
      updated_at: "",
    },
    category: row.category_name
      ? {
          id: row.product_category_id as number,
          name: row.category_name as string,
          icon: row.category_icon as string | null,
          parent_id: null,
          default_expiry_days: null,
          created_at: "",
          updated_at: "",
        }
      : undefined,
  }));
}

export async function getExpiringItems(days: number = 7, userId: number): Promise<InventoryWithProduct[]> {
  const inventory = await getInventory(userId);
  const now = new Date();
  const threshold = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  return inventory.filter((item) => {
    if (!item.expiry_date) return false;
    const expiry = new Date(item.expiry_date);
    return expiry <= threshold;
  });
}

export async function addToInventory(input: AddToInventoryInput, userId: number): Promise<InventoryItem> {
  // Check if product already exists in inventory (same product, location, and expiry)
  const existingResult = await db.execute({
    sql: `SELECT * FROM inventory
          WHERE product_id = ?
          AND user_id = ?
          AND (location IS ? OR (location IS NULL AND ? IS NULL))
          AND (expiry_date IS ? OR (expiry_date IS NULL AND ? IS NULL))
          LIMIT 1`,
    args: [
      input.product_id,
      userId,
      input.location || null,
      input.location || null,
      input.expiry_date || null,
      input.expiry_date || null,
    ],
  });

  const existing = existingResult.rows[0] as unknown as InventoryItem | undefined;

  let item: InventoryItem;

  if (existing) {
    // Update existing entry - increment quantity
    const newQuantity = existing.quantity + input.quantity;
    const updateResult = await db.execute({
      sql: `UPDATE inventory SET quantity = ?, updated_at = datetime('now') WHERE id = ? RETURNING *`,
      args: [newQuantity, existing.id],
    });
    item = updateResult.rows[0] as unknown as InventoryItem;
  } else {
    // Create new entry
    const result = await db.execute({
      sql: `INSERT INTO inventory (product_id, quantity, quantity_unit, expiry_date, location, purchase_date, purchase_price, user_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING *`,
      args: [
        input.product_id,
        input.quantity,
        input.quantity_unit || "units",
        input.expiry_date || null,
        input.location || null,
        input.purchase_date || null,
        input.purchase_price || null,
        userId,
      ],
    });
    item = result.rows[0] as unknown as InventoryItem;
  }

  // Record transaction
  await db.execute({
    sql: `INSERT INTO transactions (product_id, inventory_id, type, quantity, source, user_id)
          VALUES (?, ?, 'add', ?, ?, ?)`,
    args: [input.product_id, item.id, input.quantity, input.source || "manual", userId],
  });

  return item;
}

export async function removeFromInventory(
  inventoryId: number,
  quantity: number,
  source: "manual" | "barcode" | "receipt" | "import" = "manual",
  userId: number
): Promise<InventoryItem | null> {
  // Get current item (verify ownership)
  const currentResult = await db.execute({
    sql: "SELECT * FROM inventory WHERE id = ? AND user_id = ?",
    args: [inventoryId, userId],
  });
  const current = currentResult.rows[0] as unknown as InventoryItem;
  if (!current) return null;

  const newQuantity = current.quantity - quantity;

  if (newQuantity <= 0) {
    // Record transaction first (before deleting inventory)
    await db.execute({
      sql: `INSERT INTO transactions (product_id, inventory_id, type, quantity, source, user_id)
            VALUES (?, NULL, 'remove', ?, ?, ?)`,
      args: [current.product_id, current.quantity, source, userId],
    });

    // Clear inventory_id references in old transactions
    await db.execute({
      sql: "UPDATE transactions SET inventory_id = NULL WHERE inventory_id = ?",
      args: [inventoryId],
    });

    // Now safe to delete inventory item
    await db.execute({
      sql: "DELETE FROM inventory WHERE id = ?",
      args: [inventoryId],
    });

    return { ...current, quantity: 0 };
  }

  // Update quantity
  const result = await db.execute({
    sql: `UPDATE inventory SET quantity = ?, updated_at = datetime('now') WHERE id = ? RETURNING *`,
    args: [newQuantity, inventoryId],
  });

  // Record transaction
  await db.execute({
    sql: `INSERT INTO transactions (product_id, inventory_id, type, quantity, source, user_id)
          VALUES (?, ?, 'remove', ?, ?, ?)`,
    args: [current.product_id, inventoryId, quantity, source, userId],
  });

  return result.rows[0] as unknown as InventoryItem;
}

// Transactions (user-scoped)
export async function getRecentTransactions(limit: number = 20, userId: number): Promise<Transaction[]> {
  const result = await db.execute({
    sql: `SELECT t.*, p.name as product_name
          FROM transactions t
          JOIN products p ON t.product_id = p.id
          WHERE t.user_id = ?
          ORDER BY t.created_at DESC
          LIMIT ?`,
    args: [userId, limit],
  });
  return result.rows as unknown as Transaction[];
}

interface TransactionFilters {
  limit?: number;
  type?: string;
  source?: string;
  search?: string;
}

export async function getFilteredTransactions(filters: TransactionFilters, userId: number): Promise<Transaction[]> {
  const { limit = 50, type, source, search } = filters;

  let sql = `SELECT t.*, p.name as product_name
             FROM transactions t
             JOIN products p ON t.product_id = p.id
             WHERE t.user_id = ?`;
  const args: (string | number)[] = [userId];

  if (type) {
    sql += ` AND t.type = ?`;
    args.push(type);
  }

  if (source) {
    sql += ` AND t.source = ?`;
    args.push(source);
  }

  if (search) {
    sql += ` AND p.name LIKE ?`;
    args.push(`%${search}%`);
  }

  sql += ` ORDER BY t.created_at DESC LIMIT ?`;
  args.push(limit);

  const result = await db.execute({ sql, args });
  return result.rows as unknown as Transaction[];
}

// Search similar products for matching
export async function searchSimilarProducts(
  name: string,
  brand: string | null,
  userId: number
): Promise<Product[]> {
  // Extract keywords from name (words longer than 2 chars)
  const keywords = name
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2);

  if (keywords.length === 0) {
    return [];
  }

  // Build search conditions for each keyword
  const conditions: string[] = [];
  const args: (string | number)[] = [userId];

  // Match against product name
  keywords.forEach((keyword) => {
    conditions.push(`LOWER(name) LIKE ?`);
    args.push(`%${keyword}%`);
  });

  // Match against brand if provided
  if (brand) {
    conditions.push(`LOWER(brand) LIKE ?`);
    args.push(`%${brand.toLowerCase()}%`);
  }

  const result = await db.execute({
    sql: `SELECT * FROM products
          WHERE user_id = ?
          AND (${conditions.join(" OR ")})
          ORDER BY name
          LIMIT 10`,
    args,
  });

  return result.rows as unknown as Product[];
}

// Stats (user-scoped)
export async function getStats(userId: number) {
  const [totalProducts, expiringCount, lowStockCount, categoriesCount] = await Promise.all([
    db.execute({
      sql: "SELECT COUNT(*) as count FROM inventory WHERE quantity > 0 AND user_id = ?",
      args: [userId],
    }),
    db.execute({
      sql: `
      SELECT COUNT(*) as count FROM inventory
      WHERE expiry_date IS NOT NULL
      AND date(expiry_date) <= date('now', '+7 days')
      AND quantity > 0
      AND user_id = ?
    `,
      args: [userId],
    }),
    db.execute({
      sql: "SELECT COUNT(*) as count FROM inventory WHERE quantity > 0 AND quantity <= 1 AND user_id = ?",
      args: [userId],
    }),
    db.execute({
      sql: "SELECT COUNT(DISTINCT category_id) as count FROM products WHERE category_id IS NOT NULL AND user_id = ?",
      args: [userId],
    }),
  ]);

  return {
    totalProducts: (totalProducts.rows[0] as unknown as { count: number }).count,
    expiringCount: (expiringCount.rows[0] as unknown as { count: number }).count,
    lowStockCount: (lowStockCount.rows[0] as unknown as { count: number }).count,
    categoriesCount: (categoriesCount.rows[0] as unknown as { count: number }).count,
  };
}
