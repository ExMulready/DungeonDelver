import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env and fill it in.",
  );
}

/**
 * Supabase's transaction pooler (port 6543) multiplexes connections through
 * PgBouncer, which cannot hold prepared statements across them. Detecting the
 * pooler by port and disabling prepares is what keeps the Vercel deploy from
 * failing intermittently with "prepared statement already exists".
 */
const isTransactionPooler = connectionString.includes(":6543");

const client = postgres(connectionString, {
  prepare: !isTransactionPooler,
  /* Serverless invocations are short-lived and numerous; a big pool per
     instance would exhaust the database's connection limit. Locally the app is
     one long-lived process and can afford more. */
  max: process.env.VERCEL ? 1 : 10,
  idle_timeout: 20,
  connect_timeout: 15,
});

export const db = drizzle(client, { schema });

export { schema };
export type Db = typeof db;
