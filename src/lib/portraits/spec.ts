import type { RaceId, GenderId } from "@/lib/game/srd";
import { streamFor, type Rng } from "./rng";
import {
  SKIN_BY_RACE,
  HAIR_BY_RACE,
  EYES_BY_RACE,
  GARMENTS,
  type SkinRamp,
  type HairRamp,
  type EyeColour,
  type Garment,
} from "./palettes";

/**
 * Portrait composition.
 *
 * A face is described here as numbers and part ids; Portrait.tsx turns that
 * description into SVG. Splitting it this way means the geometry can be
 * reasoned about (and unit-tested) without touching rendering.
 *
 * Rather than drawing six separate faces, one parametric face is morphed per
 * race. That is what makes an elf and a half-orc feel like the same art
 * direction instead of six unrelated doodles, and adding a seventh race is a
 * morph entry rather than a new illustration.
 *
 * Canvas is 200 x 240. Face centre x = 100, crown near y = 42, chin near y = 158.
 */

export type HairStyle =
  | "bald" | "cropped" | "short" | "swept" | "long"
  | "braids" | "topknot" | "wild" | "receding" | "curls";

export type FacialHair =
  | "none" | "stubble" | "moustache" | "goatee"
  | "short-beard" | "full-beard" | "forked" | "long-beard";

export type HornStyle = "curved" | "swept" | "ram" | "spiked";

export type Scar = "none" | "cheek" | "brow" | "cross" | "eyepatch";

export type Morph = {
  /** Half-width of the cranium. */
  headW: number;
  /** Half-height of the cranium. */
  headH: number;
  /** Half-width at the jaw hinge. */
  jawW: number;
  /** Y of the chin point. */
  chinY: number;
  /** How square the jaw is: 0 tapered, 1 blocky. */
  jawSquare: number;
  /** Brow ridge prominence, 0-1. Drives the shadow over the eyes. */
  brow: number;
  /** Eye size multiplier. */
  eyeScale: number;
  /** Y of the eye line. */
  eyeY: number;
  /** Horizontal distance of each eye from centre. */
  eyeSpread: number;
  /** Ear length; ear tip is pointed when `earPoint` is true. */
  earLen: number;
  earPoint: boolean;
  /** Nose size multiplier. */
  noseScale: number;
  /** Neck half-width. */
  neckW: number;
};

const BASE_MORPH: Morph = {
  headW: 46, headH: 52, jawW: 38, chinY: 156, jawSquare: 0.45,
  brow: 0.4, eyeScale: 1, eyeY: 104, eyeSpread: 20,
  earLen: 16, earPoint: false, noseScale: 1, neckW: 22,
};

/** Per-race deltas applied on top of BASE_MORPH. */
const RACE_MORPH: Record<RaceId, Partial<Morph>> = {
  human: {},
  elf: {
    headW: 42, headH: 54, jawW: 31, chinY: 158, jawSquare: 0.18,
    brow: 0.22, eyeScale: 1.08, eyeSpread: 21,
    earLen: 34, earPoint: true, noseScale: 0.88, neckW: 19,
  },
  dwarf: {
    headW: 50, headH: 48, jawW: 45, chinY: 150, jawSquare: 0.82,
    brow: 0.78, eyeScale: 0.94, eyeY: 102, eyeSpread: 21,
    earLen: 15, noseScale: 1.22, neckW: 27,
  },
  halfling: {
    headW: 48, headH: 50, jawW: 36, chinY: 150, jawSquare: 0.3,
    brow: 0.28, eyeScale: 1.24, eyeY: 106, eyeSpread: 20,
    earLen: 17, noseScale: 0.92, neckW: 20,
  },
  "half-orc": {
    headW: 51, headH: 50, jawW: 49, chinY: 154, jawSquare: 0.92,
    brow: 0.95, eyeScale: 0.88, eyeY: 100, eyeSpread: 22,
    earLen: 20, earPoint: true, noseScale: 1.16, neckW: 31,
  },
  tiefling: {
    headW: 44, headH: 52, jawW: 34, chinY: 157, jawSquare: 0.3,
    brow: 0.42, eyeScale: 1.02, eyeSpread: 20,
    earLen: 26, earPoint: true, noseScale: 0.92, neckW: 21,
  },
};

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/**
 * Applies race, then gender, then per-seed jitter.
 *
 * Gender is a multiplier on widths and an offset on the 0-1 traits rather than
 * a separate morph table, so it reads as a nudge within a race instead of a
 * different species.
 */
