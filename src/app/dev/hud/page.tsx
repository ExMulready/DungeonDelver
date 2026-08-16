"use client";

import { useState } from "react";
import { PlayShell } from "@/components/game/PlayShell";
import { TitleBar } from "@/components/game/TitleBar";
import { CharacterBlock } from "@/components/game/CharacterBlock";
import { InventoryPanel } from "@/components/game/InventoryPanel";
import { StoryPage } from "@/components/game/StoryPage";
import { SpellsPanel } from "@/components/game/SpellsPanel";
import { AttributesPanel } from "@/components/game/AttributesPanel";
import { Hotbar } from "@/components/game/Hotbar";
import { DiceOverlay } from "@/components/game/DiceOverlay";
import { powersForClass } from "@/lib/game/powers";
import { EMPTY_EQUIPMENT, type Choice, type DiceRoll, type InventoryItem } from "@/lib/game/types";

/**
 * Development-only harness for the HUD v2 shell.
 *
 * Renders the real presentational components with fixed mock data, bypassing
 * PlayScreen's network-bound takeTurn logic entirely — the same reason
 * /dev/portraits exists for the portrait generator. Not linked from anywhere
 * in the app; visit /dev/hud directly.
 */

const MOCK_INVENTORY: InventoryItem[] = [
  { id: "1", name: "Potion of Healing", rarity: "common", description: "Restores 2d4+2 HP.", quantity: 3, kind: "potion:heal" },
  { id: "2", name: "Rusted Longsword", rarity: "common", description: "Has seen better decades.", quantity: 1, kind: "weapon" },
  { id: "3", name: "Ring of Warmth", rarity: "magic", description: "Never cold again.", quantity: 1 },
  { id: "4", name: "Ashen Coin", rarity: "unique", description: "Cold to the touch.", quantity: 1 },
  { id: "5", name: "Torn Map Fragment", rarity: "rare", description: "Marks something in the east.", quantity: 1 },
];

const MOCK_CHOICES: Choice[] = [
  { id: "c1", label: "Force the iron door", icon: "violence", check: { ability: "str", dc: 14, reason: "The hinges are rusted through." } },
  { id: "c2", label: "Reason with the sentry", icon: "parley", hint: "He looks bored, not loyal." },
  { id: "c3", label: "Search for another way around", icon: "travel" },
  { id: "c4", label: "Read the arcane sigil above the frame", icon: "arcane", check: { ability: "int", dc: 12, reason: "The script predates the Concord." } },
];

const MOCK_ROLL: DiceRoll = {
  ability: "str",
  dc: 14,
  reason: "The hinges are rusted through.",
  d20: 17,
  modifier: 3,
  total: 20,
  success: true,
  critical: null,
};

export default function HudDevPage() {
  const [rollInFlight, setRollInFlight] = useState(false);
  const [roll, setRoll] = useState<DiceRoll | null>(null);
  const [inventory, setInventory] = useState(MOCK_INVENTORY);
  const [equipment, setEquipment] = useState(EMPTY_EQUIPMENT);

  function equip(itemId: string) {
    const item = inventory.find((i) => i.id === itemId);
    if (!item || item.kind !== "weapon") return;
    setEquipment((e) => ({ ...e, weapon: { ...item, quantity: 1 } }));
    setInventory((inv) =>
      inv.map((i) => (i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i)).filter((i) => i.quantity > 0),
    );
  }

  function unequip(slot: keyof typeof EMPTY_EQUIPMENT) {
    const item = equipment[slot];
    if (!item) return;
    setEquipment((e) => ({ ...e, [slot]: null }));
    setInventory((inv) => [...inv, item]);
  }

  function simulateRoll(result: DiceRoll) {
    setRoll(null);
    setRollInFlight(true);
    setTimeout(() => setRoll(result), 900);
  }

  return (
    <div className="min-h-dvh">
      <div className="fixed top-2 right-2 z-50 flex gap-2">
        <button
          className="btn-ornate px-3 py-1.5 text-xs"
          onClick={() => simulateRoll(MOCK_ROLL)}
        >
          Roll (success)
        </button>
        <button
          className="btn-ornate btn-blood px-3 py-1.5 text-xs"
          onClick={() => simulateRoll({ ...MOCK_ROLL, d20: 2, total: 5, success: false, critical: null })}
        >
          Roll (fail)
        </button>
        <button
          className="btn-ornate px-3 py-1.5 text-xs"
          onClick={() => simulateRoll({ ...MOCK_ROLL, d20: 20, total: 23, success: true, critical: "hit" })}
        >
          Roll (nat 20)
        </button>
      </div>

      <PlayShell
        titleBar={<TitleBar title="The Ashen Concord" turns={12} />}
        left={
          <>
            <CharacterBlock
              character={{
                name: "Kaelith Dawnbringer",
                race: "elf",
                gender: "female",
                class: "ranger",
                level: 3,
                xp: 640,
                hpCurrent: 9,
                hpMax: 28,
                ac: 15,
                portraitSeed: 1337,
                stats: { str: 12, dex: 17, con: 13, int: 10, wis: 14, cha: 8 },
              }}
            />
            <InventoryPanel
              inventory={inventory}
              equipment={equipment}
              onEquip={equip}
              onUnequip={unequip}
            />
          </>
        }
        centre={
          <StoryPage
            title="The Ashen Concord"
            scene={
              "The door groans under its own rust, but does not give. Torchlight gutters along the passage behind you, and somewhere past the iron there is the unmistakable drag of something heavy being moved.\n\nA sentry watches from the far alcove, spear loose in one hand, more curious than alarmed."
            }
            sceneArtCaption="A rust-locked iron door, torchlight guttering behind"
            playerAction="I press my shoulder to the door and shove."
            playerName="Kaelith"
            streaming=""
            busy={false}
            dead={false}
            error={null}
            choices={MOCK_CHOICES}
            onChoose={() => {}}
            onFreeText={() => {}}
          />
        }
        right={
          <>
            <SpellsPanel classId="ranger" />
            <AttributesPanel stats={{ str: 12, dex: 17, con: 13, int: 10, wis: 14, cha: 8 }} />
          </>
        }
        hotbar={
          <Hotbar
            inventory={inventory}
            powers={powersForClass("ranger")}
            cooldowns={{ "hunters-mark": 2 }}
            onUsePower={(id) => simulateRoll({ ...MOCK_ROLL, reason: id })}
            onDrinkPotion={() => {}}
            busy={false}
          />
        }
        overlay={rollInFlight && <DiceOverlay roll={roll} onDone={() => setRollInFlight(false)} />}
      />
    </div>
  );
}
