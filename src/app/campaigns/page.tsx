import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq, and } from "drizzle-orm";

import { auth, signOut } from "@/auth";
import { db } from "@/lib/db";
import { campaigns, characters } from "@/lib/db/schema";
import { Panel } from "@/components/ui/Panel";
import { Divider } from "@/components/ui/Divider";
import { OrnateButton } from "@/components/ui/OrnateButton";
import { Portrait } from "@/components/portrait/Portrait";
import { generatePortrait } from "@/lib/portraits/spec";
import { getRace, getClass, TONES } from "@/lib/game/srd";
import type { RaceId, GenderId } from "@/lib/game/srd";

export const metadata: Metadata = { title: "Campaigns" };
export const dynamic = "force-dynamic";

function relativeTime(date: Date): string {
  const mins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return date.toLocaleDateString();
}

export default async function CampaignsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  const rows = await db
    .select()
    .from(campaigns)
    .innerJoin(characters, eq(campaigns.characterId, characters.id))
    .where(and(eq(campaigns.userId, session.user.id), eq(campaigns.status, "active")))
    .orderBy(desc(campaigns.lastPlayedAt));

  return (
    <main className="mx-auto min-h-dvh max-w-4xl px-5 py-10">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black">Campaigns</h1>
          <p className="text-ash mt-1 text-sm italic">
            {session.user.name ? `Welcome back, ${session.user.name}.` : "Welcome back."}
          </p>
        </div>

        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
        >
          <OrnateButton type="submit" size="sm">Depart</OrnateButton>
        </form>
      </header>

      <Link href="/characters/new" className="mb-6 block">
        <Panel ornate className="hover:border-gold-dim group cursor-pointer text-center transition-colors">
          <p className="text-gold-bright group-hover:text-glow-gold text-xl">
            Begin a New Descent
          </p>
          <p className="text-ash mt-1 text-sm italic">
            Forge a character and let the chronicle write itself.
          </p>
        </Panel>
      </Link>

      {rows.length > 0 && (
        <>
          <Divider className="my-8" />
          <p className="label-engraved mb-4">Resume</p>

          <ul className="space-y-3">
            {rows.map(({ campaign, character }) => {
              const race = getRace(character.race);
              const cls = getClass(character.class);
              const tone = TONES.find((t) => t.id === campaign.tone);
              const hpPct = Math.round((character.hpCurrent / character.hpMax) * 100);

              return (
                <li key={campaign.id}>
                  <Link href={`/campaigns/${campaign.id}`}>
                    <Panel className="hover:border-gold-dim flex items-center gap-4 transition-colors">
                      <Portrait
                        spec={generatePortrait(
                          character.race as RaceId,
                          character.gender as GenderId,
                          character.portraitSeed,
                        )}
                        size={72}
                        className="shrink-0"
                      />

                      <div className="min-w-0 flex-1">
                        <p className="text-gold-bright truncate text-lg">{campaign.title}</p>
                        <p className="text-ash truncate text-sm italic">
                          {character.name} — level {character.level} {race.name} {cls.name}
                          {tone && ` · ${tone.name}`}
                        </p>
                        <p className="label-engraved mt-1.5">
                          {campaign.turnCount === 0
                            ? "Not yet begun"
                            : `${campaign.turnCount} turns · ${relativeTime(campaign.lastPlayedAt)}`}
                        </p>
                      </div>

                      <div className="shrink-0 text-right">
                        <p className="text-blood-bright text-sm tabular-nums">
                          {character.hpCurrent}/{character.hpMax}
                        </p>
                        <div className="bg-pitch border-bevel mt-1 h-1.5 w-16 overflow-hidden border">
                          <div
                            className="from-blood-deep to-blood-bright h-full bg-gradient-to-r"
                            style={{ width: `${hpPct}%` }}
                          />
                        </div>
                      </div>
                    </Panel>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </main>
  );
}
