import type { RaceId } from "@/lib/game/srd";

/**
 * Colour ramps, per race.
 *
 * Each skin entry carries four stops rather than one colour, because the
 * portraits are lit from a single warm source at upper-left: `light` is the
 * key, `base` the midtone, `shadow` the core shadow, and `line` the ink used
 * for contour. Picking these as a set is what keeps a face from reading flat.
 *
 * The whole palette is deliberately desaturated and dark — a saturated skin
 * tone would fight the gold-on-black UI around it.
 */

export type SkinRamp = {
  name: string;
  light: string;
  base: string;
  shadow: string;
  line: string;
};

export type HairRamp = {
  name: string;
  light: string;
  base: string;
  shadow: string;
};

const HUMAN_SKIN: SkinRamp[] = [
  { name: "pale",    light: "#e0c0a4", base: "#c19a7b", shadow: "#8a6851", line: "#4a3527" },
  { name: "fair",    light: "#d8b494", base: "#b58c6c", shadow: "#7d5b44", line: "#432f22" },
  { name: "olive",   light: "#c9a479", base: "#a3805a", shadow: "#6d523a", line: "#3a2a1c" },
  { name: "tan",     light: "#b98f63", base: "#8f6a46", shadow: "#5d4229", line: "#31210f" },
  { name: "bronze",  light: "#9d7148", base: "#75512f", shadow: "#4c331c", line: "#281a0e" },
  { name: "deep",    light: "#7a5334", base: "#573a22", shadow: "#382415", line: "#1d120a" },
  { name: "ebon",    light: "#5b3d26", base: "#3f2919", shadow: "#281a10", line: "#150d07" },
];

const ELF_SKIN: SkinRamp[] = [
  { name: "moonlit",  light: "#e6d5c4", base: "#c9b4a0", shadow: "#8f7a68", line: "#4a3d33" },
  { name: "ashen",    light: "#d5cdc6", base: "#b0a69d", shadow: "#786e66", line: "#3e3730" },
  { name: "gilded",   light: "#dcc296", base: "#b89a70", shadow: "#806848", line: "#443626" },
  { name: "twilight", light: "#b8adb8", base: "#948996", shadow: "#635a68", line: "#332e38" },
  { name: "duskwood", light: "#8a6f57", base: "#65503c", shadow: "#403225", line: "#221a13" },
];

const DWARF_SKIN: SkinRamp[] = [
  { name: "ruddy",    light: "#d9a382", base: "#b57c5c", shadow: "#7d523a", line: "#42291c" },
  { name: "weathered",light: "#c4936c", base: "#9d6f4c", shadow: "#6a4830", line: "#382518" },
  { name: "sooted",   light: "#a67f5f", base: "#815e42", shadow: "#563d29", line: "#2c1f14" },
  { name: "granite",  light: "#b8a08a", base: "#917a66", shadow: "#615043", line: "#332a22" },
];

const HALFLING_SKIN: SkinRamp[] = [
  { name: "wheat",   light: "#e3c3a0", base: "#c29d78", shadow: "#8a6c50", line: "#483527" },
  { name: "honey",   light: "#d4a877", base: "#ae8455", shadow: "#775738", line: "#3e2c1c" },
  { name: "chestnut",light: "#a97a52", base: "#835a38", shadow: "#573a23", line: "#2d1d12" },
];

const HALF_ORC_SKIN: SkinRamp[] = [
  { name: "moss",     light: "#8fa377", base: "#6b7d55", shadow: "#465336", line: "#232b1a" },
  { name: "slate-green", light: "#7d9184", base: "#5b6d61", shadow: "#3b483f", line: "#1e261f" },
  { name: "bile",     light: "#9aa35f", base: "#747c42", shadow: "#4d5329", line: "#272a13" },
  { name: "grey-jade",light: "#8b9a92", base: "#67746d", shadow: "#434d48", line: "#212724" },
  { name: "bruised",  light: "#87867f", base: "#63625c", shadow: "#40403b", line: "#20201d" },
];

const TIEFLING_SKIN: SkinRamp[] = [
  { name: "ember",    light: "#c96a52", base: "#a04434", shadow: "#6b2a20", line: "#38130e" },
  { name: "crimson",  light: "#b8524f", base: "#8e3532", shadow: "#5e1f1e", line: "#310e0e" },
  { name: "violet",   light: "#9d7ba6", base: "#77577f", shadow: "#4e3654", line: "#291b2c" },
  { name: "cinder",   light: "#9a6a5c", base: "#744a3e", shadow: "#4c2e26", line: "#281713" },
  { name: "sulphur",  light: "#c39a5c", base: "#9a7440", shadow: "#674c28", line: "#352714" },
];

