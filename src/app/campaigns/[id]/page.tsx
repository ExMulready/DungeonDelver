import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { campaignTurns } from "@/lib/db/schema";
import { loadCampaignContext } from "@/lib/game/engine";
import { PlayScreen } from "./PlayScreen";
import { EMPTY_EQUIPMENT, type Choice } from "@/lib/game/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const session = await auth();
  if (!session?.user?.id) return { title: "Campaign" };
  const { id } = await params;
  const ctx = await loadCampaignContext(id, session.user.id);
  return { title: ctx?.campaign.title ?? "Campaign" };
}

export default async function CampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  const { id } = await params;
  const ctx = await loadCampaignContext(id, session.user.id);
  if (!ctx) notFound();

  /* Full transcript in order. Campaigns are single-player and turn-based, so
     this stays small enough to send whole rather than paginating. */
  const allTurns = await db
    .select()
    .from(campaignTurns)
    .where(eq(campaignTurns.campaignId, id))
    .orderBy(asc(campaignTurns.turnNumber));

  const lastNarratorTurn = [...allTurns].reverse().find((t) => t.role === "narrator");

  return (
    <PlayScreen
      campaignId={id}
      title={ctx.campaign.title}
      character={{
        name: ctx.character.name,
        race: ctx.character.race,
        gender: ctx.character.gender,
        class: ctx.character.class,
        level: ctx.character.level,
        xp: ctx.character.xp,
        hpCurrent: ctx.character.hpCurrent,
        hpMax: ctx.character.hpMax,
        ac: ctx.character.ac,
        portraitSeed: ctx.character.portraitSeed,
        stats: ctx.character.stats,
        inventory: ctx.character.inventory ?? [],
        powerCooldowns: ctx.character.powerCooldowns ?? {},
        equipment: ctx.character.equipment ?? EMPTY_EQUIPMENT,
      }}
      initialTurns={allTurns.map((t) => ({
        turnNumber: t.turnNumber,
        role: t.role,
        content: t.content,
        diceRoll: t.diceRoll ?? null,
        sceneArtCaption: t.sceneArtCaption ?? null,
      }))}
      initialChoices={(lastNarratorTurn?.choices ?? []) as Choice[]}
    />
  );
}
