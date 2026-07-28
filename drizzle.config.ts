import type { Config } from "drizzle-kit";

/* drizzle-kit runs outside Next.js, so .env is not loaded for it automatically.
   Node 20.6+ can do it directly:
     node --env-file=.env node_modules/drizzle-kit/bin.cjs migrate
   The npm scripts in package.json wrap this. */

export default {
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  /* Only ever touch tables this app owns. Matters on Supabase, where the
     database also contains auth/storage schemas that must not be dropped. */
  schemaFilter: ["public"],
  verbose: true,
  strict: true,
} satisfies Config;
