import { and, asc, desc, eq } from "drizzle-orm";
import { generateText, streamText, type ModelMessage } from "ai";

import { db } from "@/lib/db";
import {
  campaigns,
  campaignMemory,
  campaignTurns,
  characters,
  type Character,
} from "@/lib/db/schema";
import {
  narratorModel,
  narrationProfile,
  extractionProfile,
  compactionProfile,
  verbatimTurnWindow,
} from "@/lib/llm/provider";
import {
  narratorSystemPrompt,
  playerTurnPrompt,
  openingPrompt,
  stateExtractionPrompt,
  compactionPrompt,
} from "@/lib/llm/prompts";
import { turnStateSchema, type TurnState } from "@/lib/llm/schemas";
import { chronicleStore } from "@/lib/chronicle/store";
import { renderChronicle, chronicleForPrompt } from "@/lib/chronicle/format";
import { resolveCheck } from "@/lib/game/dice";
import { getPower } from "@/lib/game/powers";
import { getClass, abilityModifier } from "@/lib/game/srd";
import {
  EMPTY_WORLD_FACTS,
  type WorldFacts, type Choice, type DiceRoll, type InventoryItem, type PowerCooldowns,
} from "@/lib/game/types";

/**
 * Turn orchestration.
 *
 * Each turn is two model calls, deliberately:
 *
 *   1. narration  — streamed to the player as it is written
 *   2. extraction — a small JSON call over ONLY the new prose
 *
 * One combined call would be cheaper, but "prose, then a fenced JSON block" is
 * not something a 2B model does reliably, and a malformed response would cost
 * the player their turn. Splitting keeps the creative call unconstrained and
 * the structured call cheap, since the extraction pass never sees history.
 */

/** How often older turns get folded into the running summary. */
const COMPACT_EVERY = 8;

export type CampaignContext = {
  campaign: typeof campaigns.$inferSelect;
  character: Character;
  memory: typeof campaignMemory.$inferSelect;
  recentTurns: Array<typeof campaignTurns.$inferSelect>;
};

/** Loads everything a turn needs, and enforces ownership in the same query. */
export async function loadCampaignContext(
  campaignId: string,
  userId: string,
): Promise<CampaignContext | null> {
  const rows = await db
    .select()
    .from(campaigns)
    .innerJoin(characters, eq(campaigns.characterId, characters.id))
    .where(and(eq(campaigns.id, campaignId), eq(campaigns.userId, userId)))
    .limit(1);

  if (rows.length === 0) return null;

  const campaign = rows[0].campaign;
  const character = rows[0].character;

  let memoryRows = await db
    .select()
    .from(campaignMemory)
    .where(eq(campaignMemory.campaignId, campaignId))
    .limit(1);

  /* Self-heal: a campaign created before its memory row, or one whose row was
     lost, should still be playable rather than throwing on every turn. */
  if (memoryRows.length === 0) {
    await db.insert(campaignMemory).values({
      campaignId,
      markdown: "",
      actSummary: "",
      worldFacts: EMPTY_WORLD_FACTS,
    });
    memoryRows = await db
      .select()
      .from(campaignMemory)
      .where(eq(campaignMemory.campaignId, campaignId))
      .limit(1);
  }

  const window = verbatimTurnWindow();
  const recent = await db
    .select()
    .from(campaignTurns)
    .where(eq(campaignTurns.campaignId, campaignId))
    .orderBy(desc(campaignTurns.turnNumber))
    .limit(window);

  return {
    campaign,
    character,
    memory: memoryRows[0],
    recentTurns: recent.reverse(),
  };
}

/** Converts stored turns into chat messages for the narration call. */
function turnsToMessages(turns: CampaignContext["recentTurns"]): ModelMessage[] {
  return turns.map((t) =>
    t.role === "player"
      ? { role: "user" as const, content: t.content }
      : { role: "assistant" as const, content: t.content },
  );
}

export type TurnRequest = {
  /** Free text, or the label of the chosen option. */
  action: string;
  /** Present when the chosen option was gated behind a check. */
  check?: Choice["check"];
};

