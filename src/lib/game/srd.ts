import type { Ability, AbilityScores } from "./types";

/**
 * Character options, derived from the SRD 5.1 (CC-BY-4.0).
 *
 * This file is the single source of truth for what a character may be. The
 * database stores race/class/etc. as plain text and validates against these
 * lists at the edge, so extending the game is a change here rather than a
 * migration. The portrait generator also keys off `RACES[].id`, so adding a
 * race means adding matching parts in src/lib/portraits/.
 */

export const ABILITIES: Ability[] = ["str", "dex", "con", "int", "wis", "cha"];

export const ABILITY_NAMES: Record<Ability, string> = {
  str: "Strength",
  dex: "Dexterity",
  con: "Constitution",
  int: "Intelligence",
  wis: "Wisdom",
  cha: "Charisma",
};

export type RaceId =
  | "human"
  | "elf"
  | "dwarf"
  | "halfling"
  | "half-orc"
  | "tiefling";

export type GenderId = "male" | "female" | "nonbinary";

export const GENDERS: Array<{ id: GenderId; name: string }> = [
  { id: "male", name: "Male" },
  { id: "female", name: "Female" },
  { id: "nonbinary", name: "Nonbinary" },
];

export type Race = {
  id: RaceId;
  name: string;
  blurb: string;
  bonuses: Partial<AbilityScores>;
  speed: number;
  traits: string[];
};

/* Six races chosen for silhouette: each must be recognisable from the portrait
   alone, which rules out variants that differ only in stat spread. */
export const RACES: Race[] = [
  {
    id: "human",
    name: "Human",
    blurb: "Ambitious and short-lived, which is precisely why they hurry.",
    bonuses: { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 },
    speed: 30,
    traits: ["Versatile", "Extra skill proficiency"],
  },
  {
    id: "elf",
    name: "Elf",
    blurb: "They remember the age before this one, and rarely let you forget it.",
    bonuses: { dex: 2, int: 1 },
    speed: 30,
    traits: ["Darkvision", "Fey Ancestry", "Trance"],
  },
  {
    id: "dwarf",
    name: "Dwarf",
    blurb: "Stone-stubborn. Grudges are kept in ledgers, and the ledgers are long.",
    bonuses: { con: 2, str: 2 },
    speed: 25,
    traits: ["Darkvision", "Dwarven Resilience", "Stonecunning"],
  },
  {
    id: "halfling",
    name: "Halfling",
    blurb: "Overlooked, underestimated, and still breathing when the tall folk are not.",
    bonuses: { dex: 2, cha: 1 },
    speed: 25,
    traits: ["Lucky", "Brave", "Halfling Nimbleness"],
  },
  {
    id: "half-orc",
    name: "Half-Orc",
    blurb: "Born of two worlds, welcomed by neither, stronger than both.",
    bonuses: { str: 2, con: 1 },
    speed: 30,
    traits: ["Darkvision", "Relentless Endurance", "Savage Attacks"],
  },
  {
    id: "tiefling",
    name: "Tiefling",
    blurb: "The bargain was struck generations ago. The interest is still owed.",
    bonuses: { cha: 2, int: 1 },
    speed: 30,
    traits: ["Darkvision", "Hellish Resistance", "Infernal Legacy"],
  },
];

export type ClassId =
  | "barbarian" | "bard" | "cleric" | "druid"
  | "fighter" | "monk" | "paladin" | "ranger"
  | "rogue" | "sorcerer" | "warlock" | "wizard";

export type CharClass = {
  id: ClassId;
  name: string;
  blurb: string;
  hitDie: number;
  primary: Ability;
  saves: [Ability, Ability];
  /** Whether the class draws on a spell pool — drives the mana orb in the HUD. */
  caster: boolean;
};

export const CLASSES: CharClass[] = [
  { id: "barbarian", name: "Barbarian", blurb: "Rage is a resource. Spend it.", hitDie: 12, primary: "str", saves: ["str", "con"], caster: false },
  { id: "bard",      name: "Bard",      blurb: "Every door opens for a good enough story.", hitDie: 8, primary: "cha", saves: ["dex", "cha"], caster: true },
  { id: "cleric",    name: "Cleric",    blurb: "Faith, and the willingness to enforce it.", hitDie: 8, primary: "wis", saves: ["wis", "cha"], caster: true },
  { id: "druid",     name: "Druid",     blurb: "The wild does not need you. It tolerates you.", hitDie: 8, primary: "wis", saves: ["int", "wis"], caster: true },
  { id: "fighter",   name: "Fighter",   blurb: "No mystery. Simply better at this than you.", hitDie: 10, primary: "str", saves: ["str", "con"], caster: false },
  { id: "monk",      name: "Monk",      blurb: "The body, sharpened until it is the weapon.", hitDie: 8, primary: "dex", saves: ["str", "dex"], caster: false },
  { id: "paladin",   name: "Paladin",   blurb: "An oath is a chain worn willingly.", hitDie: 10, primary: "str", saves: ["wis", "cha"], caster: true },
  { id: "ranger",    name: "Ranger",    blurb: "Knows the wood, and what the wood is hiding.", hitDie: 10, primary: "dex", saves: ["str", "dex"], caster: true },
  { id: "rogue",     name: "Rogue",     blurb: "The lock was always going to lose.", hitDie: 8, primary: "dex", saves: ["dex", "int"], caster: false },
  { id: "sorcerer",  name: "Sorcerer",  blurb: "The power was never studied. It was inherited.", hitDie: 6, primary: "cha", saves: ["con", "cha"], caster: true },
  { id: "warlock",   name: "Warlock",   blurb: "Something answered. It is still listening.", hitDie: 8, primary: "cha", saves: ["wis", "cha"], caster: true },
  { id: "wizard",    name: "Wizard",    blurb: "Reality, read closely enough to be argued with.", hitDie: 6, primary: "int", saves: ["int", "wis"], caster: true },
];

