"use client";

import { useState, useMemo, useActionState, useCallback } from "react";
import Link from "next/link";

import {
  RACES, CLASSES, BACKGROUNDS, GENDERS, TONES, ABILITIES, ABILITY_NAMES,
  DEFAULT_SCORES, POINT_BUY_BUDGET, POINT_BUY_MIN, POINT_BUY_MAX,
  pointBuyCost, totalPointBuyCost, applyRacialBonuses, abilityModifier,
  formatModifier, deriveMaxHp, deriveAc,
  type RaceId, type ClassId, type GenderId, type BackgroundId, type ToneId,
} from "@/lib/game/srd";
import type { AbilityScores } from "@/lib/game/types";
import { randomSeed } from "@/lib/portraits/rng";
import { generatePortrait, distinctnessKey } from "@/lib/portraits/spec";
import { Portrait } from "@/components/portrait/Portrait";

import { Panel } from "@/components/ui/Panel";
import { Divider } from "@/components/ui/Divider";
import { OrnateButton } from "@/components/ui/OrnateButton";
import { Input } from "@/components/ui/Input";
import { createCharacterAction, type ActionState } from "@/lib/game/actions";
import { cn } from "@/lib/cn";

const STEPS = ["Lineage", "Calling", "Aptitude", "Countenance", "Oath"] as const;
type Step = number;

/**
 * Three candidate faces.
 *
 * Seeds are re-drawn until each produces a visibly different face. Three raw
 * random seeds regularly yield three near-identical portraits — same skin, same
 * hair, same style — which makes the choice feel broken even though the
 * generator is working correctly.
 */
function drawCandidates(race: RaceId, gender: GenderId): number[] {
  const seeds: number[] = [];
  const keys = new Set<string>();

  for (let attempt = 0; attempt < 60 && seeds.length < 3; attempt++) {
    const seed = randomSeed();
    const key = distinctnessKey(generatePortrait(race, gender, seed));
    if (keys.has(key)) continue;
    keys.add(key);
    seeds.push(seed);
  }

  /* Top up if the race's palette is too small to yield three distinct keys. */
  while (seeds.length < 3) seeds.push(randomSeed());
  return seeds;
}

