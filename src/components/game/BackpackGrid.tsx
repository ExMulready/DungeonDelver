import { cn } from "@/lib/cn";
import { slotsForKind, type InventoryItem } from "@/lib/game/types";

const COLS = 6;
const ROWS = 3;
const CAPACITY = COLS * ROWS;

const RARITY_CLASS: Record<string, string> = {
  common: "rarity-common",
  magic: "rarity-magic",
  rare: "rarity-rare",
  unique: "rarity-unique",
  set: "rarity-set",
  crafted: "rarity-crafted",
};

/** 6x3 backpack. Equippable items (per item.kind) can be clicked to equip. */
export function BackpackGrid({
  items,
  onEquip,
}: {
  items: InventoryItem[];
  onEquip: (itemId: string) => void;
}) {
  const shown = items.slice(0, CAPACITY);

  return (
    <div
      className="grid gap-1"
      style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)`, gridAutoRows: 52 }}
    >
      {Array.from({ length: CAPACITY }, (_, i) => {
        const item = shown[i];
        const equippable = item ? slotsForKind(item.kind).length > 0 : false;

        return (
          <button
            key={item?.id ?? `empty-${i}`}
            type="button"
            onClick={equippable ? () => onEquip(item.id) : undefined}
            disabled={!equippable}
            className="slot relative flex items-center justify-center p-1 disabled:cursor-default enabled:cursor-pointer enabled:hover:border-[color:var(--color-gold-dim)]"
            title={
              item
                ? `${item.name}${item.description ? ` — ${item.description}` : ""}${equippable ? " (click to equip)" : ""}`
                : undefined
            }
          >
            {item && (
              <>
                <span
                  className={cn(
                    "line-clamp-2 text-center text-[9px] leading-tight",
                    RARITY_CLASS[item.rarity] ?? "rarity-common",
                  )}
                >
                  {item.name}
                </span>
                {item.quantity > 1 && (
                  <span className="absolute right-0.5 bottom-0.5 text-[10px] font-semibold text-[#e6d6a8] tabular-nums">
                    {item.quantity}
                  </span>
                )}
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}
