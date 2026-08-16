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

/** Drives the glyph/tint on a choice's plaque tile. See src/lib/game/icons.ts. */
export type ChoiceIcon = "arcane" | "parley" | "camp" | "travel" | "violence";

/** An option offered to the player at the end of a narrator turn. */
export type Choice = {
  id: string;
  /** Imperative, second person: "Force the iron door." */
  label: string;
  /** Optional flavour shown beneath the label. */
  hint?: string;
  /** Set when the narrator wants this option gated behind a check. */
  check?: SuggestedCheck;
  /** Not yet produced by the narrator — the UI defaults to "travel" when absent. */
  icon?: ChoiceIcon;
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

/** Paperdoll slot keys. Order matches the grid placement in EquipmentGrid.tsx. */
export const EQUIPMENT_SLOTS = [
  "weapon", "offhand", "head", "shoulders", "hands", "chest",
  "cloak", "amulet", "boots", "ring1", "ring2", "belt",
] as const;

export type EquipmentSlot = (typeof EQUIPMENT_SLOTS)[number];

export type Equipment = Record<EquipmentSlot, InventoryItem | null>;

export const EMPTY_EQUIPMENT: Equipment = {
  weapon: null, offhand: null, head: null, shoulders: null, hands: null, chest: null,
  cloak: null, amulet: null, boots: null, ring1: null, ring2: null, belt: null,
};

/**
 * Which paperdoll slot(s) an item's free-form `kind` can go in. `kind` is
 * otherwise unconstrained (the narrator tags items loosely — 'weapon', 'key',
 * 'relic', 'reagent') so only kinds listed here are equippable at all; a
 * multi-slot entry (ring) equips to the first open slot of the two.
 */
export const EQUIPPABLE_KIND_SLOTS: Record<string, EquipmentSlot[]> = {
  weapon: ["weapon"],
  offhand: ["offhand"],
  shield: ["offhand"],
  armor: ["chest"],
  armour: ["chest"],
  chest: ["chest"],
  head: ["head"],
  helm: ["head"],
  helmet: ["head"],
  shoulders: ["shoulders"],
  hands: ["hands"],
  gloves: ["hands"],
  gauntlets: ["hands"],
  boots: ["boots"],
  feet: ["boots"],
  cloak: ["cloak"],
  cape: ["cloak"],
  amulet: ["amulet"],
  necklace: ["amulet"],
  ring: ["ring1", "ring2"],
  belt: ["belt"],
};

export function slotsForKind(kind: string | undefined): EquipmentSlot[] {
  if (!kind) return [];
  return EQUIPPABLE_KIND_SLOTS[kind.toLowerCase()] ?? [];
}

/** Turns remaining before each power is usable again. Absent key = ready. */
export type PowerCooldowns = Record<string, number>;