export function CharacterForge() {
  const [step, setStep] = useState<Step>(0);

  const [name, setName] = useState("");
  const [race, setRace] = useState<RaceId>("human");
  const [gender, setGender] = useState<GenderId>("male");
  const [klass, setKlass] = useState<ClassId>("fighter");
  const [background, setBackground] = useState<BackgroundId>("soldier");
  const [tone, setTone] = useState<ToneId>("grim");
  const [scores, setScores] = useState<AbilityScores>({ ...DEFAULT_SCORES });

  const [seeds, setSeeds] = useState<number[]>(() => drawCandidates("human", "male"));
  const [chosenSeed, setChosenSeed] = useState<number>(() => seeds[0]);

  const [state, submit, pending] = useActionState<ActionState, FormData>(
    createCharacterAction,
    {},
  );

  /* Portraits are race- and gender-specific, so changing either invalidates
     the current candidates. */
  const refreshPortraits = useCallback(
    (r: RaceId, g: GenderId) => {
      const next = drawCandidates(r, g);
      setSeeds(next);
      setChosenSeed(next[0]);
    },
    [],
  );

  const spent = useMemo(() => totalPointBuyCost(scores), [scores]);
  const remaining = POINT_BUY_BUDGET - spent;

  const finalScores = useMemo(() => applyRacialBonuses(scores, race), [scores, race]);
  const hpMax = useMemo(() => deriveMaxHp(klass, finalScores.con), [klass, finalScores.con]);
  const ac = useMemo(() => deriveAc(finalScores.dex), [finalScores.dex]);

  const adjust = (ability: keyof AbilityScores, delta: number) => {
    setScores((prev) => {
      const next = prev[ability] + delta;
      if (next < POINT_BUY_MIN || next > POINT_BUY_MAX) return prev;
      const candidate = { ...prev, [ability]: next };
      if (totalPointBuyCost(candidate) > POINT_BUY_BUDGET) return prev;
      return candidate;
    });
  };

  const canAdvance = (() => {
    switch (step) {
      case 0: return name.trim().length > 0;
      case 2: return remaining >= 0;
      default: return true;
    }
  })();

  const payload = JSON.stringify({
    name: name.trim(),
    race,
    class: klass,
    gender,
    background,
    tone,
    stats: scores,
    portraitSeed: chosenSeed,
  });

  return (
    <main className="mx-auto min-h-dvh max-w-5xl px-5 py-10">
      <header className="mb-8 text-center">
        <Link href="/campaigns" className="label-engraved hover:text-gold">
          ← Back to campaigns
        </Link>
        <h1 className="mt-3 text-4xl font-black">Forge a Character</h1>
      </header>

      {/* Step rail */}
      <ol className="mb-8 flex flex-wrap items-center justify-center gap-2">
        {STEPS.map((label, i) => (
          <li key={label} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => i < step && setStep(i)}
              disabled={i > step}
              className={cn(
                "label-engraved px-2 py-1 transition-colors",
                i === step && "text-gold-bright text-glow-gold",
                i < step && "text-gold cursor-pointer hover:text-gold-bright",
                i > step && "text-ash/50 cursor-not-allowed",
              )}
            >
              {i + 1}. {label}
            </button>
            {i < STEPS.length - 1 && <span className="text-bevel">·</span>}
          </li>
        ))}
      </ol>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <Panel ornate className="min-h-[26rem]">
          {/* ── Step 1: Lineage ── */}
          {step === 0 && (
            <div className="space-y-6">
              <Input
                name="name"
                label="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={40}
                placeholder="Kaelen, Ysolde, Grimm…"
                autoFocus
              />

              <div>
                <p className="label-engraved mb-2">Lineage</p>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {RACES.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      data-selected={race === r.id}
                      onClick={() => { setRace(r.id); refreshPortraits(r.id, gender); }}
                      className="tile-select p-3 text-left"
                    >
                      <span className="text-gold-bright block text-sm font-bold">{r.name}</span>
                      <span className="text-ash mt-1 block text-xs leading-snug italic">{r.blurb}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="label-engraved mb-2">Gender</p>
                <div className="flex flex-wrap gap-2">
                  {GENDERS.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      data-selected={gender === g.id}
                      onClick={() => { setGender(g.id); refreshPortraits(race, g.id); }}
                      className="tile-select px-4 py-2 text-sm"
                    >
                      {g.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: Calling ── */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <p className="label-engraved mb-2">Class</p>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {CLASSES.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      data-selected={klass === c.id}
                      onClick={() => setKlass(c.id)}
                      className="tile-select p-3 text-left"
                    >
                      <span className="text-gold-bright block text-sm font-bold">{c.name}</span>
                      <span className="text-ash mt-1 block text-xs leading-snug italic">{c.blurb}</span>
                      <span className="label-engraved mt-1.5 block">d{c.hitDie} · {ABILITY_NAMES[c.primary]}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="label-engraved mb-2">Background</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {BACKGROUNDS.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      data-selected={background === b.id}
                      onClick={() => setBackground(b.id)}
                      className="tile-select p-3 text-left"
                    >
                      <span className="text-gold-bright block text-sm font-bold">{b.name}</span>
                      <span className="text-ash mt-1 block text-xs leading-snug italic">{b.blurb}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Step 3: Aptitude ── */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="flex items-baseline justify-between">
                <p className="label-engraved">Point buy</p>
                <p className={cn("text-sm tabular-nums", remaining === 0 ? "text-gold" : "text-gold-bright")}>
                  {remaining} <span className="text-ash">of {POINT_BUY_BUDGET} left</span>
                </p>
              </div>

              <div className="space-y-2">
                {ABILITIES.map((a) => {
                  const base = scores[a];
                  const bonus = finalScores[a] - base;
                  const stepUpCost = pointBuyCost(base + 1) - pointBuyCost(base);
                  const canRaise = base < POINT_BUY_MAX && stepUpCost <= remaining;

                  return (
                    <div key={a} className="bg-pitch/60 border-bevel flex items-center gap-3 border px-3 py-2">
                      <span className="w-28 text-sm">{ABILITY_NAMES[a]}</span>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => adjust(a, -1)}
                          disabled={base <= POINT_BUY_MIN}
                          className="btn-ornate h-7 w-7 text-base leading-none disabled:opacity-30"
                          aria-label={`Lower ${ABILITY_NAMES[a]}`}
                        >−</button>
                        <span className="w-8 text-center text-lg tabular-nums">{base}</span>
                        <button
                          type="button"
                          onClick={() => adjust(a, 1)}
                          disabled={!canRaise}
                          className="btn-ornate h-7 w-7 text-base leading-none disabled:opacity-30"
                          aria-label={`Raise ${ABILITY_NAMES[a]}`}
                        >+</button>
                      </div>

                      <span className="text-ash ml-auto text-xs tabular-nums">
                        {bonus > 0 && <span className="text-gold">+{bonus} lineage → </span>}
                        <span className="text-gold-bright text-sm">{finalScores[a]}</span>
                        {" "}({formatModifier(abilityModifier(finalScores[a]))})
                      </span>
                    </div>
                  );
                })}
              </div>

              <Divider />

              <div className="flex justify-around text-center">
                <div>
                  <p className="label-engraved">Hit Points</p>
                  <p className="text-blood-bright text-2xl tabular-nums">{hpMax}</p>
                </div>
                <div>
                  <p className="label-engraved">Armour Class</p>
                  <p className="text-gold-bright text-2xl tabular-nums">{ac}</p>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 4: Countenance ── */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <p className="label-engraved">Choose a face</p>
                <button
                  type="button"
                  onClick={() => refreshPortraits(race, gender)}
                  className="label-engraved hover:text-gold-bright underline"
                >
                  Draw three more
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {seeds.map((seed) => (
                  <button
                    key={seed}
                    type="button"
                    data-selected={chosenSeed === seed}
                    onClick={() => setChosenSeed(seed)}
                    className="tile-select overflow-hidden p-2"
                  >
                    <Portrait
                      spec={generatePortrait(race, gender, seed)}
                      size={200}
                      className="mx-auto h-auto w-full"
                    />
                  </button>
                ))}
              </div>

              <p className="text-ash text-center text-xs italic">
                Faces are drawn from your lineage and are yours permanently.
              </p>
            </div>
          )}

          {/* ── Step 5: Oath ── */}
          {step === 4 && (
            <div className="space-y-5">
              <div>
                <p className="label-engraved mb-2">What kind of tale is this?</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {TONES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      data-selected={tone === t.id}
                      onClick={() => setTone(t.id)}
                      className="tile-select p-3 text-left"
                    >
                      <span className="text-gold-bright block text-sm font-bold">{t.name}</span>
                      <span className="text-ash mt-1 block text-xs leading-snug italic">{t.blurb}</span>
                    </button>
                  ))}
                </div>
              </div>

              <Divider />

              {state.error && (
                <p role="alert" className="border-blood/50 bg-blood/10 text-blood-bright border px-3 py-2 text-sm">
                  {state.error}
                </p>
              )}

              <form action={submit}>
                <input type="hidden" name="payload" value={payload} />
                <OrnateButton type="submit" size="lg" variant="blood" className="w-full" busy={pending}>
                  {pending ? "The gate opens…" : "Begin the Descent"}
                </OrnateButton>
              </form>
            </div>
          )}
        </Panel>

        {/* ── Live summary ── */}
        <aside className="space-y-4">
          <Panel className="text-center">
            <Portrait
              spec={generatePortrait(race, gender, chosenSeed)}
              size={200}
              className="mx-auto h-auto w-full max-w-[200px]"
            />
            <p className="text-gold-bright mt-3 text-lg font-bold">
              {name.trim() || "Nameless"}
            </p>
            <p className="text-ash text-xs italic">
              {GENDERS.find((g) => g.id === gender)?.name}{" "}
              {RACES.find((r) => r.id === race)?.name}{" "}
              {CLASSES.find((c) => c.id === klass)?.name}
            </p>
            <Divider className="my-3" />
            <div className="flex justify-around text-sm tabular-nums">
              <span className="text-blood-bright">{hpMax} HP</span>
              <span className="text-gold">AC {ac}</span>
            </div>
          </Panel>
        </aside>
      </div>

      {/* ── Navigation ── */}
      <div className="mt-6 flex justify-between">
        <OrnateButton
          type="button"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
        >
          Back
        </OrnateButton>

        {step < STEPS.length - 1 && (
          <OrnateButton
            type="button"
            onClick={() => setStep((s) => s + 1)}
            disabled={!canAdvance}
          >
            Continue
          </OrnateButton>
        )}
      </div>
    </main>
  );
}
