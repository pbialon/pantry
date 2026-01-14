import { z } from "zod";

// Category schema
export const categorySchema = z.object({
  id: z.number(),
  name: z.string(),
  parent_id: z.number().nullable(),
  icon: z.string().nullable(),
  default_expiry_days: z.number().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Category = z.infer<typeof categorySchema>;

// Product schema
export const productSchema = z.object({
  id: z.number(),
  barcode: z.string().nullable(),
  name: z.string(),
  brand: z.string().nullable(),
  category_id: z.number().nullable(),
  default_quantity_unit: z.string().default("units"),
  image_url: z.string().nullable(),
  nutrition_info: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Product = z.infer<typeof productSchema>;

// Inventory item schema
export const inventoryItemSchema = z.object({
  id: z.number(),
  product_id: z.number(),
  quantity: z.number(),
  quantity_unit: z.string().default("units"),
  expiry_date: z.string().nullable(),
  location: z.string().nullable(),
  purchase_date: z.string().nullable(),
  purchase_price: z.number().nullable(),
  notes: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type InventoryItem = z.infer<typeof inventoryItemSchema>;

// Transaction schema
export const transactionSchema = z.object({
  id: z.number(),
  product_id: z.number(),
  inventory_id: z.number().nullable(),
  type: z.enum(["add", "remove", "adjust", "expire"]),
  quantity: z.number(),
  source: z.enum(["manual", "barcode", "receipt", "import"]),
  receipt_id: z.number().nullable(),
  notes: z.string().nullable(),
  created_at: z.string(),
});

export type Transaction = z.infer<typeof transactionSchema>;

// Receipt schema
export const receiptSchema = z.object({
  id: z.number(),
  store_name: z.string().nullable(),
  purchase_date: z.string().nullable(),
  total_amount: z.number().nullable(),
  image_url: z.string().nullable(),
  raw_ocr_text: z.string().nullable(),
  parsed_items: z.string().nullable(),
  processing_status: z.enum(["pending", "processed", "failed"]).default("pending"),
  created_at: z.string(),
});

export type Receipt = z.infer<typeof receiptSchema>;

// Input schemas for creating/updating
export const createProductInput = z.object({
  barcode: z.string().optional(),
  name: z.string().min(1),
  brand: z.string().optional(),
  category_id: z.number().optional(),
  default_quantity_unit: z.string().default("units"),
  image_url: z.string().url().optional(),
});

export type CreateProductInput = z.infer<typeof createProductInput>;

export const addToInventoryInput = z.object({
  product_id: z.number(),
  quantity: z.number().positive(),
  quantity_unit: z.string().default("units"),
  expiry_date: z.string().optional(),
  location: z.enum(["pantry", "fridge", "freezer"]).optional(),
  purchase_date: z.string().optional(),
  purchase_price: z.number().optional(),
  source: z.enum(["manual", "barcode", "receipt", "import"]).default("manual"),
});

export type AddToInventoryInput = z.infer<typeof addToInventoryInput>;

// Default categories
export const DEFAULT_CATEGORIES = [
  { name: "Nabial i jajka", icon: "milk", default_expiry_days: 14 },
  { name: "Mieso i ryby", icon: "beef", default_expiry_days: 5 },
  { name: "Warzywa i owoce", icon: "salad", default_expiry_days: 7 },
  { name: "Pieczywo", icon: "croissant", default_expiry_days: 5 },
  { name: "Spizarnia", icon: "cookie", default_expiry_days: 365 },
  { name: "Konserwy", icon: "soup", default_expiry_days: 730 },
  { name: "Mrozonki", icon: "snowflake", default_expiry_days: 180 },
  { name: "Napoje", icon: "cup-soda", default_expiry_days: 90 },
  { name: "Przekaski", icon: "popcorn", default_expiry_days: 60 },
  { name: "Przyprawy", icon: "flame", default_expiry_days: 365 },
  { name: "Chemia domowa", icon: "sparkles", default_expiry_days: null },
] as const;

// Inventory with product info (joined)
export interface InventoryWithProduct extends InventoryItem {
  product: Product;
  category?: Category;
}

// Transaction with product info (joined)
export interface TransactionWithProduct extends Transaction {
  product: Product;
}
