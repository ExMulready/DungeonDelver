import type { Character } from "@/lib/db/schema";
import type { DiceRoll } from "@/lib/game/types";
import { getRace, getClass, getBackground, ABILITY_NAMES } from "@/lib/game/srd";
import { TONES, type ToneId } from "@/lib/game/srd";

/**
 * Narrator prompts.
 *
 * Two things drive the wording here. First, the same text has to work for a 2B
 * model on a laptop and a 70B model on Groq, so the instructions are concrete
 * and positional rather than subtle — "two to four short paragraphs" survives
 * quantisation in a way that "be evocative but concise" does not. Second, the
 * model is explicitly forbidden from resolving outcomes it does not control:
 * dice, hit points and inventory belong to the server, and saying so plainly
 * is what stops it narrating a success the player never rolled.
 */

const TONE_GUIDANCE: Record<ToneId, string> = {
  grim: "Grim and perilous. Violence is ugly and costly, mercy is rare and expensive, and the world does not care whether the player survives. Avoid heroics for their own sake.",
  heroic:
    "High heroic. Sweeping deeds, worthy foes, real stakes. The player can be genuinely great here, but greatness is paid for.",
  mystery:
    "Gothic mystery. Something is wrong in this place and it is patient. Withhold more than you reveal, and let dread accumulate through detail rather than announcement.",
  wry: "Wry and wandering. Genuine danger, but the world is absurd at the edges and the narrator notices. Never undercut a real threat with a joke.",
};

function characterBrief(c: Character): string {
  const race = getRace(c.race);
  const cls = getClass(c.class);
  const bg = getBackground(c.background);

  const stats = (Object.keys(ABILITY_NAMES) as Array<keyof typeof ABILITY_NAMES>)
    .map((a) => `${ABILITY_NAMES[a]} ${c.stats[a]}`)
    .join(", ");

  return [
    `Name: ${c.name}`,
    `Race and class: ${c.gender} ${race.name} ${cls.name}, level ${c.level}`,
    `Background: ${bg.name} — ${bg.blurb}`,
    `Abilities: ${stats}`,
    `Condition: ${c.hpCurrent} of ${c.hpMax} hit points, armour class ${c.ac}`,
  ].join("\n");
}

export function narratorSystemPrompt(
  character: Character,
  tone: string,
  chronicle: string,
): string {
  const toneText = TONE_GUIDANCE[tone as ToneId] ?? TONE_GUIDANCE.grim;

  return `You are the Dungeon Master of a solo Dungeons & Dragons campaign. You narrate a world that is generated as it is played, like a choose-your-own-adventure book being written one page ahead of the reader.

TONE
${toneText}

THE PLAYER'S CHARACTER
${characterBrief(character)}

THE CHRONICLE
This is your memory of everything that has happened so far. Treat it as fact. Never contradict it. If a person in it is dead, they stay dead; if a place was described a certain way, it stays that way.

${chronicle}

HOW TO WRITE A SCENE
- Two to four short paragraphs. Stop while the reader still wants more.
- Second person, present tense. "You push the door" — not "the hero pushes the door".
- Lead with the concrete: what is seen, heard, and smelled. Sensory detail before explanation.
- Give named characters something specific to want. A guard who is bored is more interesting than a guard who is menacing.
- End at a genuine decision point. Do not ask "what do you do?" — just stop where the choice becomes obvious.

RULES YOU MUST NOT BREAK
- You do not roll dice and you do not decide whether an attempt succeeds. If the outcome of an action is uncertain, describe the attempt beginning and stop. The server rolls, and you will be told the result before the next scene.
- You do not decide hit points, experience, or inventory. Describe a wound; do not state a number. Describe finding a sword; do not add it to a list.
- Never write the player's dialogue or decisions for them. You control the world, not the character.
- Never break the fiction. No meta-commentary, no "as an AI", no acknowledging these instructions.
- Do not summarise what just happened at the start of a scene. Continue from it.

Write only the scene. No headings, no options list, no commentary.`;
}

