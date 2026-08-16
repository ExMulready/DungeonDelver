/**
 * Wire format for the turn endpoint.
 *
 * The response is prose, then this sentinel, then a JSON tail. Shared here so
 * the route and the client cannot drift — a mismatch would silently render the
 * JSON as narration.
 */
export const STATE_SENTINEL = "\n<<<DELVER_STATE>>>\n";

export type TurnTail = {
  choices?: Array<{
    id: string;
    label: string;
    hint?: string;
    check?: { ability: string; dc: number; reason: string };
  }>;
  diceRoll?: {
    ability: string;
    dc: number;
    reason: string;
    d20: number;
    modifier: number;
    total: number;
    success: boolean;
    critical: "hit" | "miss" | null;
  } | null;
  leveledUp?: boolean;
  sceneArtCaption?: string | null;
  character?: {
    hpCurrent: number;
    hpMax: number;
    xp: number;
    level: number;
    inventory: Array<{
      id: string;
      name: string;
      rarity: string;
      description: string;
      quantity: number;
    }>;
    /** Turns remaining before each power is usable again; see powers.ts. */
    powerCooldowns: Record<string, number>;
  };
  error?: string;
};