/**
 * Streams the next scene.
 *
 * Returns the raw text stream plus everything needed to finish the turn once
 * the prose is complete.
 */
export async function streamScene(ctx: CampaignContext, request: TurnRequest | null) {
  const store = chronicleStore();
  const storedChronicle = await store.read(ctx.campaign.id);

  /* Fall back to rendering from structured state when no chronicle exists yet
     — the very first turn, or a campaign whose file was lost. */
  const chronicle =
    storedChronicle ||
    renderChronicle({
      title: ctx.campaign.title,
      tone: ctx.campaign.tone,
      character: ctx.character,
      worldFacts: ctx.memory.worldFacts ?? EMPTY_WORLD_FACTS,
      actSummary: ctx.memory.actSummary,
      recentTurns: [],
    });

  const system = narratorSystemPrompt(
    ctx.character,
    ctx.campaign.tone,
    chronicleForPrompt(chronicle),
  );

  /* Dice are rolled HERE, before the model writes a word, and the outcome is
     handed to it as settled fact. Letting the model decide would quietly turn
     every check into whatever makes the better paragraph. */
  let roll: DiceRoll | null = null;
  if (request?.check) {
    roll = resolveCheck(request.check, ctx.character.stats);
  }

  const messages: ModelMessage[] = [
    ...turnsToMessages(ctx.recentTurns),
    {
      role: "user",
      content: request
        ? playerTurnPrompt(request.action, roll)
        : openingPrompt(ctx.character),
    },
  ];

  const profile = narrationProfile();

  const result = streamText({
    model: narratorModel(),
    system,
    messages,
    temperature: profile.temperature,
    maxOutputTokens: profile.maxOutputTokens,
  });

  return { result, roll, chronicle };
}

/** Second pass: turn the new prose into structured state. */
export async function extractTurnState(
  scene: string,
  characterName: string,
): Promise<TurnState | null> {
  const profile = extractionProfile();

  try {
    const { text } = await generateText({
      model: narratorModel(),
      prompt: stateExtractionPrompt(scene, characterName),
      temperature: profile.temperature,
      maxOutputTokens: profile.maxOutputTokens,
      /* Both providers honour this: Ollama maps it to format:json, Groq to
         response_format:json_object. */
      providerOptions: {
        ollama: { format: "json" },
        groq: { response_format: { type: "json_object" } },
      },
    });

    const parsed = turnStateSchema.safeParse(extractJson(text));
    if (parsed.success) return parsed.data;

    console.warn("[engine] state extraction failed schema:", parsed.error.issues.slice(0, 3));
    return null;
  } catch (err) {
    console.warn("[engine] state extraction call failed:", err);
    return null;
  }
}

/**
 * Pulls a JSON object out of a model response.
 *
 * Even in JSON mode, smaller models wrap output in ``` fences or prepend a
 * sentence. Slicing to the outermost braces recovers those without a hard
 * failure that would cost the player their turn.
 */
function extractJson(raw: string): unknown {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start === -1 || end <= start) return null;
    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

/** Choices shown when extraction fails entirely, so play can still continue. */
const FALLBACK_CHOICES: Choice[] = [
  { id: "look", label: "Look more closely at your surroundings" },
  { id: "press", label: "Press on regardless" },
  { id: "withdraw", label: "Withdraw and take stock" },
];

/* ── World fact merging ───────────────────────────────────────────────────── */

const MAX_NPCS = 24;
const MAX_LOCATIONS = 20;
const MAX_QUESTS = 16;

/**
 * Merges new observations into the world record.
 *
 * Matching is by lower-cased name; a brand-new entity is seeded with
 * `defaults`, an existing one keeps its prior fields except where the update
 * explicitly supplies a new value. That last part is the reason this is not a
 * plain object spread: `{ ...existing, ...update }` overwrites with
 * `undefined` for every field the update omits (object spread includes keys
 * whose value is `undefined`), which would erase an NPC's disposition the
 * moment the model re-mentions them without restating it. Explicitly skipping
 * `undefined` values is what makes "not mentioned this turn" mean "unchanged"
 * rather than "reset".
 *
 * Lists are capped from the front so a long campaign cannot grow the prompt
 * without bound; the oldest entries fall out of the structured record but
 * survive in the prose summary.
 */
