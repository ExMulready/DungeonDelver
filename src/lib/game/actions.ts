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
import { EMPTY_WORLD_FACTS } from "./types";

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
