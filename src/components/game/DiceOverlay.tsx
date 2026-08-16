"use client";

import { useEffect, useRef, useState } from "react";
import { ABILITY_NAMES, formatModifier } from "@/lib/game/srd";
import type { DiceRoll } from "@/lib/game/types";

const TUMBLE_MS = 1250;
const SETTLE_HOLD_MS = 2350;

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/**
 * Full-panel overlay: tumbling d20 → settles on the real face → result plaque.
 *
 * `roll` is null until the turn's stream finishes (the server rolls before
 * narrating, but the client only learns the result in the tail at the end of
 * the stream — see src/app/api/campaigns/[id]/turn/route.ts). So the die
 * tumbles on fake faces for at least TUMBLE_MS, and only settles once the real
 * roll has actually arrived — which on a slow local model may be well after
 * TUMBLE_MS. It never fabricates a settled result.
 */
export function DiceOverlay({ roll, onDone }: { roll: DiceRoll | null; onDone: () => void }) {
  const [face, setFace] = useState(20);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  const settled = roll != null && (minTimeElapsed || reducedMotion);

  useEffect(() => {
    if (reducedMotion) return;
    const t = setTimeout(() => setMinTimeElapsed(true), TUMBLE_MS);
    return () => clearTimeout(t);
  }, [reducedMotion]);

  useEffect(() => {
    if (settled) return;
    const iv = setInterval(() => setFace(1 + Math.floor(Math.random() * 20)), 70);
    return () => clearInterval(iv);
  }, [settled]);

  useEffect(() => {
    if (!settled) return;
    const t = setTimeout(() => onDoneRef.current(), reducedMotion ? 700 : SETTLE_HOLD_MS);
    return () => clearTimeout(t);
  }, [settled, reducedMotion]);

  const halo = !settled || !roll
    ? "#8a7a4e"
    : roll.critical === "hit"
      ? "#c7b377"
      : roll.success
        ? "#8a7a4e"
        : "#a41e1e";

  const shown = settled && roll ? roll.d20 : face;
  const tumbling = !settled && !reducedMotion;

  return (
    <div
      className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-5"
      style={{ background: "rgba(10,7,5,.84)", backdropFilter: "blur(2px)" }}
      role="status"
      aria-live="polite"
    >
      <div className="relative" style={{ width: 96, height: 96 }}>
        <div
          aria-hidden
          className="absolute left-1/2"
          style={{
            bottom: -10,
            width: 80,
            height: 22,
            transform: "translateX(-50%)",
            borderRadius: "50%",
            background: "#000",
            animation: tumbling ? "dieShadow 1250ms ease-out both" : undefined,
            opacity: settled ? 0.55 : 0.4,
          }}
        />

        <div
          style={{
            position: "absolute",
            inset: 0,
            filter: `blur(9px)`,
            background: halo,
            opacity: settled ? 0.55 : 0.25,
            clipPath: "polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)",
          }}
        />

        <div
          className="relative flex h-full w-full items-center justify-center"
          style={{
            clipPath: "polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)",
            background: "linear-gradient(180deg, #33281c, #16110c)",
            border: "1px solid var(--color-frame-lit)",
            animation: tumbling ? "dieTumble 1250ms cubic-bezier(.3,.6,.4,1) both" : undefined,
          }}
        >
          <div
            className="absolute"
            style={{
              inset: "12% 12% 22% 12%",
              clipPath: "polygon(50% 12%, 88% 78%, 12% 78%)",
              background: "rgba(199,179,119,0.1)",
            }}
          />
          <span
            className="tabular-nums"
            style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 30, color: "#e8d9a0" }}
          >
            {shown}
          </span>
        </div>
      </div>

      {settled && roll && (
        <div className="frame-carved px-5 py-3 text-center">
          <p className="label-engraved">
            {ABILITY_NAMES[roll.ability]} · DC {roll.dc}
          </p>
          <p className="mt-1 tabular-nums text-[#dcc79c]">
            d20 {roll.d20} {formatModifier(roll.modifier)} = <strong>{roll.total}</strong>
          </p>
          <p
            className="mt-1 uppercase"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 13,
              letterSpacing: "0.2em",
              color: roll.success ? "#c7b377" : "#ff5a4a",
            }}
          >
            {roll.critical === "hit"
              ? "Critical Success"
              : roll.critical === "miss"
                ? "Critical Failure"
                : roll.success
                  ? "Success"
                  : "Failure"}
          </p>
        </div>
      )}
    </div>
  );
}
