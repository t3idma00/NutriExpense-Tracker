import "dotenv/config";

export const config = {
  port: Number(process.env.PORT ?? 3001),
  database: {
    host: process.env.PG_HOST ?? "localhost",
    port: Number(process.env.PG_PORT ?? 5432),
    database: process.env.PG_DATABASE ?? "expences",
    user: process.env.PG_USER ?? "postgres",
    password: process.env.PG_PASSWORD ?? "",
  },
};