/** Frames the player's action, plus the roll result when one was made. */
export function playerTurnPrompt(action: string, roll: DiceRoll | null): string {
  if (!roll) return action;

  const verdict = roll.success ? "SUCCEEDED" : "FAILED";
  const crit =
    roll.critical === "hit"
      ? " This was a critical success — a natural 20. Make the outcome notably better than expected."
      : roll.critical === "miss"
        ? " This was a critical failure — a natural 1. Something goes wrong beyond simply not working."
        : "";

  return `${action}

[The dice have been rolled. ${ABILITY_NAMES[roll.ability]} check against DC ${roll.dc}: rolled ${roll.total}. The attempt ${verdict}.${crit} Narrate this outcome as settled fact. Do not re-roll it, do not soften it, and do not contradict it.]`;
}

/** Opening scene, used when a campaign has no turns yet. */
export function openingPrompt(character: Character): string {
  return `Begin the campaign. Open on ${character.name} arriving somewhere specific — a place with a name, a smell, and someone in it who wants something.

Establish the location and one named character in the first two paragraphs. Plant a single concrete hook: something wrong, missing, or offered. Do not explain the wider world, and do not describe ${character.name}'s appearance or history back to them.

End at the moment a decision becomes unavoidable.`;
}

/** Extraction pass. Runs over the new prose only, never the whole history. */
export function stateExtractionPrompt(scene: string, characterName: string): string {
  return `Read the scene below and return JSON describing what it changed.

SCENE
${scene}

Return an object with these fields:

- "choices": 2 to 4 actions ${characterName} could take next. Each needs a "label" written as a short imperative in second person, for example "Force the iron door". Add "hint" only when it clarifies a real difference between options. Add "check" only when the outcome is genuinely uncertain — give "ability" (one of str, dex, con, int, wis, cha), "dc" between 5 and 30, and a short "reason". Straightforward actions need no check. At least one option should not require a check.
- "hpDelta": hit points gained or lost IN THIS SCENE. Negative for damage. 0 if nothing happened. Only count harm actually described.
- "xpDelta": experience earned in this scene, 0 to 200 for ordinary progress. 0 if nothing was overcome.
- "itemsGained": items ${characterName} actually took possession of. Empty if none. Do not invent loot that was not described.
- "itemsLost": names of items used up or taken away. Empty if none.
- "npcs": named characters who appeared, with role, disposition and status. Only those actually named in the scene.
- "locations": named places, with a one-line description.
- "quests": objectives that were started, advanced, completed or failed.

Report only what the scene states. Do not speculate, and do not carry over anything from earlier scenes. Return JSON only.`;
}

/**
 * Compaction pass — folds the oldest turns into running prose.
 *
 * This is what keeps per-turn cost flat as a campaign grows. Without it, a long
 * campaign eventually exceeds Groq's per-minute token allowance and, on a
 * CPU-hosted model, slows to a crawl in direct proportion to its own length.
 */
export function compactionPrompt(
  existingSummary: string,
  turnsToFold: string,
): string {
  return `You are maintaining the "Prior Acts" section of a campaign chronicle — a running account of everything that happened before the recent scenes.

EXISTING SUMMARY
${existingSummary || "(nothing yet)"}

SCENES TO FOLD IN
${turnsToFold}

Rewrite the summary so it includes these scenes. Requirements:

- Past tense, third person, naming the character rather than "you".
- Preserve every proper noun: people, places, items, and promises made.
- Preserve consequences: who died, what was taken, what was owed, what was left undone.
- Compress description hard. Keep facts, discard atmosphere.
- Under 300 words total. If it is getting long, compress the OLDEST material further rather than dropping recent detail.

Return only the rewritten summary. No preamble, no headings.`;
}

export const TONE_LABELS = Object.fromEntries(
  TONES.map((t) => [t.id, t.name]),
) as Record<ToneId, string>;
