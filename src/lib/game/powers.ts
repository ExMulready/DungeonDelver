import type { ClassId } from "./srd";
import type { ChoiceIcon } from "./types";

/**
 * Class powers. Purely server-owned, deliberately — cooldowns live on
 * `character.powerCooldowns` (see src/lib/db/schema.ts) and are decremented in
 * src/lib/game/engine.ts, so the client can only ever ask to activate a power
 * and never fabricate one being off cooldown.
 */
export type Power = {
  id: string;
  name: string;
  /** One line, shown in the hotbar tooltip. */
  blurb: string;
  classId: ClassId;
  /** Measured in turns, not seconds — decremented once per resolved turn. */
  cooldownTurns: number;
  /** Reuses the choice icon vocabulary so the hotbar tile matches the plaques. */
  icon: ChoiceIcon;
};

export const POWERS: Power[] = [
  // Barbarian
  { id: "rage", name: "Rage", blurb: "Advantage on Strength, resistance to physical damage.", classId: "barbarian", cooldownTurns: 2, icon: "violence" },
  { id: "reckless", name: "Reckless Attack", blurb: "Attack with advantage; enemies gain it back against you.", classId: "barbarian", cooldownTurns: 1, icon: "violence" },
  { id: "frenzy", name: "Frenzy", blurb: "An extra attack, paid for afterward in exhaustion.", classId: "barbarian", cooldownTurns: 3, icon: "violence" },

  // Bard
  { id: "inspiring-word", name: "Inspiring Word", blurb: "Lend an ally a die of heart when it matters most.", classId: "bard", cooldownTurns: 2, icon: "parley" },
  { id: "vicious-mockery", name: "Vicious Mockery", blurb: "Words shaped to land like a blow.", classId: "bard", cooldownTurns: 1, icon: "parley" },
  { id: "countercharm", name: "Countercharm", blurb: "A performance that unravels fear and charm alike.", classId: "bard", cooldownTurns: 3, icon: "camp" },

  // Cleric
  { id: "healing-word", name: "Healing Word", blurb: "A word spoken, and a wound closes.", classId: "cleric", cooldownTurns: 2, icon: "arcane" },
  { id: "guiding-bolt", name: "Guiding Bolt", blurb: "Radiant light that marks its target for what follows.", classId: "cleric", cooldownTurns: 1, icon: "arcane" },
  { id: "sanctuary", name: "Sanctuary", blurb: "For a moment, violence forgets you exist.", classId: "cleric", cooldownTurns: 3, icon: "camp" },

  // Druid
  { id: "wild-shape", name: "Wild Shape", blurb: "The body remembers older, sharper forms.", classId: "druid", cooldownTurns: 3, icon: "arcane" },
  { id: "entangle", name: "Entangle", blurb: "The ground itself takes a side.", classId: "druid", cooldownTurns: 1, icon: "arcane" },
  { id: "thorn-whip", name: "Thorn Whip", blurb: "A vine's length of reach, and a pull to go with it.", classId: "druid", cooldownTurns: 2, icon: "violence" },

  // Fighter
  { id: "second-wind", name: "Second Wind", blurb: "Sheer will, made temporarily physical.", classId: "fighter", cooldownTurns: 2, icon: "camp" },
  { id: "action-surge", name: "Action Surge", blurb: "One breath, twice the action.", classId: "fighter", cooldownTurns: 3, icon: "violence" },
  { id: "parry", name: "Parry", blurb: "Turn the blow rather than take it.", classId: "fighter", cooldownTurns: 1, icon: "violence" },

  // Monk
  { id: "flurry", name: "Flurry of Blows", blurb: "Two strikes in the space of one.", classId: "monk", cooldownTurns: 1, icon: "violence" },
  { id: "patient-defense", name: "Patient Defense", blurb: "Stillness that costs an attacker dearly.", classId: "monk", cooldownTurns: 2, icon: "camp" },
  { id: "stunning-strike", name: "Stunning Strike", blurb: "A single point, struck exactly right.", classId: "monk", cooldownTurns: 3, icon: "violence" },

  // Paladin
  { id: "lay-on-hands", name: "Lay on Hands", blurb: "A pool of healing, spent by the touch.", classId: "paladin", cooldownTurns: 2, icon: "arcane" },
  { id: "divine-smite", name: "Divine Smite", blurb: "A blow with something behind it.", classId: "paladin", cooldownTurns: 1, icon: "violence" },
  { id: "sacred-oath", name: "Sacred Oath", blurb: "A vow, invoked when it is needed most.", classId: "paladin", cooldownTurns: 3, icon: "camp" },

  // Ranger
  { id: "hunters-mark", name: "Hunter's Mark", blurb: "Once marked, a quarry is never truly hidden again.", classId: "ranger", cooldownTurns: 1, icon: "arcane" },
  { id: "volley", name: "Volley", blurb: "Every arrow finds a target within reach.", classId: "ranger", cooldownTurns: 3, icon: "violence" },
  { id: "disengage", name: "Fade Step", blurb: "Gone before the swing lands.", classId: "ranger", cooldownTurns: 2, icon: "travel" },

  // Rogue
  { id: "sneak-attack", name: "Sneak Attack", blurb: "The first blow is the one that counts.", classId: "rogue", cooldownTurns: 1, icon: "violence" },
  { id: "cunning-action", name: "Cunning Action", blurb: "Dash, disengage, or vanish — all in a heartbeat.", classId: "rogue", cooldownTurns: 2, icon: "travel" },
  { id: "uncanny-dodge", name: "Uncanny Dodge", blurb: "Half a blow is a great deal better than a whole one.", classId: "rogue", cooldownTurns: 3, icon: "camp" },

  // Sorcerer
  { id: "quickened-spell", name: "Quickened Spell", blurb: "A casting compressed into an instant.", classId: "sorcerer", cooldownTurns: 2, icon: "arcane" },
  { id: "chaos-bolt", name: "Chaos Bolt", blurb: "Power that arrives and then decides what it is.", classId: "sorcerer", cooldownTurns: 1, icon: "arcane" },
  { id: "wild-surge", name: "Wild Magic Surge", blurb: "The price of power inherited rather than studied.", classId: "sorcerer", cooldownTurns: 3, icon: "arcane" },

  // Warlock
  { id: "eldritch-blast", name: "Eldritch Blast", blurb: "A patron's favour, given brief and violent shape.", classId: "warlock", cooldownTurns: 1, icon: "arcane" },
  { id: "hex", name: "Hex", blurb: "A curse that lingers past the word that cast it.", classId: "warlock", cooldownTurns: 2, icon: "arcane" },
  { id: "dark-pact", name: "Dark Pact", blurb: "Ask for more, and owe more for it.", classId: "warlock", cooldownTurns: 3, icon: "arcane" },

  // Wizard
  { id: "shield", name: "Shield", blurb: "A wall of force, raised in the instant it is needed.", classId: "wizard", cooldownTurns: 1, icon: "arcane" },
  { id: "counterspell", name: "Counterspell", blurb: "Unmake another's casting before it lands.", classId: "wizard", cooldownTurns: 2, icon: "arcane" },
  { id: "arcane-recovery", name: "Arcane Recovery", blurb: "A short rest, and the well fills partway again.", classId: "wizard", cooldownTurns: 3, icon: "camp" },
];

export function powersForClass(classId: string): Power[] {
  return POWERS.filter((p) => p.classId === classId);
}

export function getPower(id: string): Power | undefined {
  return POWERS.find((p) => p.id === id);
}
