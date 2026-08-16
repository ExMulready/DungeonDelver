import type { InventoryItem, PowerCooldowns } from "@/lib/game/types";
import type { Power } from "@/lib/game/powers";

const NAV = [
  { key: "character", label: "Character", glyph: "☗" },
  { key: "journal", label: "Journal", glyph: "❝" },
  { key: "map", label: "Map", glyph: "✦" },
  { key: "options", label: "Options", glyph: "⚙" },
] as const;

const POWER_GLYPH: Record<Power["icon"], string> = {
  arcane: "✸",
  parley: "❝",
  camp: "☗",
  travel: "➦",
  violence: "⚔︎",
};

/** Bust + 10 slots (3 powers, 3 potions, torch, scroll, 2 empty) + nav row. */
export function Hotbar({
  inventory,
  powers,
  cooldowns,
  onUsePower,
  onDrinkPotion,
  busy,
}: {
  inventory: InventoryItem[];
  powers: Power[];
  cooldowns: PowerCooldowns;
  onUsePower: (powerId: string) => void;
  onDrinkPotion: (itemId: string) => void;
  busy: boolean;
}) {
  const potions = inventory.filter(
    (i) => i.kind?.startsWith("potion") || /potion/i.test(i.name),
  );

  return (
    <div className="frame-carved flex items-center gap-3 px-3 py-2">
      {/* Hotbar bust — image slot, defaults to an empty frame; no binary art in
          the repo, so nothing is loaded here yet. */}
      <div className="slot flex shrink-0 items-center justify-center" style={{ width: 118, height: 62 }}>
        <span className="label-engraved opacity-50">Bust</span>
      </div>

      <div className="flex flex-1 items-center gap-1.5">
        {[0, 1, 2].map((i) => {
          const power = powers[i];
          const cooldownTurns = power ? cooldowns[power.id] : undefined;
          return (
            <HotbarSlot
              key={`power-${i}`}
              hotkey={i + 1}
              label={power?.name}
              glyph={power ? POWER_GLYPH[power.icon] : undefined}
              upgradeable={i < 2}
              cooldownTurns={cooldownTurns}
              onClick={power ? () => onUsePower(power.id) : undefined}
              disabled={busy || !!cooldownTurns}
            />
          );
        })}
        {[0, 1, 2].map((i) => {
          const item = potions[i];
          return (
            <HotbarSlot
              key={`potion-${i}`}
              hotkey={4 + i}
              label={item ? item.name : undefined}
              count={item?.quantity}
              glyph={item ? "⚗" : undefined}
              onClick={item ? () => onDrinkPotion(item.id) : undefined}
              disabled={busy}
            />
          );
        })}
        <HotbarSlot hotkey={7} label="Torch" glyph="✧" />
        <HotbarSlot hotkey={8} label="Scroll" glyph="❝" />
        <HotbarSlot hotkey={9} />
        <HotbarSlot hotkey={0} />
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        {NAV.map((n) => (
          <button
            key={n.key}
            type="button"
            className="slot-hotbar flex flex-col items-center justify-center gap-1 py-2 transition-colors hover:border-[color:var(--color-gold-dim)]"
            style={{ width: 76 }}
          >
            <span aria-hidden style={{ fontSize: 19, color: "var(--color-gold)" }}>
              {n.glyph}
            </span>
            <span
              className="uppercase"
              style={{ fontFamily: "var(--font-display)", fontSize: 8.5, letterSpacing: "0.16em", color: "var(--color-gold-dim)" }}
            >
              {n.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function HotbarSlot({
  hotkey,
  label,
  glyph,
  count,
  upgradeable,
  cooldownTurns,
  onClick,
  disabled,
}: {
  hotkey: number;
  label?: string;
  glyph?: string;
  count?: number;
  upgradeable?: boolean;
  /** Turns remaining before this power is usable again. 0/undefined = ready. */
  cooldownTurns?: number;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const onCooldown = !!cooldownTurns && cooldownTurns > 0;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick || disabled}
      className="slot-hotbar relative flex items-center justify-center transition-colors enabled:hover:border-[color:var(--color-gold-dim)] disabled:cursor-default"
      style={{ width: 60, height: 60, cursor: onClick ? "pointer" : "default" }}
      title={label}
    >
      <span
        className="absolute top-0.5 left-1 tabular-nums"
        style={{ fontFamily: "var(--font-display)", fontSize: 10, color: "#7a6c52" }}
      >
        {hotkey}
      </span>

      {glyph && (
        <span aria-hidden className="text-gold" style={{ fontSize: 20, opacity: label ? 1 : 0.35 }}>
          {glyph}
        </span>
      )}
      {!glyph && !label && (
        <span aria-hidden className="text-bevel-lit" style={{ fontSize: 20 }}>
          ·
        </span>
      )}

      {typeof count === "number" && (
        <span
          className="absolute right-1 bottom-0.5 font-semibold tabular-nums"
          style={{ fontSize: 13, color: "#e6d6a8" }}
        >
          {count}
        </span>
      )}

      {upgradeable && (
        <span
          className="absolute left-1/2 flex items-center justify-center rounded-full"
          style={{
            bottom: -8,
            width: 14,
            height: 14,
            transform: "translateX(-50%)",
            background: "linear-gradient(180deg, #c7b377, #6b5a3c)",
            border: "1px solid #1a140f",
            fontSize: 9,
            color: "#1a140f",
            fontWeight: 700,
          }}
        >
          +
        </span>
      )}

      {onCooldown && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ background: "rgba(6,5,4,.74)" }}
        >
          <span style={{ fontFamily: "var(--font-display)", fontSize: 15, color: "#c7b377" }}>
            {cooldownTurns}
          </span>
        </div>
      )}
    </button>
  );
}