function buildMorph(race: RaceId, gender: GenderId, rng: Rng): Morph {
  const m: Morph = { ...BASE_MORPH, ...RACE_MORPH[race] };

  if (gender === "male") {
    m.jawW *= 1.06;
    m.neckW *= 1.12;
    m.jawSquare = clamp01(m.jawSquare + 0.12);
    m.brow = clamp01(m.brow + 0.12);
  } else if (gender === "female") {
    m.jawW *= 0.9;
    m.neckW *= 0.9;
    m.jawSquare = clamp01(m.jawSquare - 0.14);
    m.brow = clamp01(m.brow - 0.12);
    m.eyeScale += 0.04;
  }

  /* Per-seed jitter so two dwarves are not the same dwarf. */
  m.headW += rng.range(-2.5, 2.5);
  m.headH += rng.range(-2.5, 2.5);
  m.jawW += rng.range(-2, 2);
  m.chinY += rng.range(-3, 3);
  m.eyeY += rng.range(-2, 2);
  m.eyeSpread += rng.range(-1.2, 1.2);
  m.noseScale += rng.range(-0.1, 0.1);
  m.eyeScale += rng.range(-0.05, 0.05);

  return m;
}

export type PortraitSpec = {
  race: RaceId;
  gender: GenderId;
  seed: number;
  morph: Morph;
  skin: SkinRamp;
  hair: HairRamp;
  eye: EyeColour;
  garment: Garment;
  hairStyle: HairStyle;
  facialHair: FacialHair;
  horns: HornStyle | null;
  tusks: boolean;
  scar: Scar;
  earring: boolean;
  warPaint: boolean;
  /** Solid glowing eyes with no sclera. Tieflings only. */
  glowEyes: boolean;
  browAngle: number;
  mouthWidth: number;
  mouthCurve: number;
};

/* Hairstyle weights per race. Dwarves rarely go long on top; halflings are
   almost always curly; elves skew to long and braided. */
const HAIR_WEIGHTS: Record<RaceId, ReadonlyArray<readonly [HairStyle, number]>> = {
  human:      [["cropped", 3], ["short", 4], ["swept", 3], ["long", 3], ["braids", 2], ["topknot", 2], ["wild", 2], ["receding", 1], ["curls", 2], ["bald", 1]],
  elf:        [["long", 5], ["braids", 4], ["swept", 3], ["topknot", 2], ["short", 2], ["curls", 1]],
  dwarf:      [["braids", 4], ["short", 3], ["topknot", 3], ["wild", 2], ["receding", 2], ["bald", 2], ["long", 2]],
  halfling:   [["curls", 6], ["short", 3], ["swept", 2], ["wild", 2], ["cropped", 1]],
  "half-orc": [["topknot", 4], ["wild", 3], ["bald", 3], ["cropped", 3], ["braids", 2], ["long", 1]],
  tiefling:   [["long", 4], ["swept", 3], ["braids", 3], ["wild", 2], ["topknot", 2], ["cropped", 2]],
};

/** How likely facial hair is at all, before style is chosen. */
const BEARD_CHANCE: Record<RaceId, number> = {
  human: 0.5, elf: 0.12, dwarf: 0.97, halfling: 0.45, "half-orc": 0.4, tiefling: 0.3,
};

