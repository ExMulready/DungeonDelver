"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";

import { Portrait } from "@/components/portrait/Portrait";
import { generatePortrait } from "@/lib/portraits/spec";
import { Orb } from "@/components/ui/Orb";
import { Panel } from "@/components/ui/Panel";
import { Divider } from "@/components/ui/Divider";
import { OrnateButton } from "@/components/ui/OrnateButton";
import { STATE_SENTINEL, type TurnTail } from "@/lib/game/protocol";
import { abandonCampaignAction } from "@/lib/game/actions";
import {
  getRace, getClass, ABILITY_NAMES, abilityModifier, formatModifier, ABILITIES,
  deriveMaxMana, type RaceId, type GenderId, type ClassId,
} from "@/lib/game/srd";
import type { AbilityScores, Choice, DiceRoll, InventoryItem } from "@/lib/game/types";
import { cn } from "@/lib/cn";

type CharacterView = {
  name: string;
  race: string;
  gender: string;
  class: string;
  level: number;
  xp: number;
  hpCurrent: number;
  hpMax: number;
  ac: number;
  portraitSeed: number;
  stats: AbilityScores;
  inventory: InventoryItem[];
};

type TurnView = {
  turnNumber: number;
  role: string;
  content: string;
  diceRoll: DiceRoll | null;
};

const RARITY_CLASS: Record<string, string> = {
  common: "rarity-common",
  magic: "rarity-magic",
  rare: "rarity-rare",
  unique: "rarity-unique",
  set: "rarity-set",
  crafted: "rarity-crafted",
};

