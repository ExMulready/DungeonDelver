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
  };
  /** Set only on the turn that crossed a threshold, so the client can announce it. */
  leveledTo?: number | null;
  /** True once the character has fallen; the campaign is closed and takes no more turns. */
  died?: boolean;
  error?: string;
};
