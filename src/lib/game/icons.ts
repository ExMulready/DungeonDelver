import type { ChoiceIcon } from "./types";

/**
 * Glyph and tint for each choice icon, used by the plaque tile in ChoiceList.
 *
 * The narrator does not yet tag choices with an icon (that requires a prompt
 * and extraction-schema change — see HANDOFF-hud-v2.md §4.1), so every choice
 * without one falls back to "travel". The UI must never render an empty tile.
 *
 * U+FE0E (variation selector-15) forces text presentation on glyphs that would
 * otherwise render as a colour emoji, which reads wrong against the metal tile.
 */
export const CHOICE_ICONS: Record<ChoiceIcon, { glyph: string; tint: string }> = {
  arcane: { glyph: "✸", tint: "#b06ad8" },
  parley: { glyph: "❝", tint: "#c7b377" },
  camp: { glyph: "☗", tint: "#e08a3a" },
  travel: { glyph: "➦", tint: "#9b8c6c" },
  violence: { glyph: "⚔︎", tint: "#ff5a4a" },
};

export function resolveChoiceIcon(icon: ChoiceIcon | undefined) {
  return CHOICE_ICONS[icon ?? "travel"];
}
