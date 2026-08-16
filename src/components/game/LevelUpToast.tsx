"use client";

import { useEffect, useRef } from "react";

const AUTO_DISMISS_MS = 4200;

/**
 * Gold plaque toast, auto-dismisses after 4.2s.
 *
 * Not wired to anything yet — the turn tail has no `leveledUp` flag until
 * src/lib/game/engine.ts actually awards levels (HANDOFF-hud-v2.md §4.5).
 * Render it when that flag exists; until then nothing calls this component.
 */
export function LevelUpToast({ level, onDismiss }: { level: number; onDismiss: () => void }) {
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    const t = setTimeout(() => onDismissRef.current(), AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      role="status"
      className="frame-carved animate-flicker fixed top-6 left-1/2 z-50 px-6 py-4 text-center"
      style={{ transform: "translateX(-50%)", borderColor: "var(--color-gold)" }}
    >
      <p
        className="uppercase"
        style={{ fontFamily: "var(--font-display)", fontSize: 13, letterSpacing: "0.2em", color: "var(--color-gold)" }}
      >
        Level Up
      </p>
      <p className="text-gold-bright mt-1 text-2xl font-bold">{level}</p>
    </div>
  );
}
