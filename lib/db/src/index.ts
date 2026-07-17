import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

// Pool is created eagerly but connects lazily (on first query).
// If DATABASE_URL is missing, queries will fail at runtime — not at startup.
// This lets the server start and pass health checks before the DB is configured.
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, { schema });

export * from "./schema";
