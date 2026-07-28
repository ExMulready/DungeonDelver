import { randomInt } from "node:crypto";
import type { Ability, AbilityScores, DiceRoll, SuggestedCheck } from "./types";
import { abilityModifier } from "./srd";

/**
 * Dice resolution. Server-side, and deliberately the only place in the app that
 * decides whether an attempt succeeds.
 *
 * The narrator model proposes checks but never resolves them. If it were
 * allowed to, it would quietly grant whatever outcome makes the better
 * paragraph — which is exactly the failure mode that turns a game back into a
 * story generator. Keeping the roll here means the model has to write around a
 * result it did not choose.
 *
 * Uses node:crypto randomInt rather than Math.random: unbiased across the
 * range, and there is no reason to accept a worse generator for this.
 */

/** Rolls a single die with `sides` faces. */
export function roll(sides: number): number {
  return randomInt(1, sides + 1);
}

/** Rolls `count` dice of `sides` and returns each face. */
export function rollMany(count: number, sides: number): number[] {
  return Array.from({ length: count }, () => roll(sides));
}

const CLAMP_DC_MIN = 5;
const CLAMP_DC_MAX = 30;

/**
 * Resolves an ability check.
 *
 * A natural 20 always succeeds and a natural 1 always fails, regardless of the
 * modifier. That is a house rule rather than strict SRD for ability checks, but
 * it gives the narrator two guaranteed swing moments to write against.
 */
export function resolveCheck(
  check: SuggestedCheck,
  scores: AbilityScores,
): DiceRoll {
  /* The model picks the DC, so it is untrusted input — clamp it. Left alone, a
     small model will occasionally propose DC 45 and make the game unplayable. */
  const dc = Math.min(CLAMP_DC_MAX, Math.max(CLAMP_DC_MIN, Math.round(check.dc)));

  const d20 = roll(20);
  const modifier = abilityModifier(scores[check.ability]);
  const total = d20 + modifier;

  const critical = d20 === 20 ? "hit" : d20 === 1 ? "miss" : null;
  const success = critical === "hit" ? true : critical === "miss" ? false : total >= dc;

  return {
    ability: check.ability,
    dc,
    reason: check.reason,
    d20,
    modifier,
    total,
    success,
    critical,
  };
}

/** Human-readable summary, fed back to the narrator on the following turn. */
export function describeRoll(roll: DiceRoll, abilityName: string): string {
  const verdict = roll.success ? "SUCCESS" : "FAILURE";
  const crit =
    roll.critical === "hit"
      ? " (critical success — a natural 20)"
      : roll.critical === "miss"
        ? " (critical failure — a natural 1)"
        : "";

  const sign = roll.modifier >= 0 ? "+" : "";
  return (
    `${abilityName} check vs DC ${roll.dc}: rolled ${roll.d20}${sign}${roll.modifier} = ${roll.total}. ` +
    `${verdict}${crit}.`
  );
}

/** Standard 4d6-drop-lowest, offered as an alternative to point buy. */
export function rollAbilityScore(): number {
  const dice = rollMany(4, 6).sort((a, b) => b - a);
  return dice[0] + dice[1] + dice[2];
}

export function rollAbilitySpread(): Record<Ability, number> {
  return {
    str: rollAbilityScore(),
    dex: rollAbilityScore(),
    con: rollAbilityScore(),
    int: rollAbilityScore(),
    wis: rollAbilityScore(),
    cha: rollAbilityScore(),
  };
}
