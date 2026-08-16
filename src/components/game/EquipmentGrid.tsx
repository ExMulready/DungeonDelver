import { cn } from "@/lib/cn";
import type { Equipment, EquipmentSlot } from "@/lib/game/types";

type SlotDef = {
  key: EquipmentSlot;
  label: string;
  col: number;
  row: number;
  rowSpan?: number;
};

const SLOTS: SlotDef[] = [
  { key: "weapon", label: "Weapon", col: 1, row: 1, rowSpan: 3 },
  { key: "offhand", label: "Off Hand", col: 1, row: 4 },
  { key: "head", label: "Head", col: 2, row: 1 },
  { key: "chest", label: "Chest", col: 2, row: 2, rowSpan: 2 },
  { key: "belt", label: "Belt", col: 2, row: 4 },
  { key: "shoulders", label: "Shoulders", col: 3, row: 1 },
  { key: "cloak", label: "Cloak", col: 3, row: 2 },
  { key: "hands", label: "Hands", col: 3, row: 3 },
  { key: "boots", label: "Boots", col: 3, row: 4 },
  { key: "amulet", label: "Amulet", col: 4, row: 1 },
  { key: "ring1", label: "Ring", col: 4, row: 2 },
  { key: "ring2", label: "Ring", col: 4, row: 3 },
];

const RARITY_CLASS: Record<string, string> = {
  common: "rarity-common",
  magic: "rarity-magic",
  rare: "rarity-rare",
  unique: "rarity-unique",
  set: "rarity-set",
  crafted: "rarity-crafted",
};

/** 4-column equipped-items paperdoll. Click a filled slot to unequip. */
export function EquipmentGrid({
  equipment,
  onUnequip,
}: {
  equipment: Equipment;
  onUnequip: (slot: EquipmentSlot) => void;
}) {
  return (
    <div
      className="grid gap-1"
      style={{ gridTemplateColumns: "repeat(4, 1fr)", gridAutoRows: 56 }}
    >
      {SLOTS.map((s) => {
        const item = equipment[s.key];
        return (
          <button
            key={s.key}
            type="button"
            onClick={item ? () => onUnequip(s.key) : undefined}
            disabled={!item}
            title={item ? `${item.name} — click to unequip` : s.label}
            className="slot flex items-center justify-center p-1 disabled:cursor-default enabled:cursor-pointer enabled:hover:border-[color:var(--color-gold-dim)]"
            style={{ gridColumn: s.col, gridRow: `${s.row} / span ${s.rowSpan ?? 1}` }}
          >
            {item ? (
              <span
                className={cn(
                  "line-clamp-3 text-center text-[9px] leading-tight",
                  RARITY_CLASS[item.rarity] ?? "rarity-common",
                )}
              >
                {item.name}
              </span>
            ) : (
              <span className="label-engraved text-center text-[9px] leading-tight opacity-70">
                {s.label}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