export function PlayScreen({
  campaignId,
  title,
  character: initialCharacter,
  initialTurns,
  initialChoices,
}: {
  campaignId: string;
  title: string;
  character: CharacterView;
  initialTurns: TurnView[];
  initialChoices: Choice[];
}) {
  const [character, setCharacter] = useState(initialCharacter);
  const [turns, setTurns] = useState<TurnView[]>(initialTurns);
  const [choices, setChoices] = useState<Choice[]>(initialChoices);
  const [streaming, setStreaming] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRoll, setLastRoll] = useState<DiceRoll | null>(null);
  const [freeText, setFreeText] = useState("");
  const [leveledTo, setLeveledTo] = useState<number | null>(null);
  const [fallen, setFallen] = useState(initialCharacter.hpCurrent <= 0);

  const scrollRef = useRef<HTMLDivElement>(null);
  /* Guards the auto-start effect. React 18+ runs effects twice in development,
     which without this fires two opening scenes for every new campaign. */
  const started = useRef(false);
  /* Guards against a second turn being sent before `busy` has re-rendered —
     a fast double-click otherwise dispatches two requests, and the server then
     has to reject one as a conflict after both have already cost a model call. */
  const inFlight = useRef(false);

  const race = getRace(character.race);
  const cls = getClass(character.class);
  const maxMana = deriveMaxMana(character.class as ClassId, character.stats);

  /* Follow the text as it streams, but only while it is streaming — hijacking
     scroll while the player is reading back an earlier scene is maddening. */
  useEffect(() => {
    if (!busy) return;
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [streaming, busy]);

  const takeTurn = useCallback(
    async (action: string | null, check?: Choice["check"]) => {
      if (inFlight.current) return;
      inFlight.current = true;

      setBusy(true);
      setError(null);
      setStreaming("");
      setChoices([]);
      setLastRoll(null);
      setLeveledTo(null);

      /* Show the player's own line immediately rather than waiting for the
         round trip — the model may take 30 seconds on a local CPU. */
      if (action) {
        setTurns((prev) => [
          ...prev,
          { turnNumber: -1, role: "player", content: action, diceRoll: null },
        ]);
      }

      try {
        const res = await fetch(`/api/campaigns/${campaignId}/turn`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(action ? { action, check } : {}),
        });

        if (!res.ok || !res.body) {
          const msg = await res.json().catch(() => null);
          throw new Error(msg?.error ?? "The narrator did not answer.");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          /* The sentinel can straddle two chunks, so search the whole buffer
             each pass rather than the newly arrived slice. */
          const idx = buffer.indexOf(STATE_SENTINEL);
          setStreaming(idx === -1 ? buffer : buffer.slice(0, idx));
        }

        const idx = buffer.indexOf(STATE_SENTINEL);
        const prose = (idx === -1 ? buffer : buffer.slice(0, idx)).trim();

        let tail: TurnTail = {};
        if (idx !== -1) {
          try {
            tail = JSON.parse(buffer.slice(idx + STATE_SENTINEL.length));
          } catch {
            /* Prose already arrived and is saved server-side; only the choices
               are lost. Fall through to the fallback options below. */
          }
        }

        if (tail.error) setError(tail.error);

        setTurns((prev) => [
          ...prev,
          {
            turnNumber: prev.length,
            role: "narrator",
            content: prose,
            diceRoll: (tail.diceRoll as DiceRoll | null) ?? null,
          },
        ]);
        setStreaming("");

        if (tail.diceRoll) setLastRoll(tail.diceRoll as DiceRoll);
        if (tail.leveledTo) setLeveledTo(tail.leveledTo);
        if (tail.died) setFallen(true);

        if (tail.character) {
          setCharacter((c) => ({
            ...c,
            hpCurrent: tail.character!.hpCurrent,
            hpMax: tail.character!.hpMax,
            xp: tail.character!.xp,
            level: tail.character!.level,
            inventory: tail.character!.inventory as InventoryItem[],
          }));
        }

        setChoices(
          (tail.choices as Choice[]) ?? [
            { id: "look", label: "Look more closely at your surroundings" },
            { id: "press", label: "Press on regardless" },
          ],
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
        setStreaming("");
      } finally {
        setBusy(false);
        inFlight.current = false;
      }
    },
    [campaignId],
  );

  /* Open the campaign unprompted when it has no turns yet. */
  useEffect(() => {
    if (started.current) return;
    if (initialTurns.length === 0) {
      started.current = true;
      void takeTurn(null);
    }
  }, [initialTurns.length, takeTurn]);

  /* Either signal is enough: the server closes the campaign when HP reaches 0
     and says so on the tail, and the HP it returns says the same thing. */
  const dead = fallen || character.hpCurrent <= 0;

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      {/* ── Chronicle ── */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-bevel flex items-center justify-between border-b px-5 py-3">
          <Link href="/campaigns" className="label-engraved hover:text-gold shrink-0">
            ← Campaigns
          </Link>
          <h1 className="mx-4 truncate text-center text-lg">{title}</h1>
          <span className="label-engraved shrink-0 tabular-nums">
            {turns.length} turns
          </span>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
          <div className="mx-auto max-w-2xl space-y-5">
            {turns.map((turn, i) => (
              <div key={`${turn.turnNumber}-${i}`} className="scroll-in">
                {turn.role === "player" ? (
                  <div className="border-gold-dim/40 bg-raised/30 border-l-2 py-1 pl-4">
                    <p className="label-engraved mb-1">{character.name}</p>
                    <p className="text-gold/90 text-sm italic">{turn.content}</p>
                  </div>
                ) : (
                  <div className="vellum px-5 py-5 sm:px-7">
                    {turn.diceRoll && <RollBanner roll={turn.diceRoll} />}
                    <Prose text={turn.content} />
                  </div>
                )}
              </div>
            ))}

            {streaming && (
              <div className="vellum px-5 py-5 sm:px-7">
                <Prose text={streaming} />
                <span className="bg-gold ml-0.5 inline-block h-4 w-2 animate-pulse align-middle" />
              </div>
            )}

            {busy && !streaming && (
              <p className="text-ash animate-flicker py-8 text-center text-sm italic">
                The narrator considers…
              </p>
            )}

            {leveledTo !== null && (
              <p
                role="status"
                className="border-gold-dim/60 bg-gold/10 text-gold-bright text-glow-gold border px-4 py-3 text-center text-sm"
              >
                You are level {leveledTo}. Your wounds close as you grow into it.
              </p>
            )}

            {error && (
              <p role="alert" className="border-blood/50 bg-blood/10 text-blood-bright border px-4 py-3 text-sm">
                {error}
              </p>
            )}
          </div>
        </div>

        {/* ── Choices ── */}
        <div className="border-bevel bg-pitch/80 border-t px-4 py-4 sm:px-8">
          <div className="mx-auto max-w-2xl space-y-3">
            {dead ? (
              <Panel className="text-center">
                <p className="text-blood-bright text-xl">You have fallen.</p>
                <p className="text-ash mt-1 text-sm italic">
                  The chronicle keeps what you did. It does not give it back.
                </p>
                <Link href="/campaigns" className="mt-4 inline-block">
                  <OrnateButton variant="blood">Return to the gate</OrnateButton>
                </Link>
              </Panel>
            ) : (
              <>
                {choices.length > 0 && !busy && (
                  <div className="grid gap-2">
                    {choices.map((choice) => (
                      <button
                        key={choice.id}
                        onClick={() => takeTurn(choice.label, choice.check)}
                        className="btn-ornate px-4 py-3 text-left text-sm normal-case"
                      >
                        <span className="text-gold-bright block">{choice.label}</span>
                        {choice.hint && (
                          <span className="text-ash mt-0.5 block text-xs italic normal-case">
                            {choice.hint}
                          </span>
                        )}
                        {choice.check && (
                          <span className="label-engraved mt-1 block">
                            {ABILITY_NAMES[choice.check.ability]} check · DC {choice.check.dc}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const text = freeText.trim();
                    if (!text || busy) return;
                    setFreeText("");
                    void takeTurn(text);
                  }}
                  className="flex gap-2"
                >
                  <input
                    value={freeText}
                    onChange={(e) => setFreeText(e.target.value)}
                    placeholder="Or do something else entirely…"
                    maxLength={600}
                    disabled={busy}
                    className="input-ornate flex-1 px-3 py-2.5 text-sm"
                  />
                  <OrnateButton type="submit" disabled={busy || !freeText.trim()} busy={busy}>
                    Act
                  </OrnateButton>
                </form>

                <form
                  action={abandonCampaignAction.bind(null, campaignId)}
                  onSubmit={(e) => {
                    if (
                      !window.confirm(
                        "Abandon this campaign? The chronicle is kept and stays readable, but the run ends here.",
                      )
                    ) {
                      e.preventDefault();
                    }
                  }}
                  className="text-center"
                >
                  <button
                    type="submit"
                    disabled={busy}
                    className="label-engraved hover:text-blood-bright disabled:opacity-40"
                  >
                    Abandon this campaign
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── HUD ── */}
      <aside className="border-bevel bg-pitch/60 shrink-0 border-t p-4 lg:w-80 lg:border-t-0 lg:border-l lg:overflow-y-auto">
        <div className="flex items-start gap-4 lg:flex-col lg:items-stretch">
          <Portrait
            spec={generatePortrait(
              character.race as RaceId,
              character.gender as GenderId,
              character.portraitSeed,
            )}
            size={132}
            className="mx-auto shrink-0"
          />

          <div className="min-w-0 flex-1 lg:text-center">
            <p className="text-gold-bright truncate text-lg">{character.name}</p>
            <p className="text-ash text-xs italic">
              Level {character.level} {race.name} {cls.name}
            </p>

            <div className="mt-3 flex items-start justify-center gap-5">
              <Orb kind="health" current={character.hpCurrent} max={character.hpMax} size={64} />
              {maxMana > 0 && <Orb kind="mana" current={maxMana} max={maxMana} size={64} />}
            </div>

            <div className="label-engraved mt-3 flex justify-center gap-4">
              <span>AC {character.ac}</span>
              <span>XP {character.xp}</span>
            </div>
          </div>
        </div>

        {lastRoll && (
          <>
            <Divider className="my-4" />
            <RollBanner roll={lastRoll} />
          </>
        )}

        <Divider className="my-4" />
        <p className="label-engraved mb-2">Abilities</p>
        <div className="grid grid-cols-2 gap-1.5">
          {ABILITIES.map((a) => (
            <div key={a} className="bg-panel/60 border-bevel flex justify-between border px-2 py-1 text-xs">
              <span className="text-ash">{ABILITY_NAMES[a].slice(0, 3).toUpperCase()}</span>
              <span className="tabular-nums">
                {character.stats[a]}{" "}
                <span className="text-gold-dim">
                  {formatModifier(abilityModifier(character.stats[a]))}
                </span>
              </span>
            </div>
          ))}
        </div>

        <Divider className="my-4" />
        <p className="label-engraved mb-2">Carried</p>
        {character.inventory.length === 0 ? (
          <p className="text-ash text-xs italic">Nothing worth naming.</p>
        ) : (
          <ul className="space-y-1">
            {character.inventory.map((item) => (
              <li key={item.id} className="text-xs">
                <span className={cn(RARITY_CLASS[item.rarity] ?? "rarity-common")}>
                  {item.name}
                  {item.quantity > 1 && ` ×${item.quantity}`}
                </span>
                {item.description && (
                  <span className="text-ash block text-[11px] italic">{item.description}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}

/** Splits narration into paragraphs. The model emits blank-line separated prose. */
function Prose({ text }: { text: string }) {
  return (
    <>
      {text.split(/\n{2,}/).map((para, i) => (
        <p key={i} className="mb-3 leading-relaxed last:mb-0">
          {para.trim()}
        </p>
      ))}
    </>
  );
}

function RollBanner({ roll }: { roll: DiceRoll }) {
  const crit = roll.critical;
  return (
    <div
      className={cn(
        "mb-4 border px-3 py-2 text-xs",
        roll.success
          ? "border-gold-dim/50 bg-gold/5 text-gold"
          : "border-blood/50 bg-blood/10 text-blood-bright",
      )}
    >
      <span className="label-engraved">
        {ABILITY_NAMES[roll.ability]} · DC {roll.dc}
      </span>
      <span className="ml-2 tabular-nums">
        d20 {roll.d20} {formatModifier(roll.modifier)} = <strong>{roll.total}</strong>
      </span>
      <span className="ml-2 font-bold">
        {crit === "hit" ? "CRITICAL SUCCESS" : crit === "miss" ? "CRITICAL FAILURE" : roll.success ? "Success" : "Failure"}
      </span>
    </div>
  );
}
