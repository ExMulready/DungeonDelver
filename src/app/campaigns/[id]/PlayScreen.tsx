"use client";

import { useState, useRef, useEffect, useCallback } from "react";

import { STATE_SENTINEL, type TurnTail } from "@/lib/game/protocol";
import type { AbilityScores, Choice, DiceRoll, InventoryItem, PowerCooldowns } from "@/lib/game/types";

import { PlayShell } from "@/components/game/PlayShell";
import { TitleBar } from "@/components/game/TitleBar";
import { CharacterBlock } from "@/components/game/CharacterBlock";
import { InventoryPanel } from "@/components/game/InventoryPanel";
import { StoryPage } from "@/components/game/StoryPage";
import { SpellsPanel } from "@/components/game/SpellsPanel";
import { AttributesPanel } from "@/components/game/AttributesPanel";
import { Hotbar } from "@/components/game/Hotbar";
import { DiceOverlay } from "@/components/game/DiceOverlay";
import { LevelUpToast } from "@/components/game/LevelUpToast";
import { POWERS, powersForClass } from "@/lib/game/powers";
import { useItem, equipItem, unequipItem } from "@/lib/game/actions";
import type { Equipment, EquipmentSlot } from "@/lib/game/types";

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
  powerCooldowns: PowerCooldowns;
  equipment: Equipment;
};