export type BackgroundId =
  | "acolyte" | "criminal" | "folk-hero" | "noble"
  | "sage" | "soldier" | "outlander" | "charlatan";

export const BACKGROUNDS: Array<{ id: BackgroundId; name: string; blurb: string }> = [
  { id: "acolyte",    name: "Acolyte",    blurb: "You kept the rites. Something kept its side of the bargain." },
  { id: "criminal",   name: "Criminal",   blurb: "You know which windows are never locked." },
  { id: "folk-hero",  name: "Folk Hero",  blurb: "One good deed, badly exaggerated, and now they expect more." },
  { id: "noble",      name: "Noble",      blurb: "A name that opens doors, and paints a target on your back." },
  { id: "sage",       name: "Sage",       blurb: "You read the passage everyone else was told to burn." },
  { id: "soldier",    name: "Soldier",    blurb: "You have marched, and buried, and marched again." },
  { id: "outlander",  name: "Outlander",  blurb: "Cities feel like traps. They usually are." },
  { id: "charlatan",  name: "Charlatan",  blurb: "The cure does nothing, but the bottle is very convincing." },
];

export const TONES = [
  { id: "grim",      name: "Grim & Perilous", blurb: "Death is cheap and consequences stick." },
  { id: "heroic",    name: "High Heroic",     blurb: "Sweeping deeds, worthy foes, real stakes." },
  { id: "mystery",   name: "Gothic Mystery",  blurb: "Something is wrong here, and it is patient." },
  { id: "wry",       name: "Wry & Wandering", blurb: "Danger, with the occasional absurdity." },
] as const;

export type ToneId = (typeof TONES)[number]["id"];

/* ── Point buy ────────────────────────────────────────────────────────────── */

export const POINT_BUY_BUDGET = 27;
export const POINT_BUY_MIN = 8;
export const POINT_BUY_MAX = 15;

/** SRD point-buy cost table: 8-13 cost 1/step, 14 and 15 cost 2/step. */
const POINT_COST: Record<number, number> = {
  8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9,
};

export function pointBuyCost(score: number): number {
  return POINT_COST[score] ?? Number.POSITIVE_INFINITY;
}

export function totalPointBuyCost(scores: AbilityScores): number {
  return ABILITIES.reduce((sum, a) => sum + pointBuyCost(scores[a]), 0);
}

export const DEFAULT_SCORES: AbilityScores = {
  str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10,
};

/* ── Derived values ───────────────────────────────────────────────────────── */

export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function formatModifier(mod: number): string {
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

/** Applies racial bonuses on top of the player's point-buy spread. */
export function applyRacialBonuses(
  base: AbilityScores,
  raceId: RaceId,
): AbilityScores {
  const race = getRace(raceId);
  const out = { ...base };
  for (const ability of ABILITIES) {
    out[ability] += race.bonuses[ability] ?? 0;
  }
  return out;
}

/** Level 1 hit points: full hit die plus Constitution modifier. */
export function deriveMaxHp(classId: ClassId, con: number): number {
  return Math.max(1, getClass(classId).hitDie + abilityModifier(con));
}

/** Unarmoured baseline. Equipment adjusts this later; the narrator does not. */
export function deriveAc(dex: number): number {
  return 10 + abilityModifier(dex);
}

/** Spell points, used purely to drive the mana orb. Non-casters show none. */
export function deriveMaxMana(classId: ClassId, scores: AbilityScores): number {
  const cls = getClass(classId);
  if (!cls.caster) return 0;
  return Math.max(2, 4 + abilityModifier(scores[cls.primary]) * 2);
}

/* ── Lookups ──────────────────────────────────────────────────────────────── */

export function getRace(id: string): Race {
  const found = RACES.find((r) => r.id === id);
  if (!found) throw new Error(`Unknown race: ${id}`);
  return found;
}

export function getClass(id: string): CharClass {
  const found = CLASSES.find((c) => c.id === id);
  if (!found) throw new Error(`Unknown class: ${id}`);
  return found;
}

export function getBackground(id: string) {
  const found = BACKGROUNDS.find((b) => b.id === id);
  if (!found) throw new Error(`Unknown background: ${id}`);
  return found;
}

export const RACE_IDS = RACES.map((r) => r.id);
export const CLASS_IDS = CLASSES.map((c) => c.id);
export const BACKGROUND_IDS = BACKGROUNDS.map((b) => b.id);
export const GENDER_IDS = GENDERS.map((g) => g.id);
export const TONE_IDS = TONES.map((t) => t.id);