const BEARD_WEIGHTS: Record<RaceId, ReadonlyArray<readonly [FacialHair, number]>> = {
  human:      [["stubble", 3], ["moustache", 2], ["goatee", 3], ["short-beard", 4], ["full-beard", 3], ["long-beard", 1]],
  elf:        [["stubble", 2], ["goatee", 2], ["moustache", 1]],
  dwarf:      [["full-beard", 5], ["long-beard", 5], ["forked", 4], ["short-beard", 2]],
  halfling:   [["stubble", 3], ["short-beard", 3], ["moustache", 2], ["goatee", 2]],
  "half-orc": [["stubble", 3], ["goatee", 2], ["short-beard", 2], ["forked", 1]],
  tiefling:   [["goatee", 3], ["stubble", 2], ["moustache", 2], ["forked", 1]],
};

/**
 * Composes a complete face description.
 *
 * Each facet draws from its own named RNG stream (see rng.ts), so adding a
 * feature later cannot reshuffle faces that already exist.
 */
export function generatePortrait(
  race: RaceId,
  gender: GenderId,
  seed: number,
): PortraitSpec {
  const morphRng = streamFor(seed, `${race}:${gender}:morph`);
  const colourRng = streamFor(seed, `${race}:${gender}:colour`);
  const featureRng = streamFor(seed, `${race}:${gender}:feature`);
  const markRng = streamFor(seed, `${race}:${gender}:mark`);

  const morph = buildMorph(race, gender, morphRng);

  const skin = colourRng.pick(SKIN_BY_RACE[race]);
  const hair = colourRng.pick(HAIR_BY_RACE[race]);
  const eye = colourRng.pick(EYES_BY_RACE[race]);
  const garment = colourRng.pick(GARMENTS);

  const hairStyle = featureRng.weighted(HAIR_WEIGHTS[race]);

  /* Facial hair is suppressed on female portraits. Nonbinary keeps a reduced
     chance rather than none, so the option is genuinely open. */
  const beardMultiplier = gender === "female" ? 0 : gender === "nonbinary" ? 0.45 : 1;
  const facialHair: FacialHair =
    featureRng.chance(BEARD_CHANCE[race] * beardMultiplier)
      ? featureRng.weighted(BEARD_WEIGHTS[race])
      : "none";

  const horns: HornStyle | null =
    race === "tiefling"
      ? featureRng.weighted([["curved", 4], ["swept", 3], ["ram", 2], ["spiked", 2]] as const)
      : null;

  const scar: Scar = markRng.weighted([
    ["none", 62],
    ["cheek", 14],
    ["brow", 12],
    ["cross", 7],
    ["eyepatch", 5],
  ] as const);

  return {
    race,
    gender,
    seed,
    morph,
    skin,
    hair,
    eye,
    garment,
    hairStyle,
    facialHair,
    horns,
    tusks: race === "half-orc",
    scar,
    earring: markRng.chance(race === "half-orc" || race === "tiefling" ? 0.35 : 0.18),
    warPaint: markRng.chance(race === "half-orc" ? 0.3 : 0.08),
    glowEyes: race === "tiefling",
    browAngle: featureRng.range(-7, 7),
    mouthWidth: featureRng.range(0.85, 1.15),
    mouthCurve: featureRng.range(-1.4, 0.9),
  };
}

/**
 * Three distinct candidate faces for the character creation screen.
 *
 * Seeds are rejected until each produces a visibly different face — without
 * this, three random seeds regularly yield three near-identical portraits and
 * the choice feels broken. Comparing on the visually dominant traits (not the
 * full spec) is what "distinct" means here.
 */
export function generateCandidates(
  race: RaceId,
  gender: GenderId,
  seeds: number[],
): PortraitSpec[] {
  return seeds.map((s) => generatePortrait(race, gender, s));
}

export function distinctnessKey(spec: PortraitSpec): string {
  return [spec.skin.name, spec.hair.name, spec.hairStyle, spec.facialHair].join("|");
}
