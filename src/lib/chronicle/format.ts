import type { WorldFacts, DiceRoll } from "@/lib/game/types";
import type { Character } from "@/lib/db/schema";
import { getRace, getClass, getBackground, ABILITY_NAMES, formatModifier, abilityModifier } from "@/lib/game/srd";

/**
 * Renders the chronicle: the markdown document that is both the player's
 * readable record and the narrator's memory.
 *
 * The document is GENERATED from structured state, never parsed back. That
 * direction matters. An earlier design had the model rewrite the markdown
 * directly and the app parse it, which fails the moment a 2B model omits a
 * heading or invents one — and it fails silently, corrupting the campaign.
 * Here the database holds the truth (worldFacts, actSummary, turns) and this
 * file is a pure projection of it, so a malformed model response can lose a
 * single update but can never damage the record.
 */

export type ChronicleInput = {
  title: string;
  tone: string;
  character: Character;
  worldFacts: WorldFacts;
  actSummary: string;
  recentTurns: Array<{
    turnNumber: number;
    role: string;
    content: string;
    diceRoll: DiceRoll | null;
  }>;
};

function characterLine(c: Character): string {
  const race = getRace(c.race);
  const cls = getClass(c.class);
  const bg = getBackground(c.background);
  return `${c.name} — a ${c.gender} ${race.name} ${cls.name}, ${bg.name.toLowerCase()}. Level ${c.level}.`;
}

function statBlock(c: Character): string {
  const stats = c.stats;
  const parts = (Object.keys(ABILITY_NAMES) as Array<keyof typeof ABILITY_NAMES>).map(
    (a) => `${ABILITY_NAMES[a].slice(0, 3).toUpperCase()} ${stats[a]} (${formatModifier(abilityModifier(stats[a]))})`,
  );
  return `${parts.join(" · ")}\nHP ${c.hpCurrent}/${c.hpMax} · AC ${c.ac} · XP ${c.xp}`;
}

export function renderChronicle(input: ChronicleInput): string {
  const { title, tone, character, worldFacts, actSummary, recentTurns } = input;
  const lines: string[] = [];

  lines.push(`# Chronicle: ${title}`);
  lines.push("");
  lines.push(`*Tone: ${tone}.*`);
  lines.push("");
  lines.push(`**${characterLine(character)}**`);
  lines.push("");
  lines.push("```");
  lines.push(statBlock(character));
  lines.push("```");
  lines.push("");

  /* ── Dramatis Personae ── */
  lines.push("## Dramatis Personae");
  lines.push("");
  if (worldFacts.npcs.length === 0) {
    lines.push("_No one of consequence met yet._");
  } else {
    for (const npc of worldFacts.npcs) {
      const seen = npc.lastSeen ? ` Last seen: ${npc.lastSeen}.` : "";
      lines.push(
        `- **${npc.name}** — ${npc.role}. Disposition: ${npc.disposition}. Status: ${npc.status}.${seen}`,
      );
    }
  }
  lines.push("");

  /* ── World & Locations ── */
  lines.push("## World & Locations");
  lines.push("");
  if (worldFacts.locations.length === 0) {
    lines.push("_Nowhere charted yet._");
  } else {
    for (const loc of worldFacts.locations) {
      lines.push(
        `- **${loc.name}**${loc.visited ? "" : " (heard of, not yet seen)"} — ${loc.description}`,
      );
    }
  }
  lines.push("");

  /* ── Quest State ── */
  lines.push("## Quest State");
  lines.push("");
  if (worldFacts.quests.length === 0) {
    lines.push("_No threads pulled yet._");
  } else {
    for (const q of worldFacts.quests) {
      lines.push(`- *${q.status}* — **${q.name}**: ${q.detail}`);
    }
  }
  lines.push("");

  /* ── Boons & Burdens ── */
  lines.push("## Boons & Burdens");
  lines.push("");
  const inv = character.inventory ?? [];
  if (inv.length === 0) {
    lines.push("_Carrying nothing worth naming._");
  } else {
    for (const item of inv) {
      const qty = item.quantity > 1 ? ` ×${item.quantity}` : "";
      lines.push(`- **${item.name}**${qty} (${item.rarity}) — ${item.description}`);
    }
  }
  lines.push("");

  /* ── Prior Acts ── */
  lines.push("## Prior Acts");
  lines.push("");
  lines.push(actSummary.trim() || "_The tale has only just begun._");
  lines.push("");

  /* ── Recent Scenes ── */
  lines.push("## Recent Scenes");
  lines.push("");
  if (recentTurns.length === 0) {
    lines.push("_Nothing has happened yet._");
  } else {
    for (const turn of recentTurns) {
      const who = turn.role === "player" ? character.name : "Narrator";
      lines.push(`### Turn ${turn.turnNumber} — ${who}`);
      lines.push("");
      lines.push(turn.content.trim());
      if (turn.diceRoll) {
        lines.push("");
        lines.push(`> ${describeRollForChronicle(turn.diceRoll)}`);
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}

function describeRollForChronicle(roll: DiceRoll): string {
  const verdict = roll.success ? "Success" : "Failure";
  const crit =
    roll.critical === "hit" ? " (natural 20)" : roll.critical === "miss" ? " (natural 1)" : "";
  return `**${verdict}${crit}** — ${ABILITY_NAMES[roll.ability]} check, DC ${roll.dc}, rolled ${roll.total}. ${roll.reason}`;
}

/**
 * Trimmed chronicle for the prompt.
 *
 * The player gets the full document; the narrator gets everything except
 * Recent Scenes, because those are supplied separately as proper chat turns.
 * Sending them twice wastes a meaningful slice of Groq's per-minute token
 * budget and, on a small local model, measurably increases repetition.
 */
export function chronicleForPrompt(full: string): string {
  const idx = full.indexOf("## Recent Scenes");
  return idx === -1 ? full : full.slice(0, idx).trimEnd();
}
