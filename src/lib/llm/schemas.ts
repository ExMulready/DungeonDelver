import { z } from "zod";

/**
 * The narrator's structured output contract.
 *
 * Written defensively, because a 2B model on a laptop is the floor this has to
 * work at. Every field that can carry a default does, every list is capped, and
 * nothing that would break the UI is required. A missing `hpDelta` should cost
 * the player nothing; a missing `choices` array is the only genuine failure,
 * and the engine substitutes a fallback rather than erroring.
 */

const abilitySchema = z.enum(["str", "dex", "con", "int", "wis", "cha"]);

export const suggestedCheckSchema = z.object({
  ability: abilitySchema,
  /* Clamped again in dice.ts — a small model will occasionally propose DC 45. */
  dc: z.number().int().min(5).max(30),
  reason: z.string().max(160),
});

export const choiceSchema = z.object({
  label: z.string().min(1).max(120),
  hint: z.string().max(160).optional(),
  check: suggestedCheckSchema.optional(),
});

export const itemSchema = z.object({
  name: z.string().min(1).max(80),
  rarity: z
    .enum(["common", "magic", "rare", "unique", "set", "crafted"])
    .default("common"),
  description: z.string().max(240).default(""),
  quantity: z.number().int().min(1).max(99).default(1),
  kind: z.string().max(40).optional(),
});

export const npcUpdateSchema = z.object({
  name: z.string().min(1).max(80),
  role: z.string().max(120).default("unknown"),
  disposition: z
    .enum(["hostile", "wary", "neutral", "friendly", "devoted"])
    .default("neutral"),
  status: z.enum(["alive", "dead", "missing", "unknown"]).default("alive"),
  lastSeen: z.string().max(120).optional(),
});

export const locationUpdateSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(240).default(""),
  visited: z.boolean().default(true),
});

export const questUpdateSchema = z.object({
  name: z.string().min(1).max(80),
  status: z.enum(["active", "complete", "failed"]).default("active"),
  detail: z.string().max(240).default(""),
});

/**
 * Everything the extraction call returns after a scene is narrated.
 *
 * Deltas rather than absolutes: asking a small model to restate current HP
 * invites it to quietly heal or kill the player, whereas "how much did this
 * scene cost?" is a question it answers reliably.
 */
export const turnStateSchema = z.object({
  choices: z.array(choiceSchema).min(2).max(4),

  hpDelta: z.number().int().min(-100).max(100).default(0),
  xpDelta: z.number().int().min(0).max(2000).default(0),

  itemsGained: z.array(itemSchema).max(4).default([]),
  itemsLost: z.array(z.string().max(80)).max(4).default([]),

  npcs: z.array(npcUpdateSchema).max(6).default([]),
  locations: z.array(locationUpdateSchema).max(4).default([]),
  quests: z.array(questUpdateSchema).max(4).default([]),

  /* Short title, only used to name a campaign on its opening turn. */
  suggestedTitle: z.string().max(70).optional(),
});

export type TurnState = z.infer<typeof turnStateSchema>;

/** JSON Schema handed to the model. Kept in sync by deriving it from the zod. */
export const turnStateJsonSchema = z.toJSONSchema(turnStateSchema, {
  target: "draft-7",
  io: "input",
});
