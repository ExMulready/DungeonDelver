"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { campaigns, campaignMemory, characters } from "@/lib/db/schema";
import { createCharacterSchema } from "./schemas";
import {
  applyRacialBonuses,
  deriveMaxHp,
  deriveAc,
  getRace,
  getClass,
} from "./srd";
import { rollMany } from "./dice";
import { loadCampaignContext } from "./engine";
import {
  EMPTY_WORLD_FACTS, EMPTY_EQUIPMENT, slotsForKind,
  type InventoryItem, type Equipment, type EquipmentSlot,
} from "./types";

export type ActionState = { error?: string };

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");
  return session.user.id;
}

/**
 * Creates a character and the campaign it belongs to, in one step.
 *
 * The two are made together deliberately: a character with no campaign is not
 * a thing the player can do anything with, and separating them produces orphan
 * rows every time someone abandons the flow halfway.
 */
export async function createCharacterAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await requireUserId();

  const raw = formData.get("payload");
  if (typeof raw !== "string") return { error: "Malformed submission." };

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return { error: "Malformed submission." };
  }

  const parsed = createCharacterSchema.safeParse(payload);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Those choices are not valid." };
  }

  const input = parsed.data;

  /* Racial bonuses are applied server-side rather than trusted from the client,
     which is also what keeps the point-buy check meaningful. */
  const stats = applyRacialBonuses(input.stats, input.race);
  const hpMax = deriveMaxHp(input.class, stats.con);
  const ac = deriveAc(stats.dex);

  const [character] = await db
    .insert(characters)
    .values({
      userId,
      name: input.name,
      race: input.race,
      class: input.class,
      gender: input.gender,
      background: input.background,
      stats,
      hpCurrent: hpMax,
      hpMax,
      ac,
      portraitSeed: input.portraitSeed,
      inventory: [],
    })
    .returning();

  const race = getRace(input.race);
  const cls = getClass(input.class);

  const [campaign] = await db
    .insert(campaigns)
    .values({
      userId,
      characterId: character.id,
      /* Placeholder. The narrator proposes a real title on the opening turn
         and commitTurn adopts it. */
      title: `${input.name} the ${race.name} ${cls.name}`,
      tone: input.tone,
      status: "active",
      turnCount: 0,
    })
    .returning();

  await db.insert(campaignMemory).values({
    campaignId: campaign.id,
    markdown: "",
    actSummary: "",
    worldFacts: EMPTY_WORLD_FACTS,
  });

  revalidatePath("/campaigns");
  redirect(`/campaigns/${campaign.id}`);
}

/** Marks a campaign abandoned. Rows are kept so the chronicle stays readable. */
export async function abandonCampaignAction(campaignId: string) {
  const userId = await requireUserId();

  await db
    .update(campaigns)
    .set({ status: "abandoned" })
    .where(and(eq(campaigns.id, campaignId), eq(campaigns.userId, userId)));

  revalidatePath("/campaigns");
  redirect("/campaigns");
}

export type UseItemResult = {
  error?: string;
  hpCurrent?: number;
  hpMax?: number;
  inventory?: InventoryItem[];
};

/** 2d4+2 — the fixed healing roll for any "potion:heal" item. */
function rollHealing(): number {
  return rollMany(2, 4).reduce((a, b) => a + b, 0) + 2;
}

/**
 * Consumes one inventory item and applies its effect.
 *
 * Only "potion:heal" does anything mechanical right now — everything else is
 * flavour, consumed with a chronicle note but no numeric effect. The note is
 * folded into `actSummary` (the chronicle's "Prior Acts" prose) rather than
 * appended to the stored markdown directly: the markdown is regenerated whole
 * from structured state on every turn (see renderChronicle in
 * src/lib/chronicle/format.ts), so a raw append there would be silently
 * discarded the next time a turn commits. actSummary is durable DB state the
 * next chronicle rebuild reads back in, which is what lets the narrator know a
 * potion was drunk even though this happens outside the normal turn flow.
 */
