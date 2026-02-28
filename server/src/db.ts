import { Pool } from "pg";
import { config } from "./config";

export const pool = new Pool(config.database);

pool.on("error", (err) => {
  console.error("[db] Unexpected pool error:", err.message);
});
