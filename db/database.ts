import * as SQLite from "expo-sqlite";
import { SCHEMA_STATEMENTS } from "@/db/schema";

const DB_NAME = "smartspend_v1.db";

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;
let initialized = false;

async function ensureColumn(
  db: SQLite.SQLiteDatabase,
  table: string,
  column: string,
  definition: string,
): Promise<void> {
  const rows = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table});`);
  if (rows.some((row) => row.name === column)) return;
  await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition};`);
}

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DB_NAME);
  }
  return dbPromise;
}

export async function initDatabase(): Promise<void> {
  if (initialized) return;

  const db = await getDb();
  await db.execAsync("PRAGMA foreign_keys = ON;");

  for (const statement of SCHEMA_STATEMENTS) {
    await db.execAsync(statement);
  }

  await ensureColumn(db, "daily_nutrition_logs", "confidence_score", "REAL");
  await ensureColumn(db, "daily_nutrition_logs", "source", "TEXT");

  initialized = true;
}
