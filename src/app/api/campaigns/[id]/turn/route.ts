import { auth } from "@/auth";
import { loadCampaignContext, streamScene, commitTurn } from "@/lib/game/engine";
import { getPower } from "@/lib/game/powers";
import type { Choice } from "@/lib/game/types";
import { STATE_SENTINEL } from "@/lib/game/protocol";
import { z } from "zod";

/* Node runtime: this path reaches the database and the chronicle store. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/* Generous ceiling for Ollama on a CPU. Groq finishes in a couple of seconds;
   Vercel Hobby caps this at 60 regardless of what is requested. */
export const maxDuration = 300;

/**
 * Streams the next scene, then finishes the turn.
 *
 * The response body is prose followed by a sentinel and a JSON tail:
 *
 *     ...narrative text...
 *     \n<<<DELVER_STATE>>>\n
 *     {"choices":[...],"character":{...},"diceRoll":{...}}
 *
 * A custom framing rather than the AI SDK's UI-message protocol because the
 * turn's structured half is not produced until after the prose completes — it
 * comes from a second model call over that prose. One response carrying both
 * avoids a follow-up request that would race the extraction.
 *
 * The sentinel itself lives in lib/game/protocol.ts, shared with the client.
 */

const bodySchema = z.object({
  /* Absent on the opening turn, which the narrator starts unprompted. */
  action: z.string().trim().min(1).max(600).optional(),
  check: z
    .object({
      ability: z.enum(["str", "dex", "con", "int", "wis", "cha"]),
      dc: z.number().int().min(5).max(30),
      reason: z.string().max(160),
    })
    .optional(),
  /* Activating a class power instead of a free action. Mutually exclusive
     with action/check — validated against the character server-side below,
     since the client cannot be trusted to know its own cooldowns. */
  powerId: z.string().min(1).max(60).optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return Response.json({ error: "Malformed request." }, { status: 400 });
  }

  /* Ownership is enforced inside the load query, so a wrong user gets the same
     404 as a missing campaign. */
  const ctx = await loadCampaignContext(id, session.user.id);
  if (!ctx) {
    return Response.json({ error: "No such campaign." }, { status: 404 });
  }

  if (ctx.campaign.status !== "active") {
    return Response.json({ error: "That campaign is closed." }, { status: 409 });
  }

  let request: { action: string; check?: typeof parsed.data.check } | null;
  let activatePowerId: string | undefined;

  if (parsed.data.powerId) {
    const power = getPower(parsed.data.powerId);
    if (!power) {
      return Response.json({ error: "No such power." }, { status: 400 });
    }
    if (power.classId !== ctx.character.class) {
      return Response.json({ error: `${ctx.character.name} cannot use ${power.name}.` }, { status: 403 });
    }
    const cooldowns = (ctx.character.powerCooldowns ?? {}) as Record<string, number>;
    if ((cooldowns[power.id] ?? 0) > 0) {
      return Response.json({ error: `${power.name} is not ready yet.` }, { status: 409 });
    }

    request = { action: `${ctx.character.name} calls on ${power.name} — ${power.blurb}` };
    activatePowerId = power.id;
  } else {
    request = parsed.data.action ? { action: parsed.data.action, check: parsed.data.check } : null;
  }

  let scene: string;
  try {
    const { result, roll } = await streamScene(ctx, request);

    const encoder = new TextEncoder();
    scene = "";

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const delta of result.textStream) {
            scene += delta;
            controller.enqueue(encoder.encode(delta));
          }

          /* Prose is done and the player is already reading. Everything below
             — the extraction call, deltas, compaction, chronicle rebuild —
             happens while they read. */
          const committed = await commitTurn({
            ctx,
            playerAction: request?.action ?? null,
            scene,
            roll,
            activatePowerId,
          });

          const tail = {
            choices: committed.choices satisfies Choice[],
            diceRoll: committed.diceRoll,
            leveledUp: committed.leveledUp,
            sceneArtCaption: committed.sceneArtCaption,
            character: {
              hpCurrent: committed.character.hpCurrent,
              hpMax: committed.character.hpMax,
              xp: committed.character.xp,
              level: committed.character.level,
              inventory: committed.character.inventory,
              powerCooldowns: committed.character.powerCooldowns,
            },
          };

          controller.enqueue(encoder.encode(STATE_SENTINEL + JSON.stringify(tail)));
          controller.close();
        } catch (err) {
          console.error("[turn] stream failed:", err);
          /* The player may already have read a full scene. Close with an error
             tail rather than tearing the connection down, so the client can
             show what happened instead of a blank screen. */
          controller.enqueue(
            encoder.encode(
              STATE_SENTINEL +
                JSON.stringify({
                  error:
                    "The narrator lost the thread. Your progress up to this scene is saved.",
                }),
            ),
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store, no-transform",
        /* Stops nginx and similar proxies from buffering the whole body, which
           would defeat streaming entirely. */
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err) {
    console.error("[turn] failed before streaming:", err);
    return Response.json(
      { error: "The narrator could not be reached. Check the LLM provider settings." },
      { status: 502 },
    );
  }
}