function mergeWorldFacts(current: WorldFacts, update: TurnState): WorldFacts {
  function byName<T extends { name: string }>(
    existing: T[],
    incoming: Array<Partial<T> & { name: string }>,
    cap: number,
    defaults: Omit<T, "name">,
  ): T[] {
    const map = new Map(existing.map((e) => [e.name.toLowerCase(), e]));

    for (const item of incoming) {
      const key = item.name.toLowerCase();
      const base: T = map.get(key) ?? ({ name: item.name, ...defaults } as T);
      const merged: T = { ...base };
      for (const [k, v] of Object.entries(item)) {
        if (v !== undefined) (merged as Record<string, unknown>)[k] = v;
      }
      map.set(key, merged);
    }

    const merged = [...map.values()];
    return merged.slice(Math.max(0, merged.length - cap));
  }

  return {
    npcs: byName(current.npcs, update.npcs, MAX_NPCS, {
      role: "unknown",
      disposition: "neutral",
      status: "alive",
    }),
    locations: byName(current.locations, update.locations, MAX_LOCATIONS, {
      description: "",
      visited: true,
    }),
    quests: byName(current.quests, update.quests, MAX_QUESTS, {
      status: "active",
      detail: "",
    }),
  };
}

function applyInventory(
  current: InventoryItem[],
  state: TurnState,
): InventoryItem[] {
  const out = [...current];

  for (const gained of state.itemsGained) {
    const existing = out.find((i) => i.name.toLowerCase() === gained.name.toLowerCase());
    if (existing) {
      existing.quantity = Math.min(99, existing.quantity + gained.quantity);
    } else {
      out.push({
        id: crypto.randomUUID(),
        name: gained.name,
        rarity: gained.rarity,
        description: gained.description,
        quantity: gained.quantity,
        kind: gained.kind,
      });
    }
  }

  for (const lostName of state.itemsLost) {
    const idx = out.findIndex((i) => i.name.toLowerCase() === lostName.toLowerCase());
    if (idx === -1) continue;
    if (out[idx].quantity > 1) out[idx].quantity -= 1;
    else out.splice(idx, 1);
  }

  return out;
}

/* ── XP and leveling ──────────────────────────────────────────────────────── */

const XP_PER_LEVEL = 1000;

/**
 * XP for a resolved turn, decided by the server rather than the extraction
 * model — the small models this has to run on are not reliable judges of
 * pacing, but "was there a check, and did it succeed" is information the
 * engine already has for free from the roll it made before narrating.
 */
function awardXp(roll: DiceRoll | null): number {
  if (!roll) return 40;
  if (roll.critical === "hit") return 140;
  if (roll.success) return 100;
  return 60;
}

/**
 * Applies XP and, on crossing XP_PER_LEVEL, a level. Loops rather than a
 * single `if` so a large single award can never leave XP sitting above the
 * threshold uncredited. XP is carried over by subtraction rather than reset
 * to 0, so progress toward the next level is never discarded.
 */
function applyXp(
  character: Character,
  gained: number,
): { xp: number; level: number; hpMax: number; leveledUp: boolean } {
  let xp = character.xp + gained;
  let level = character.level;
  let hpMax = character.hpMax;
  let leveledUp = false;

  const cls = getClass(character.class);
  const conMod = abilityModifier(character.stats.con);

  while (xp >= XP_PER_LEVEL) {
    xp -= XP_PER_LEVEL;
    level += 1;
    hpMax += Math.floor(cls.hitDie / 2) + conMod;
    leveledUp = true;
  }

  return { xp, level, hpMax, leveledUp };
}

/* ── Committing a turn ────────────────────────────────────────────────────── */

export type CommitResult = {
  choices: Choice[];
  character: Character;
  diceRoll: DiceRoll | null;
  leveledUp: boolean;
  sceneArtCaption: string | null;
};