type TurnView = {
  turnNumber: number;
  role: string;
  content: string;
  diceRoll: DiceRoll | null;
  sceneArtCaption?: string | null;
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
  const [leveledUpTo, setLeveledUpTo] = useState<number | null>(null);
  /* True from the moment a check-gated choice is picked until the dice
     overlay finishes its settle-and-hold sequence. Drives DiceOverlay. */
  const [rollInFlight, setRollInFlight] = useState(false);

  /* Guards the auto-start effect. React 18+ runs effects twice in development,
     which without this fires two opening scenes for every new campaign. */
  const started = useRef(false);

  /**
   * Shared network core: posts a turn request body, streams the reply, and
   * applies the resulting state. Used by both takeTurn (free text / choices)
   * and activatePower (hotbar). `optimisticLine`, when given, is shown as the
   * player's own line immediately rather than waiting for the round trip —
   * the model may take 30 seconds on a local CPU.
   */
  const runTurn = useCallback(
    async (body: Record<string, unknown>, optimisticLine: string | null, isCheck: boolean) => {
      setBusy(true);
      setError(null);
      setStreaming("");
      setChoices([]);
      setLastRoll(null);
      if (isCheck) setRollInFlight(true);

      if (optimisticLine) {
        setTurns((prev) => [
          ...prev,
          { turnNumber: -1, role: "player", content: optimisticLine, diceRoll: null },
        ]);
      }

      try {
        const res = await fetch(`/api/campaigns/${campaignId}/turn`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
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
            sceneArtCaption: tail.sceneArtCaption ?? null,
          },
        ]);
        setStreaming("");

        if (tail.diceRoll) setLastRoll(tail.diceRoll as DiceRoll);

        if (tail.character) {
          setCharacter((c) => ({
            ...c,
            hpCurrent: tail.character!.hpCurrent,
            hpMax: tail.character!.hpMax,
            xp: tail.character!.xp,
            level: tail.character!.level,
            inventory: tail.character!.inventory as InventoryItem[],
            powerCooldowns: (tail.character!.powerCooldowns as PowerCooldowns | undefined) ?? c.powerCooldowns,
          }));
          if (tail.leveledUp) setLeveledUpTo(tail.character.level);
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
        setRollInFlight(false);
      } finally {
        setBusy(false);
      }
    },
    [campaignId],
  );

  const takeTurn = useCallback(
    (action: string | null, check?: Choice["check"]) =>
      runTurn(action ? { action, check } : {}, action, !!check),
    [runTurn],
  );

  const activatePower = useCallback(
    (powerId: string) => {
      const power = POWERS.find((p) => p.id === powerId);
      return runTurn({ powerId }, power?.name ?? null, false);
    },
    [runTurn],
  );

  /* Unlike takeTurn/activatePower, drinking a potion is not a narrated turn —
     it calls the useItem server action directly rather than streaming through
     /api/campaigns/[id]/turn. */
  const drinkPotion = useCallback(
    async (itemId: string) => {
      const result = await useItem(campaignId, itemId);
      if (result.error) {
        setError(result.error);
        return;
      }
      setCharacter((c) => ({
        ...c,
        hpCurrent: result.hpCurrent ?? c.hpCurrent,
        hpMax: result.hpMax ?? c.hpMax,
        inventory: (result.inventory as InventoryItem[]) ?? c.inventory,
      }));
    },
    [campaignId],
  );

  /* Equipping is likewise a direct server action, not a narrated turn. */
  const equipItemHandler = useCallback(
    async (itemId: string) => {
      const result = await equipItem(campaignId, itemId);
      if (result.error) {
        setError(result.error);
        return;
      }
      setCharacter((c) => ({
        ...c,
        ac: result.ac ?? c.ac,
        equipment: result.equipment ?? c.equipment,
        inventory: result.inventory ?? c.inventory,
      }));
    },
    [campaignId],
  );

  const unequipItemHandler = useCallback(
    async (slot: EquipmentSlot) => {
      const result = await unequipItem(campaignId, slot);
      if (result.error) {
        setError(result.error);
        return;
      }
      setCharacter((c) => ({
        ...c,
        ac: result.ac ?? c.ac,
        equipment: result.equipment ?? c.equipment,
        inventory: result.inventory ?? c.inventory,
      }));
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

  const dead = character.hpCurrent <= 0;

  /* HUD v2 shows exactly one scene: the most recent narrator turn, with the
     player's own line (if any) sitting above it. Older turns stay in the
     server's chronicle memory — the model still remembers them — they are
     simply not re-rendered on screen. */
  let lastNarratorIndex = -1;
  for (let i = turns.length - 1; i >= 0; i--) {
    if (turns[i].role === "narrator") {
      lastNarratorIndex = i;
      break;
    }
  }
  const lastNarratorTurn = lastNarratorIndex === -1 ? null : turns[lastNarratorIndex];
  const precedingPlayerTurn =
    lastNarratorIndex > 0 && turns[lastNarratorIndex - 1].role === "player"
      ? turns[lastNarratorIndex - 1]
      : null;
  const trailingPlayerTurn =
    turns.length > 0 && turns[turns.length - 1].role === "player" ? turns[turns.length - 1] : null;

  const playerAction = busy ? (trailingPlayerTurn?.content ?? null) : (precedingPlayerTurn?.content ?? null);

  return (
    <>
      {leveledUpTo !== null && (
        <LevelUpToast level={leveledUpTo} onDismiss={() => setLeveledUpTo(null)} />
      )}
      <PlayShell
        titleBar={<TitleBar title={title} turns={turns.length} />}
        left={
          <>
            <CharacterBlock character={character} />
            <InventoryPanel
              inventory={character.inventory}
              equipment={character.equipment}
              onEquip={equipItemHandler}
              onUnequip={unequipItemHandler}
            />
          </>
        }
        centre={
          <StoryPage
            title={title}
            scene={lastNarratorTurn?.content ?? ""}
            sceneArtCaption={lastNarratorTurn?.sceneArtCaption ?? null}
            playerAction={playerAction}
            playerName={character.name}
            streaming={streaming}
            busy={busy}
            dead={dead}
            error={error}
            choices={choices}
            onChoose={(label, check) => void takeTurn(label, check)}
            onFreeText={(text) => void takeTurn(text)}
          />
        }
        right={
          <>
            <SpellsPanel classId={character.class} />
            <AttributesPanel stats={character.stats} />
          </>
        }
        hotbar={
          <Hotbar
            inventory={character.inventory}
            powers={powersForClass(character.class)}
            cooldowns={character.powerCooldowns}
            onUsePower={activatePower}
            onDrinkPotion={drinkPotion}
            busy={busy}
          />
        }
        overlay={
          rollInFlight && (
            <DiceOverlay roll={lastRoll} onDone={() => setRollInFlight(false)} />
          )
        }
      />
    </>
  );
}
