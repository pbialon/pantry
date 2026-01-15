import { db } from "./client";

// Helper to run migrations - must NOT be imported in Edge Runtime contexts
export async function runMigrations() {
  const fs = await import("fs");
  const path = await import("path");

  const migrationsDir = path.join(process.cwd(), "migrations");
  const files = fs.readdirSync(migrationsDir).sort();

  for (const file of files) {
    if (file.endsWith(".sql")) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
      // Split by semicolon and execute each statement
      const statements = sql
        .split(";")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      for (const statement of statements) {
        await db.execute(statement);
      }
      console.log(`Migration ${file} completed`);
    }
  }
}
