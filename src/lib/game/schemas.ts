import { z } from "zod";
import {
  RACE_IDS,
  CLASS_IDS,
  BACKGROUND_IDS,
  GENDER_IDS,
  TONE_IDS,
  POINT_BUY_BUDGET,
  POINT_BUY_MIN,
  POINT_BUY_MAX,
  totalPointBuyCost,
  type RaceId,
  type ClassId,
  type BackgroundId,
  type GenderId,
  type ToneId,
} from "./srd";

/* z.enum needs a non-empty tuple; the SRD lists are plain arrays. */
const tuple = <T extends string>(arr: T[]) => arr as [T, ...T[]];

const scoreSchema = z
  .number()
  .int()
  .min(POINT_BUY_MIN)
  .max(POINT_BUY_MAX);

export const abilityScoresSchema = z.object({
  str: scoreSchema,
  dex: scoreSchema,
  con: scoreSchema,
  int: scoreSchema,
  wis: scoreSchema,
  cha: scoreSchema,
});

export const createCharacterSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Your character needs a name.")
    .max(40, "Keep it under 40 characters."),
  race: z.enum(tuple(RACE_IDS as RaceId[])),
  class: z.enum(tuple(CLASS_IDS as ClassId[])),
  gender: z.enum(tuple(GENDER_IDS as GenderId[])),
  background: z.enum(tuple(BACKGROUND_IDS as BackgroundId[])),
  tone: z.enum(tuple(TONE_IDS as ToneId[])),

  /* Validated for affordability below — the range check on each score is not
     sufficient on its own, since six 15s are individually legal. */
  stats: abilityScoresSchema.refine(
    (s) => totalPointBuyCost(s) <= POINT_BUY_BUDGET,
    { message: `That spread costs more than ${POINT_BUY_BUDGET} points.` },
  ),

  /* Unsigned 32-bit. The portrait is regenerated from this, so it is the only
     part of the appearance that needs storing. */
  portraitSeed: z.number().int().min(0).max(0xffffffff),
});

export type CreateCharacterInput = z.infer<typeof createCharacterSchema>;
