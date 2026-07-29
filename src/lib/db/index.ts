import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * The Drizzle client, connected lazily on first use.
 *
 * The obvious shape — read DATABASE_URL and throw at module scope — breaks
 * `next build`. Next evaluates every route module while collecting page data,
 * so a missing connection string fails the build rather than the request, and
 * CI or a container image build then needs a database URL it will never
 * actually connect to. Nothing here is prerendered against real data; every
 * route that touches the database is dynamic.
 *
 * Deferring to first property access keeps the same guarantee where it matters
 * — a request that needs the database still fails loudly, with the same
 * message — while letting a build with no environment at all succeed.
 */

function createDb() {
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

  return drizzle(client, { schema });
}

type DrizzleDb = ReturnType<typeof createDb>;

let instance: DrizzleDb | null = null;

function getDb(): DrizzleDb {
  instance ??= createDb();
  return instance;
}

/* A Proxy rather than a `getDb()` accessor so that every existing call site
   keeps working unchanged — `db.select(...)` reads identically whether the
   connection is already open or is being made by this very access. Methods are
   bound to the real client, since Drizzle's builders rely on `this`.
 *
 * The getPrototypeOf trap is load-bearing, not defensive: Drizzle's `is()`
 * identifies a dialect with `value instanceof type` and by walking
 * `Object.getPrototypeOf(value).constructor`, neither of which the `get` trap
 * intercepts. Without it @auth/drizzle-adapter cannot see a PgDatabase and
 * fails with "Unsupported database type (object)". */
export const db: DrizzleDb = new Proxy({} as DrizzleDb, {
  get(_target, property) {
    const real = getDb() as unknown as Record<string | symbol, unknown>;
    const value = real[property];
    return typeof value === "function" ? value.bind(real) : value;
  },

  getPrototypeOf() {
    return Object.getPrototypeOf(getDb());
  },
});

export { schema };
export type Db = DrizzleDb;
