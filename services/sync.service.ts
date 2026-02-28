import AsyncStorage from "@react-native-async-storage/async-storage";
import { getDb } from "@/db/database";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const SYNC_TIMESTAMP_KEY = "sync:lastTimestamp";
const DEVICE_ID_KEY = "sync:deviceId";
const SYNC_TIMEOUT_MS = 30000;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getApiUrl(): string | null {
  const url = process.env.EXPO_PUBLIC_API_URL?.trim();
  return url || null;
}

async function getDeviceId(): Promise<string> {
  let id = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = `device_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    await AsyncStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

/* ------------------------------------------------------------------ */
/*  Table queries — collect changed records since last sync            */
/* ------------------------------------------------------------------ */

interface TableQuery {
  table: string;
  sql: string;
}

function buildQueries(since: number): TableQuery[] {
  return [
    {
      table: "users",
      sql: `SELECT * FROM users WHERE MAX(created_at, updated_at) > ${since}`,
    },
    {
      table: "receipts",
      sql: `SELECT * FROM receipts WHERE created_at > ${since}`,
    },
    {
      table: "expense_items",
      sql: `SELECT * FROM expense_items WHERE created_at > ${since}`,
    },
    {
      table: "product_catalog",
      sql: `SELECT * FROM product_catalog WHERE MAX(created_at, updated_at) > ${since}`,
    },
    {
      table: "nutrition_profiles",
      sql: `SELECT * FROM nutrition_profiles WHERE created_at > ${since}`,
    },
    {
      table: "daily_nutrition_logs",
      sql: `SELECT * FROM daily_nutrition_logs WHERE created_at > ${since}`,
    },
    {
      table: "health_alerts",
      sql: `SELECT * FROM health_alerts WHERE triggered_at > ${since}`,
    },
    {
      table: "categories",
      sql: "SELECT * FROM categories", // always sync all (small table)
    },
    {
      table: "household_profiles",
      sql: `SELECT * FROM household_profiles WHERE MAX(created_at, updated_at) > ${since}`,
    },
    {
      table: "family_members",
      sql: `SELECT * FROM family_members WHERE MAX(created_at, updated_at) > ${since}`,
    },
    {
      table: "item_category_memory",
      sql: `SELECT * FROM item_category_memory WHERE last_seen_at > ${since}`,
    },
    {
      table: "receipt_corrections",
      sql: `SELECT * FROM receipt_corrections WHERE created_at > ${since}`,
    },
    {
      table: "barcode_nutrition_cache",
      sql: `SELECT * FROM barcode_nutrition_cache WHERE updated_at > ${since}`,
    },
    {
      table: "nutrition_name_cache",
      sql: `SELECT * FROM nutrition_name_cache WHERE updated_at > ${since}`,
    },
    {
      table: "nutrition_analytics_snapshots",
      sql: `SELECT * FROM nutrition_analytics_snapshots WHERE created_at > ${since}`,
    },
    {
      table: "consumption_models",
      sql: `SELECT * FROM consumption_models WHERE updated_at > ${since}`,
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  Sync Service                                                       */
/* ------------------------------------------------------------------ */

class SyncService {
  private syncing = false;

  async getLastSyncTimestamp(): Promise<number> {
    const raw = await AsyncStorage.getItem(SYNC_TIMESTAMP_KEY);
    return raw ? Number(raw) : 0;
  }

  private async setLastSyncTimestamp(ts: number): Promise<void> {
    await AsyncStorage.setItem(SYNC_TIMESTAMP_KEY, String(ts));
  }

  /** Check if sync is configured (API URL set) */
  isConfigured(): boolean {
    return Boolean(getApiUrl());
  }

  /** Main sync method — call after receipt save or on app foreground */
  async pushChanges(): Promise<{ success: boolean; synced?: number; error?: string }> {
    if (this.syncing) {
      return { success: false, error: "Sync already in progress" };
    }

    const apiUrl = getApiUrl();
    console.log(`[sync] API URL: ${apiUrl ?? "NOT SET"}`);
    if (!apiUrl) {
      console.log("[sync] Skipping — EXPO_PUBLIC_API_URL not configured");
      return { success: false, error: "API URL not configured" };
    }

    // Check server health first
    console.log(`[sync] Checking server health at ${apiUrl}/api/health...`);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const healthRes = await fetch(`${apiUrl}/api/health`, {
        method: "GET",
        signal: controller.signal,
      });
      clearTimeout(timeout);
      console.log(`[sync] Health check response: ${healthRes.status}`);
      if (!healthRes.ok) throw new Error("Server unhealthy");
    } catch {
      console.log("[sync] Server unreachable, skipping sync");
      return { success: false, error: "Server unreachable" };
    }

    this.syncing = true;
    try {
      const lastSync = await this.getLastSyncTimestamp();
      const now = Date.now();
      const db = await getDb();

      // Collect changed records from all tables
      const tables: Record<string, unknown[]> = {};
      let totalRecords = 0;

      for (const query of buildQueries(lastSync)) {
        try {
          const rows = await db.getAllAsync<Record<string, unknown>>(query.sql);
          if (rows.length > 0) {
            tables[query.table] = rows;
            totalRecords += rows.length;
          }
        } catch (err) {
          // Table might not exist yet — skip
          console.warn(`[sync] Query failed for ${query.table}:`, err);
        }
      }

      if (totalRecords === 0) {
        console.log("[sync] No changes to sync");
        return { success: true, synced: 0 };
      }

      // POST to server
      const deviceId = await getDeviceId();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), SYNC_TIMEOUT_MS);

      const response = await fetch(`${apiUrl}/api/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ deviceId, syncedAt: now, tables }),
      });
      clearTimeout(timeout);

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Sync failed: ${response.status} ${text.slice(0, 200)}`);
      }

      const result = await response.json();
      await this.setLastSyncTimestamp(now);

      console.log(`[sync] Pushed ${totalRecords} records successfully`, result.counts);
      return { success: true, synced: totalRecords };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[sync] Failed: ${msg}`);
      return { success: false, error: msg };
    } finally {
      this.syncing = false;
    }
  }
}

export const syncService = new SyncService();
