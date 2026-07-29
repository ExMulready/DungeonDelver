import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { campaignMemory } from "@/lib/db/schema";

/**
 * Chronicle storage seam.
 *
 * The second of the three interfaces (with the LLM provider and the database
 * client) that let one codebase run as a container stack and on Vercel.
 *
 *   fs    real .md files on disk
 *   pg    a text column — REQUIRED on Vercel, which has no writable disk
 *   both  writes to both, so a chronicle can be read from the host while
 *         playing locally
 *
 * `both` reads from Postgres and treats the file as a mirror. The database is
 * authoritative because it is the copy that survives a container rebuild.
 */

export type ChronicleStore = {
  read(campaignId: string): Promise<string>;
  write(campaignId: string, markdown: string): Promise<void>;
};

type Mode = "fs" | "pg" | "both";

function mode(): Mode {
  const raw = (process.env.CHRONICLE_STORE ?? "pg").toLowerCase();
  if (raw === "fs" || raw === "pg" || raw === "both") return raw;
  throw new Error(
    `CHRONICLE_STORE must be "fs", "pg" or "both", received "${raw}".`,
  );
}

/* ── Postgres ─────────────────────────────────────────────────────────────── */

const pgStore: ChronicleStore = {
  async read(campaignId) {
    const rows = await db
      .select({ markdown: campaignMemory.markdown })
      .from(campaignMemory)
      .where(eq(campaignMemory.campaignId, campaignId))
      .limit(1);
    return rows[0]?.markdown ?? "";
  },

  async write(campaignId, markdown) {
    await db
      .update(campaignMemory)
      .set({ markdown, updatedAt: new Date() })
      .where(eq(campaignMemory.campaignId, campaignId));
  },
};

/* ── Filesystem ───────────────────────────────────────────────────────────── */

function chronicleDir(): string {
  return process.env.CHRONICLE_DIR ?? "./data/campaigns";
}

/** Rejects anything that is not a plain id, so a campaign id cannot traverse. */
function safeSegment(campaignId: string): string {
  if (!/^[A-Za-z0-9_-]+$/.test(campaignId)) {
    throw new Error(`Refusing to build a path from campaign id: ${campaignId}`);
  }
  return campaignId;
}

/* Imported statically at the top of the file rather than with a dynamic
   `await import("node:fs/promises")`. A dynamic import here makes Turbopack
   trace the whole project into the standalone output ("Encountered unexpected
   file in NFT list"), by way of engine.ts and the turn route — which bloats the
   very image this app ships as a container. Only the fs-backed store touches
   these, and it is only ever constructed on the Node runtime. */
const fsStore: ChronicleStore = {
  async read(campaignId) {
    const file = join(chronicleDir(), safeSegment(campaignId), "chronicle.md");
    try {
      return await readFile(file, "utf8");
    } catch {
      return "";
    }
  },

  async write(campaignId, markdown) {
    const dir = join(chronicleDir(), safeSegment(campaignId));
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "chronicle.md"), markdown, "utf8");
  },
};

/* ── Composite ────────────────────────────────────────────────────────────── */

const bothStore: ChronicleStore = {
  read: (campaignId) => pgStore.read(campaignId),

  async write(campaignId, markdown) {
    await pgStore.write(campaignId, markdown);
    try {
      await fsStore.write(campaignId, markdown);
    } catch (err) {
      /* The mirror is a convenience for reading chronicles from the host. A
         read-only volume or a full disk must not fail the player's turn after
         the authoritative write already succeeded. */
      console.warn(
        `[chronicle] mirror to disk failed for ${campaignId}:`,
        err instanceof Error ? err.message : err,
      );
    }
  },
};

export function chronicleStore(): ChronicleStore {
  switch (mode()) {
    case "fs":
      return fsStore;
    case "pg":
      return pgStore;
    case "both":
      return bothStore;
  }
}
