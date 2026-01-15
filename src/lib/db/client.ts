import { createClient } from "@libsql/client";

// Environment variables for Turso connection
// Set these in .env.local:
// TURSO_DATABASE_URL=libsql://your-db-name.turso.io
// TURSO_AUTH_TOKEN=your-auth-token

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

// For local development, use a local SQLite file
const isProduction = process.env.NODE_ENV === "production";

function getDbClient() {
  if (isProduction && url && authToken) {
    return createClient({
      url,
      authToken,
    });
  }

  // Local development - use file-based SQLite
  return createClient({
    url: "file:local.db",
  });
}

// Singleton pattern to reuse connection
let dbInstance: ReturnType<typeof createClient> | null = null;

export function getDb() {
  if (!dbInstance) {
    dbInstance = getDbClient();
  }
  return dbInstance;
}

export const db = getDb();