export async function useItem(campaignId: string, itemId: string): Promise<UseItemResult> {
  const userId = await requireUserId();

  const ctx = await loadCampaignContext(campaignId, userId);
  if (!ctx) return { error: "No such campaign." };

  const character = ctx.character;
  const item = (character.inventory ?? []).find((i) => i.id === itemId);
  if (!item) return { error: "That item is not in your pack." };

  let hpCurrent = character.hpCurrent;
  let note = `${character.name} uses ${item.name}.`;

  if (item.kind === "potion:heal") {
    const healed = rollHealing();
    hpCurrent = Math.min(character.hpMax, character.hpCurrent + healed);
    note = `${character.name} drinks ${item.name}, recovering ${healed} hit points (now ${hpCurrent}/${character.hpMax}).`;
  }

  const inventory = (character.inventory ?? [])
    .map((i) => (i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i))
    .filter((i) => i.quantity > 0);

  await db
    .update(characters)
    .set({ hpCurrent, inventory })
    .where(eq(characters.id, character.id));

  const existingSummary = ctx.memory.actSummary ?? "";
  await db
    .update(campaignMemory)
    .set({ actSummary: `${existingSummary}\n\n${note}`.trim(), updatedAt: new Date() })
    .where(eq(campaignMemory.campaignId, campaignId));

  revalidatePath(`/campaigns/${campaignId}`);

  return { hpCurrent, hpMax: character.hpMax, inventory };
}

export type EquipResult = {
  error?: string;
  ac?: number;
  equipment?: Equipment;
  inventory?: InventoryItem[];
};

/** Adds an item back into the backpack, stacking onto a matching entry. */
function returnToInventory(inventory: InventoryItem[], item: InventoryItem): InventoryItem[] {
  const existing = inventory.find(
    (i) => i.name.toLowerCase() === item.name.toLowerCase() && i.rarity === item.rarity,
  );
  if (existing) {
    return inventory.map((i) => (i === existing ? { ...i, quantity: i.quantity + 1 } : i));
  }
  return [...inventory, { ...item, quantity: 1 }];
}

/**
 * Equips an inventory item to the first open (or, failing that, first) slot
 * its kind allows. Slot compatibility is server-validated from item.kind —
 * see EQUIPPABLE_KIND_SLOTS in src/lib/game/types.ts — never trusted from the
 * client, which only ever gets to name an item, not a slot.
 */
export async function equipItem(campaignId: string, itemId: string): Promise<EquipResult> {
  const userId = await requireUserId();
  const ctx = await loadCampaignContext(campaignId, userId);
  if (!ctx) return { error: "No such campaign." };

  const character = ctx.character;
  const item = (character.inventory ?? []).find((i) => i.id === itemId);
  if (!item) return { error: "That item is not in your pack." };

  const candidateSlots = slotsForKind(item.kind);
  if (candidateSlots.length === 0) return { error: `${item.name} cannot be equipped.` };

  const equipment = { ...EMPTY_EQUIPMENT, ...(character.equipment ?? {}) } as Equipment;
  const slot = candidateSlots.find((s) => !equipment[s]) ?? candidateSlots[0];
  const displaced = equipment[slot];

  equipment[slot] = { ...item, quantity: 1 };

  let inventory = (character.inventory ?? [])
    .map((i) => (i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i))
    .filter((i) => i.quantity > 0);
  if (displaced) inventory = returnToInventory(inventory, displaced);

  const ac = deriveAc(character.stats.dex, equipment);

  await db
    .update(characters)
    .set({ equipment, inventory, ac })
    .where(eq(characters.id, character.id));

  revalidatePath(`/campaigns/${campaignId}`);
  return { ac, equipment, inventory };
}

/** Unequips whatever is in a slot back into the backpack. */
export async function unequipItem(campaignId: string, slot: EquipmentSlot): Promise<EquipResult> {
  const userId = await requireUserId();
  const ctx = await loadCampaignContext(campaignId, userId);
  if (!ctx) return { error: "No such campaign." };

  const character = ctx.character;
  const equipment = { ...EMPTY_EQUIPMENT, ...(character.equipment ?? {}) } as Equipment;
  const item = equipment[slot];
  if (!item) return { error: "Nothing is equipped there." };

  equipment[slot] = null;
  const inventory = returnToInventory(character.inventory ?? [], item);
  const ac = deriveAc(character.stats.dex, equipment);

  await db
    .update(characters)
    .set({ equipment, inventory, ac })
    .where(eq(characters.id, character.id));

  revalidatePath(`/campaigns/${campaignId}`);
  return { ac, equipment, inventory };
}
