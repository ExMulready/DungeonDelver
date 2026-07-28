/**
 * Shared game vocabulary.
 *
 * These types are the contract between three things that must agree: the
 * database jsonb columns, the JSON the narrator model is asked to emit, and the
 * React components that render the result. Changing one means changing the
 * matching zod schema in src/lib/game/schemas.ts.
 */

export type Ability = "str" | "dex" | "con" | "int" | "wis" | "cha";

export type AbilityScores = Record<Ability, number>;

export type Rarity = "common" | "magic" | "rare" | "unique" | "set" | "crafted";

export type InventoryItem = {
  id: string;
  name: string;
  rarity: Rarity;
  description: string;
  quantity: number;
  /** Free-form tag the narrator can use: 'weapon', 'key', 'relic', 'reagent'. */
  kind?: string;
};

/** An option offered to the player at the end of a narrator turn. */
export type Choice = {
  id: string;
  /** Imperative, second person: "Force the iron door." */
  label: string;
  /** Optional flavour shown beneath the label. */
  hint?: string;
  /** Set when the narrator wants this option gated behind a check. */
  check?: SuggestedCheck;
};

/** The narrator proposes; the server rolls. */
export type SuggestedCheck = {
  ability: Ability;
  dc: number;
  /** What is being attempted, for the roll overlay. */
  reason: string;
};

/** The resolved outcome. Produced only by src/lib/game/dice.ts. */
export type DiceRoll = {
  ability: Ability;
  dc: number;
  reason: string;
  /** Raw d20 face, before modifiers. */
  d20: number;
  modifier: number;
  total: number;
  success: boolean;
  critical: "hit" | "miss" | null;
};

/**
 * Structured state the narrator must stay consistent with. Kept alongside the
 * prose chronicle because prose alone drifts: a model will happily resurrect an
 * NPC it killed forty turns ago unless the fact is pinned somewhere explicit.
 */
export type WorldFacts = {
  npcs: Array<{
    name: string;
    role: string;
    disposition: "hostile" | "wary" | "neutral" | "friendly" | "devoted";
    status: "alive" | "dead" | "missing" | "unknown";
    lastSeen?: string;
  }>;
  locations: Array<{
    name: string;
    description: string;
    visited: boolean;
  }>;
  quests: Array<{
    name: string;
    status: "active" | "complete" | "failed";
    detail: string;
  }>;
};

export const EMPTY_WORLD_FACTS: WorldFacts = {
  npcs: [],
  locations: [],
  quests: [],
};
