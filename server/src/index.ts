import express from "express";
import cors from "cors";
import { config } from "./config";
import { healthRouter } from "./routes/health";
import { syncRouter } from "./routes/sync";
import { pool } from "./db";

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.use("/api", healthRouter);
app.use("/api", syncRouter);

app.listen(config.port, "0.0.0.0", async () => {
  // Test DB connection on startup
  try {
    await pool.query("SELECT 1");
    console.log(`[server] PostgreSQL connected (${config.database.database}@${config.database.host}:${config.database.port})`);
  } catch (err) {
    console.error("[server] PostgreSQL connection failed:", err instanceof Error ? err.message : err);
  }

  console.log(`[server] Listening on http://localhost:${config.port}`);
  console.log(`[server] Health: http://localhost:${config.port}/api/health`);
  console.log(`[server] Sync:   POST http://localhost:${config.port}/api/sync`);
});