/**
 * Persists a completed turn and rebuilds the chronicle.
 *
 * Runs after the prose has finished streaming to the player, so nothing here
 * blocks the reading experience.
 */
export async function commitTurn(args: {
  ctx: CampaignContext;
  playerAction: string | null;
  scene: string;
  roll: DiceRoll | null;
  /** Set when this turn was spent activating a class power — see powers.ts. */
  activatePowerId?: string;
}): Promise<CommitResult> {
  const { ctx, playerAction, scene, roll, activatePowerId } = args;
  const campaignId = ctx.campaign.id;

  let turnNumber = ctx.campaign.turnCount;

  /* The player's own turn is recorded first so the transcript reads in order
     even if extraction later fails. */
  if (playerAction) {
    turnNumber += 1;
    await db.insert(campaignTurns).values({
      campaignId,
      turnNumber,
      role: "player",
      content: playerAction,
      diceRoll: roll,
    });
  }

  const state = await extractTurnState(scene, ctx.character.name);

  const choices: Choice[] = state
    ? state.choices.map((c, i) => ({
        id: `c${turnNumber + 1}_${i}`,
        label: c.label,
        hint: c.hint,
        check: c.check,
        icon: c.icon,
      }))
    : FALLBACK_CHOICES;

  turnNumber += 1;
  await db.insert(campaignTurns).values({
    campaignId,
    turnNumber,
    role: "narrator",
    content: scene,
    choices,
    /* No image generation exists yet, so sceneArtUrl stays null — StoryPage
       renders the empty carved frame with this caption beneath it. */
    sceneArtCaption: state?.sceneArtCaption ?? null,
  });

  /* ── Character deltas ── */
  let character = ctx.character;
  let leveledUp = false;
  {
    /* Cooldowns tick down every resolved turn, not only power-activation
       turns — this block runs unconditionally, unlike the hp/xp/inventory
       patch below which needs a successful extraction pass. A power absent
       from the map (or at 0) reads as ready in the UI, so entries that reach
       0 are dropped rather than kept at zero. */
    const currentCooldowns = (character.powerCooldowns ?? {}) as PowerCooldowns;
    const nextCooldowns: PowerCooldowns = {};
    for (const [id, turnsLeft] of Object.entries(currentCooldowns)) {
      const remaining = turnsLeft - 1;
      if (remaining > 0) nextCooldowns[id] = remaining;
    }
    if (activatePowerId) {
      const power = getPower(activatePowerId);
      if (power) nextCooldowns[activatePowerId] = power.cooldownTurns;
    }

    const patch: Partial<typeof characters.$inferInsert> = { powerCooldowns: nextCooldowns };

    /* XP is awarded for every turn the player actually resolved — not the
       unprompted opening scene, which nobody took an action to earn. */
    if (playerAction) {
      const { xp, level, hpMax, leveledUp: didLevel } = applyXp(character, awardXp(roll));
      patch.xp = xp;
      patch.level = level;
      patch.hpMax = hpMax;
      leveledUp = didLevel;
    }

    if (state) {
      const hpMax = patch.hpMax ?? character.hpMax;
      patch.hpCurrent = Math.max(0, Math.min(hpMax, character.hpCurrent + state.hpDelta));
      patch.inventory = applyInventory(character.inventory ?? [], state);
    }

    const updated = await db
      .update(characters)
      .set(patch)
      .where(eq(characters.id, character.id))
      .returning();

    character = updated[0] ?? character;
  }

  /* ── World facts ── */
  const worldFacts = state
    ? mergeWorldFacts(ctx.memory.worldFacts ?? EMPTY_WORLD_FACTS, state)
    : (ctx.memory.worldFacts ?? EMPTY_WORLD_FACTS);

  /* ── Title, on the opening turn only ── */
  const title =
    ctx.campaign.turnCount === 0 && state?.suggestedTitle
      ? state.suggestedTitle
      : ctx.campaign.title;

  await db
    .update(campaigns)
    .set({ turnCount: turnNumber, lastPlayedAt: new Date(), title })
    .where(eq(campaigns.id, campaignId));

  /* ── Compaction, then rebuild the chronicle ── */
  const actSummary = await maybeCompact(ctx, turnNumber);

  const window = verbatimTurnWindow();
  const recent = await db
    .select()
    .from(campaignTurns)
    .where(eq(campaignTurns.campaignId, campaignId))
    .orderBy(desc(campaignTurns.turnNumber))
    .limit(window);

  const markdown = renderChronicle({
    title,
    tone: ctx.campaign.tone,
    character,
    worldFacts,
    actSummary,
    recentTurns: recent.reverse().map((t) => ({
      turnNumber: t.turnNumber,
      role: t.role,
      content: t.content,
      diceRoll: t.diceRoll ?? null,
    })),
  });

  await db
    .update(campaignMemory)
    .set({ worldFacts, actSummary, updatedAt: new Date() })
    .where(eq(campaignMemory.campaignId, campaignId));

  await chronicleStore().write(campaignId, markdown);

  return { choices, character, diceRoll: roll, leveledUp, sceneArtCaption: state?.sceneArtCaption ?? null };
}

