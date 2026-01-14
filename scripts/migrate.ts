import { createClient } from "@libsql/client";
import * as fs from "fs";
import * as path from "path";

async function migrate() {
  const isProduction = process.env.NODE_ENV === "production";
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  const db =
    isProduction && url && authToken
      ? createClient({ url, authToken })
      : createClient({ url: "file:local.db" });

  console.log("Running migrations...");

  const migrationsDir = path.join(process.cwd(), "migrations");
  const files = fs.readdirSync(migrationsDir).sort();

  for (const file of files) {
    if (file.endsWith(".sql")) {
      console.log(`Applying ${file}...`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");

      // Better SQL splitting - handle multi-line statements
      const statements: string[] = [];
      let current = "";
      let inCreateTable = false;

      for (const line of sql.split("\n")) {
        const trimmed = line.trim();

        // Skip empty lines and comments
        if (!trimmed || trimmed.startsWith("--")) continue;

        current += " " + trimmed;

        // Track if we're inside a CREATE TABLE statement
        if (trimmed.toUpperCase().startsWith("CREATE TABLE")) {
          inCreateTable = true;
        }

        // End of statement
        if (trimmed.endsWith(";")) {
          if (inCreateTable && trimmed === ");") {
            inCreateTable = false;
          }
          if (!inCreateTable) {
            statements.push(current.trim());
            current = "";
          }
        }
      }

      if (current.trim()) {
        statements.push(current.trim());
      }

      for (const statement of statements) {
        if (!statement || statement === ";") continue;

        try {
          await db.execute(statement);
          console.log(`  ✓ ${statement.substring(0, 50).replace(/\s+/g, " ")}...`);
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          // Ignore "already exists" errors
          if (!msg.includes("already exists")) {
            console.error(`  ✗ Error: ${msg}`);
            console.error(`    Statement: ${statement.substring(0, 100)}...`);
          }
        }
      }
      console.log(`✓ ${file} completed`);
    }
  }

  // Verify tables exist
  console.log("\nVerifying tables...");
  const tables = await db.execute(
    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
  );
  console.log(
    "Tables:",
    tables.rows.map((r) => r.name).join(", ")
  );

  console.log("\nMigrations completed!");
  process.exit(0);
}

migrate().catch(console.error);
