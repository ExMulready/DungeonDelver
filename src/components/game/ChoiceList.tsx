"use client";

import { useState } from "react";
import { ABILITY_NAMES } from "@/lib/game/srd";
import { resolveChoiceIcon } from "@/lib/game/icons";
import type { Choice } from "@/lib/game/types";

/** Plaque rows for each choice, plus a free-text form for anything else. */
export function ChoiceList({
  choices,
  busy,
  onChoose,
  onFreeText,
}: {
  choices: Choice[];
  busy: boolean;
  onChoose: (label: string, check?: Choice["check"]) => void;
  onFreeText: (text: string) => void;
}) {
  const [freeText, setFreeText] = useState("");

  return (
    <div className="mt-5 space-y-2">
      {choices.length > 0 && !busy && (
        <div className="space-y-2">
          {choices.map((choice) => {
            const { glyph, tint } = resolveChoiceIcon(choice.icon);
            return (
              <button
                key={choice.id}
                onClick={() => onChoose(choice.label, choice.check)}
                className="plaque w-full"
              >
                <span
                  className="slot flex items-center justify-center text-lg"
                  style={{ width: 38, height: 38, color: tint }}
                  aria-hidden
                >
                  {glyph}
                </span>
                <span className="min-w-0">
                  <span className="block text-[15.5px] text-[#dcc79c]">{choice.label}</span>
                  {choice.hint && (
                    <span className="text-page-ink-dim mt-0.5 block text-xs italic opacity-70">
                      {choice.hint}
                    </span>
                  )}
                  {choice.check && (
                    <span
                      className="mt-1 block text-[#8a7a58] uppercase"
                      style={{ fontFamily: "var(--font-display)", fontSize: 9, letterSpacing: "0.18em" }}
                    >
                      {ABILITY_NAMES[choice.check.ability]} check · DC {choice.check.dc}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const text = freeText.trim();
          if (!text || busy) return;
          setFreeText("");
          onFreeText(text);
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
        <button
          type="submit"
          disabled={busy || !freeText.trim()}
          className="btn-ornate px-5 py-2.5 text-sm"
        >
          Act
        </button>
      </form>
    </div>
  );
}
