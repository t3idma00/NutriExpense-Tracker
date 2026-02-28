import { Router } from "express";
import { z } from "zod";
import { pool } from "../db";
import { ingestSyncPayload, type SyncTables } from "../services/sync-ingest";

export const syncRouter = Router();

const SyncPayloadSchema = z.object({
  deviceId: z.string(),
  syncedAt: z.number(),
  tables: z.record(z.string(), z.array(z.record(z.string(), z.unknown())).optional()),
});

syncRouter.post("/sync", async (req, res) => {
  const parsed = SyncPayloadSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      status: "error",
      message: "Invalid sync payload",
      errors: parsed.error.issues,
    });
    return;
  }

  const { deviceId, syncedAt, tables } = parsed.data;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await ingestSyncPayload(client, tables as SyncTables);

    await client.query("COMMIT");

    console.log(
      `[sync] Device ${deviceId} synced ${result.totalRecords} records at ${new Date(syncedAt).toISOString()}`,
      result.counts,
    );

    res.json({
      status: "ok",
      totalRecords: result.totalRecords,
      counts: result.counts,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    const message = err instanceof Error ? err.message : String(err);
    console.error("[sync] Ingest failed:", message);
    res.status(500).json({ status: "error", message });
  } finally {
    client.release();
  }
});
