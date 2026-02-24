import * as SQLite from "expo-sqlite";
import { SCHEMA_STATEMENTS } from "@/db/schema";

const DB_NAME = "smartspend_v1.db";

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;
let initialized = false;

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

  initialized = true;
}
