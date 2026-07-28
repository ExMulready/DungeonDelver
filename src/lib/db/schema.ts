import {
  pgTable,
  text,
  integer,
  timestamp,
  jsonb,
  primaryKey,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import type { AdapterAccountType } from "next-auth/adapters";
import type { AbilityScores, InventoryItem, DiceRoll, Choice, WorldFacts } from "@/lib/game/types";

/* ═══════════════════════════════════════════════════════════════════════════
   Auth.js tables

   Column names follow the @auth/drizzle-adapter contract exactly (camelCase in
   the database, unusually) — the adapter queries them by these literal names,
   so renaming any of them breaks sign-in.
   ═══════════════════════════════════════════════════════════════════════════ */

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

export const users = pgTable("user", {
  id: id(),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),

  /* Argon2id digest. Null for accounts that only ever signed in with Google —
     which is why the credentials provider must treat null as "no password
     login available" rather than as an empty password. */
  passwordHash: text("passwordHash"),

  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })],
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

/* ═══════════════════════════════════════════════════════════════════════════
   Game tables
   ═══════════════════════════════════════════════════════════════════════════ */

export const characters = pgTable(
  "character",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    name: text("name").notNull(),

    /* Stored as text rather than pgEnum on purpose. The canonical lists live in
       src/lib/game/srd.ts and are enforced with zod at the edge; keeping the
       database permissive means adding a race is a code change, not a migration. */
    race: text("race").notNull(),
    class: text("class").notNull(),
    gender: text("gender").notNull(),
    background: text("background").notNull(),

    level: integer("level").notNull().default(1),
    xp: integer("xp").notNull().default(0),

    stats: jsonb("stats").$type<AbilityScores>().notNull(),
    hpCurrent: integer("hp_current").notNull(),
    hpMax: integer("hp_max").notNull(),
    ac: integer("ac").notNull(),

    /* The whole portrait, in four bytes. Faces are recomposed deterministically
       from (race, gender, seed), so no image is ever stored or transferred. */
    portraitSeed: integer("portrait_seed").notNull(),

    inventory: jsonb("inventory").$type<InventoryItem[]>().notNull().default([]),

    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("character_user_idx").on(t.userId)],
);

export const campaigns = pgTable(
  "campaign",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    characterId: text("character_id")
      .notNull()
      .references(() => characters.id, { onDelete: "cascade" }),

    title: text("title").notNull(),
    tone: text("tone").notNull().default("grim"),
    status: text("status").notNull().default("active"),

    turnCount: integer("turn_count").notNull().default(0),

    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    lastPlayedAt: timestamp("last_played_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("campaign_user_idx").on(t.userId),
    /* Resume lists sort on this. */
    index("campaign_last_played_idx").on(t.lastPlayedAt),
  ],
);

export const campaignTurns = pgTable(
  "campaign_turn",
  {
    id: id(),
    campaignId: text("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),

    turnNumber: integer("turn_number").notNull(),
    role: text("role").notNull(), // 'narrator' | 'player'
    content: text("content").notNull(),

    /* Only set on narrator turns: the options offered to the player. */
    choices: jsonb("choices").$type<Choice[]>(),

    /* Only set when a check was called for. Rolled server-side — see
       src/lib/game/dice.ts — never by the model. */
    diceRoll: jsonb("dice_roll").$type<DiceRoll>(),

    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    /* Every turn read is "the last N for this campaign, in order". */
    index("turn_campaign_number_idx").on(t.campaignId, t.turnNumber),
  ],
);

/**
 * The chronicle: the model's running memory of the campaign, as markdown.
 *
 * One row per campaign. On Vercel this is the only copy; under Docker Compose
 * it is mirrored to a real .md file on disk so it can be read while playing.
 */
export const campaignMemory = pgTable(
  "campaign_memory",
  {
    id: id(),
    campaignId: text("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),

    /* The full chronicle document, fed back to the model on every turn. */
    markdown: text("markdown").notNull().default(""),

    /* Older turns folded into prose by the compactor, so context stays flat. */
    actSummary: text("act_summary").notNull().default(""),

    /* Structured facts the narrator must not contradict. */
    worldFacts: jsonb("world_facts").$type<WorldFacts>(),

    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("memory_campaign_idx").on(t.campaignId)],
);

/* ═══════════════════════════════════════════════════════════════════════════
   Relations
   ═══════════════════════════════════════════════════════════════════════════ */

export const usersRelations = relations(users, ({ many }) => ({
  characters: many(characters),
  campaigns: many(campaigns),
  accounts: many(accounts),
}));

export const charactersRelations = relations(characters, ({ one, many }) => ({
  user: one(users, { fields: [characters.userId], references: [users.id] }),
  campaigns: many(campaigns),
}));

export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  user: one(users, { fields: [campaigns.userId], references: [users.id] }),
  character: one(characters, {
    fields: [campaigns.characterId],
    references: [characters.id],
  }),
  turns: many(campaignTurns),
  memory: one(campaignMemory, {
    fields: [campaigns.id],
    references: [campaignMemory.campaignId],
  }),
}));

export const campaignTurnsRelations = relations(campaignTurns, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [campaignTurns.campaignId],
    references: [campaigns.id],
  }),
}));

export const campaignMemoryRelations = relations(campaignMemory, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [campaignMemory.campaignId],
    references: [campaigns.id],
  }),
}));

/* Inferred row types, used across the app rather than hand-written interfaces. */
export type User = typeof users.$inferSelect;
export type Character = typeof characters.$inferSelect;
export type NewCharacter = typeof characters.$inferInsert;
export type Campaign = typeof campaigns.$inferSelect;
export type CampaignTurn = typeof campaignTurns.$inferSelect;
export type CampaignMemory = typeof campaignMemory.$inferSelect;