export const SKIN_BY_RACE: Record<RaceId, SkinRamp[]> = {
  human: HUMAN_SKIN,
  elf: ELF_SKIN,
  dwarf: DWARF_SKIN,
  halfling: HALFLING_SKIN,
  "half-orc": HALF_ORC_SKIN,
  tiefling: TIEFLING_SKIN,
};

const COMMON_HAIR: HairRamp[] = [
  { name: "black",     light: "#3a3538", base: "#211d20", shadow: "#100e10" },
  { name: "raven",     light: "#453d44", base: "#2a242a", shadow: "#141114" },
  { name: "dark-brown",light: "#5a4230", base: "#3a2a1d", shadow: "#1e1510" },
  { name: "chestnut",  light: "#7a5334", base: "#523620", shadow: "#2b1c11" },
  { name: "auburn",    light: "#8a4a2c", base: "#5e301b", shadow: "#331a0f" },
  { name: "ash-blond", light: "#c2ab84", base: "#95805c", shadow: "#5e5039" },
  { name: "flaxen",    light: "#d7c091", base: "#a89268", shadow: "#6b5c41" },
  { name: "iron-grey", light: "#8e8a86", base: "#65625f", shadow: "#3c3a38" },
  { name: "white",     light: "#ded8cf", base: "#b3aca2", shadow: "#736e67" },
];

const EXOTIC_HAIR: HairRamp[] = [
  { name: "moonsilver", light: "#e2e0d6", base: "#b6b4ab", shadow: "#77756e" },
  { name: "deep-red",   light: "#8e3630", base: "#5f211d", shadow: "#331110" },
  { name: "midnight",   light: "#3c3a52", base: "#242236", shadow: "#12111c" },
];

export const HAIR_BY_RACE: Record<RaceId, HairRamp[]> = {
  human: COMMON_HAIR,
  elf: [...COMMON_HAIR, ...EXOTIC_HAIR],
  dwarf: COMMON_HAIR,
  halfling: COMMON_HAIR,
  "half-orc": COMMON_HAIR,
  tiefling: [...COMMON_HAIR, ...EXOTIC_HAIR],
};

export type EyeColour = { name: string; iris: string; glow?: string };

const COMMON_EYES: EyeColour[] = [
  { name: "brown",  iris: "#5b3b22" },
  { name: "hazel",  iris: "#7a5f2c" },
  { name: "amber",  iris: "#a3742a" },
  { name: "green",  iris: "#3f5f3a" },
  { name: "grey",   iris: "#5d666b" },
  { name: "blue",   iris: "#3f5872" },
  { name: "pale",   iris: "#8fa0a8" },
];

export const EYES_BY_RACE: Record<RaceId, EyeColour[]> = {
  human: COMMON_EYES,
  elf: [...COMMON_EYES, { name: "violet", iris: "#6a4a7a" }, { name: "gold", iris: "#a98b32" }],
  dwarf: COMMON_EYES,
  halfling: COMMON_EYES,
  "half-orc": [...COMMON_EYES, { name: "yellow", iris: "#93872c" }, { name: "red", iris: "#7a2f28" }],
  /* Tieflings have no visible sclera — the whole eye is a lit coal. */
  tiefling: [
    { name: "ember",   iris: "#c4442e", glow: "#ff7043" },
    { name: "gold",    iris: "#c49a2e", glow: "#ffcc55" },
    { name: "void",    iris: "#241f2c", glow: "#6b4a8a" },
    { name: "silver",  iris: "#b8bcc4", glow: "#e8ecf4" },
  ],
};

/** Garment colours for the shoulders. Muted so they sit behind the face. */
export const GARMENTS = [
  { name: "leather",  base: "#4a3826", light: "#634c33", trim: "#8a6a3f" },
  { name: "wool",     base: "#3b3a38", light: "#4f4d4a", trim: "#6b665c" },
  { name: "mail",     base: "#3f4348", light: "#585d63", trim: "#7d8288" },
  { name: "crimson",  base: "#4a1f1f", light: "#632b2a", trim: "#8a4038" },
  { name: "forest",   base: "#2c3a2c", light: "#3d4e3c", trim: "#5b6b52" },
  { name: "midnight", base: "#262a3a", light: "#353a4e", trim: "#4e5470" },
  { name: "sackcloth",base: "#463d30", light: "#5e5342", trim: "#736a55" },
] as const;

export type Garment = (typeof GARMENTS)[number];
