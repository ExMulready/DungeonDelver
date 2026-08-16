import { Portrait } from "@/components/portrait/Portrait";
import { generatePortrait } from "@/lib/portraits/spec";
import {
  getRace, getClass, ABILITIES, ABILITY_NAMES, abilityModifier, formatModifier,
  type RaceId, type GenderId,
} from "@/lib/game/srd";
import type { AbilityScores } from "@/lib/game/types";

export type CharacterBlockData = {
  name: string;
  race: string;
  gender: string;
  class: string;
  level: number;
  xp: number;
  hpCurrent: number;
  hpMax: number;
  ac: number;
  portraitSeed: number;
  stats: AbilityScores;
};

const XP_PER_LEVEL = 1000;

/** Portrait ring + level shield, name/class, HP & XP bars, STR-CHA table. */
export function CharacterBlock({ character }: { character: CharacterBlockData }) {
  const race = getRace(character.race);
  const cls = getClass(character.class);

  const hpPct = Math.max(0, Math.min(100, (character.hpCurrent / Math.max(1, character.hpMax)) * 100));
  const hpCritical = hpPct <= 25 && character.hpCurrent > 0;
  const dead = character.hpCurrent <= 0;

  const xpPct = Math.max(0, Math.min(100, ((character.xp % XP_PER_LEVEL) / XP_PER_LEVEL) * 100));

  return (
    <div className="frame-carved p-4 pt-6">
      <div className="relative mx-auto" style={{ width: 124, height: 124 }}>
        <div
          className="h-full w-full rounded-full"
          style={{
            padding: 5,
            background: "conic-gradient(from 220deg, #5c4a30, #241c14 40%, #6b5a3c 60%, #1a140f)",
          }}
        >
          <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-[#0b0805]">
            <Portrait
              spec={generatePortrait(
                character.race as RaceId,
                character.gender as GenderId,
                character.portraitSeed,
              )}
              size={132}
              framed={false}
              className="shrink-0"
            />
          </div>
        </div>

        <div
          aria-hidden
          className="absolute left-1/2 flex items-center justify-center"
          style={{
            bottom: -14,
            width: 34,
            height: 38,
            transform: "translateX(-50%)",
            clipPath: "polygon(0 0, 100% 0, 100% 62%, 50% 100%, 0 62%)",
            background: "linear-gradient(180deg, #c7b377, #6b5a3c 60%, #241c14)",
            border: "1px solid #1a140f",
          }}
        >
          <span
            className="tabular-nums"
            style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700, color: "#1a140f" }}
          >
            {character.level}
          </span>
        </div>
      </div>

      <div className="mt-6 min-w-0 text-center">
        <p className="text-gold-bright truncate text-lg">{character.name}</p>
        <p className="text-ash text-xs italic">
          Level {character.level} {race.name} {cls.name} · AC {character.ac}
        </p>
      </div>

      <div className="mt-3 space-y-2">
        <Bar
          label="HP"
          value={`${character.hpCurrent} / ${character.hpMax}`}
          pct={hpPct}
          height={11}
          gradient="linear-gradient(180deg, #e05a5a, #a41e1e 45%, #5c0d0d)"
          pulse={hpCritical}
          dead={dead}
        />
        <Bar
          label="XP"
          value={character.xp.toLocaleString()}
          pct={xpPct}
          height={7}
          gradient="linear-gradient(180deg, #c7b377, #7a6a42)"
        />
      </div>

      <div className="divider-ornate my-3" />

      <div className="grid grid-cols-3 gap-1.5">
        {ABILITIES.map((a) => (
          <div key={a} className="slot px-1.5 py-1 text-center">
            <div className="label-engraved">{ABILITY_NAMES[a].slice(0, 3).toUpperCase()}</div>
            <div className="tabular-nums text-sm text-[#dcc79c]">
              {character.stats[a]}{" "}
              <span className="text-gold-dim text-xs">{formatModifier(abilityModifier(character.stats[a]))}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Bar({
  label, value, pct, height, gradient, pulse, dead,
}: {
  label: string;
  value: string;
  pct: number;
  height: number;
  gradient: string;
  pulse?: boolean;
  dead?: boolean;
}) {
  return (
    <div>
      <div className="label-engraved mb-0.5 flex items-center justify-between">
        <span>{label}</span>
        <span className="tabular-nums text-[#8a7a4e]">{dead ? "Fallen" : value}</span>
      </div>
      <div className="slot overflow-hidden" style={{ height }}>
        <div
          className={pulse ? "animate-pulse-slow" : undefined}
          style={{
            width: `${pct}%`,
            height: "100%",
            background: gradient,
            transition: "width 520ms cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        />
      </div>
    </div>
  );
}
