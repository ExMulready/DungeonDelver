"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import type { Equipment, EquipmentSlot, InventoryItem } from "@/lib/game/types";
import { EquipmentGrid } from "./EquipmentGrid";
import { BackpackGrid } from "./BackpackGrid";

const TABS = ["Equipment", "Backpack", "Consumables", "Quest Items", "Crafting"] as const;
type Tab = (typeof TABS)[number];

/** 5-tab inventory: equipped paperdoll, backpack grid, gold/item footer. */
export function InventoryPanel({
  inventory,
  equipment,
  onEquip,
  onUnequip,
}: {
  inventory: InventoryItem[];
  equipment: Equipment;
  onEquip: (itemId: string) => void;
  onUnequip: (slot: EquipmentSlot) => void;
}) {
  const [tab, setTab] = useState<Tab>("Equipment");

  return (
    <div className="frame-carved flex flex-col p-3">
      <div className="mb-3 grid grid-cols-5 gap-1">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            aria-current={tab === t}
            className={cn(
              "slot px-1 py-1.5 text-center text-[9px] uppercase transition-colors",
              tab === t ? "text-gold-bright border-gold-dim!" : "text-ash",
            )}
            style={{ fontFamily: "var(--font-display)", letterSpacing: "0.06em" }}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Equipment" && <EquipmentGrid equipment={equipment} onUnequip={onUnequip} />}
      {tab === "Backpack" && <BackpackGrid items={inventory} onEquip={onEquip} />}
      {(tab === "Consumables" || tab === "Quest Items" || tab === "Crafting") && (
        <p className="text-ash py-8 text-center text-xs italic">Nothing here yet.</p>
      )}

      <div className="divider-ornate my-3" />

      <div className="label-engraved flex items-center justify-between">
        <span>Gold 0</span>
        <span className="tabular-nums">
          {inventory.length} / {6 * 3} items
        </span>
      </div>
    </div>
  );
}
