import { ABILITIES, ABILITY_NAMES, abilityModifier, formatModifier } from "@/lib/game/srd";
import type { AbilityScores, Ability } from "@/lib/game/types";

const GLYPH: Record<Ability, string> = {
  str: "⚔︎",
  dex: "✺",
  con: "❤︎",
  int: "✦",
  wis: "☽",
  cha: "✵",
};

const INSPIRATION_MAX = 2;
/** Not backed by any field yet — every character starts uninspired. */
const INSPIRATION = 0;

/** glyph · abbr · score · (mod), plus decorative Inspiration diamonds. */
export function AttributesPanel({ stats }: { stats: AbilityScores }) {
  return (
    <div className="frame-carved p-3">
      <p className="label-engraved mb-2">Attributes</p>

      <div className="space-y-1">
        {ABILITIES.map((a) => {
          const mod = abilityModifier(stats[a]);
          return (
            <div key={a} className="slot flex items-center justify-between px-2 py-1.5">
              <span className="flex items-center gap-2">
                <span aria-hidden className="text-gold-dim">{GLYPH[a]}</span>
                <span className="label-engraved">{ABILITY_NAMES[a].slice(0, 3).toUpperCase()}</span>
              </span>
              <span className="tabular-nums text-[#dcc79c]">
                {stats[a]} <span className="text-gold-dim text-xs">({formatModifier(mod)})</span>
              </span>
            </div>
          );
        })}
      </div>

      <div className="divider-ornate my-3" />

      <p className="label-engraved mb-2">Inspiration</p>
      <div className="flex items-center gap-2">
        {Array.from({ length: INSPIRATION_MAX }, (_, i) => (
          <span
            key={i}
            aria-hidden
            className="inline-block"
            style={{
              width: 12,
              height: 12,
              transform: "rotate(45deg)",
              background: i < INSPIRATION ? "var(--color-gold)" : "transparent",
              border: "1px solid var(--color-gold-dim)",
              boxShadow: i < INSPIRATION ? "0 0 8px rgba(199,179,119,.5)" : undefined,
            }}
          />
        ))}
      </div>
    </div>
  );
}