/**
 * Folds turns that have fallen outside the verbatim window into prose.
 *
 * Non-negotiable rather than an optimisation: without it the prompt grows
 * without bound, and both targets punish that — Groq's free tier is capped per
 * minute, and a CPU-hosted model slows in direct proportion to context length.
 */
async function maybeCompact(
  ctx: CampaignContext,
  turnNumber: number,
): Promise<string> {
  const window = verbatimTurnWindow();
  const existing = ctx.memory.actSummary;

  /* Narrator turnNumber is 1 on the opening scene, then climbs by exactly 2
     every round after (a player insert followed by a narrator insert) — so it
     is odd forever: 1, 3, 5, 7, 9, 11, .... An equality check against a
     multiple of 8 (`=== 0`) would never fire, since an odd number is never
     divisible by an even one. Checking a 2-wide band instead of exact equality
     catches the boundary regardless of that parity, and stays correct even if
     the increment pattern above ever changes. */
  if (turnNumber <= window || turnNumber % COMPACT_EVERY >= 2) {
    return existing;
  }

  /* Fold only the turns that have newly scrolled past the verbatim window
     since the LAST compaction — not the whole history from turn 1.
     `previousCutoff` reconstructs where the last cycle left off from
     arithmetic alone (there is no stored "compacted through" marker): compaction
     fires on a fixed cadence, so the prior cycle ran at turnNumber - COMPACT_EVERY,
     unless that value hadn't yet cleared the window, in which case nothing has
     been folded yet. Re-querying from turn 1 every time (the previous version
     of this code) makes the transcript sent to the model grow without bound as
     the campaign lengthens — precisely what compaction exists to prevent. */
  const cutoff = turnNumber - window;
  const previousCutoff = Math.max(0, turnNumber - COMPACT_EVERY - window);

  if (cutoff <= previousCutoff) return existing;

  const stale = await db
    .select()
    .from(campaignTurns)
    .where(eq(campaignTurns.campaignId, ctx.campaign.id))
    .orderBy(asc(campaignTurns.turnNumber))
    .limit(cutoff - previousCutoff)
    .offset(previousCutoff);

  if (stale.length === 0) return existing;

  const transcript = stale
    .map((t) => `${t.role === "player" ? ctx.character.name : "Narrator"}: ${t.content}`)
    .join("\n\n");

  const profile = compactionProfile();

  try {
    const { text } = await generateText({
      model: narratorModel(),
      prompt: compactionPrompt(existing, transcript),
      temperature: profile.temperature,
      maxOutputTokens: profile.maxOutputTokens,
    });
    return text.trim() || existing;
  } catch (err) {
    /* Keeping the old summary degrades memory slightly; throwing would lose the
       player's turn after they already read the scene. */
    console.warn("[engine] compaction failed, keeping previous summary:", err);
    return existing;
  }
}
