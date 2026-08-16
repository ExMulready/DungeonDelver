"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ChoiceList } from "./ChoiceList";
import type { Choice } from "@/lib/game/types";

export function StoryPage({
  title,
  scene,
  sceneArtCaption,
  playerAction,
  playerName,
  streaming,
  busy,
  dead,
  error,
  choices,
  onChoose,
  onFreeText,
}: {
  title: string;
  scene: string;
  sceneArtCaption?: string | null;
  playerAction: string | null;
  playerName: string;
  streaming: string;
  busy: boolean;
  dead: boolean;
  error: string | null;
  choices: Choice[];
  onChoose: (label: string, check?: Choice["check"]) => void;
  onFreeText: (text: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  /* Follow the text as it streams; leave the reader alone otherwise. */
  useEffect(() => {
    if (!busy) return;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [streaming, busy]);

  const proseText = busy ? streaming : scene;

  return (
    <div className="frame-carved relative flex h-full flex-col p-[11px]">
      <div ref={scrollRef} className="page-parchment min-h-0 flex-1 overflow-y-auto p-6">
        <h2
          className="uppercase"
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: 15,
            letterSpacing: "0.14em",
            color: "var(--color-arcane)",
          }}
        >
          {title}
        </h2>
        <div
          className="mt-2 mb-5 h-px"
          style={{ background: "linear-gradient(90deg, var(--color-arcane), transparent)" }}
        />

        <div className="grid gap-6" style={{ gridTemplateColumns: "minmax(0, 1fr) 330px" }}>
          <div className="min-w-0" style={{ maxWidth: "70ch" }}>
            {playerAction && (
              <p className="text-page-ink-dim mb-4 border-l-2 border-[color:var(--color-page-edge)] pl-3 text-[15px] italic">
                <span className="not-italic font-semibold">{playerName}: </span>
                {playerAction}
              </p>
            )}

            <Prose text={proseText} />

            {busy && (
              <span className="ml-0.5 inline-block h-4 w-2 animate-pulse align-middle bg-[color:var(--color-page-ink)]" />
            )}

            {busy && !streaming && (
              <p className="animate-flicker py-6 text-sm italic opacity-70">The narrator considers…</p>
            )}

            {error && (
              <p role="alert" className="border-blood/60 bg-blood/10 text-blood-deep mt-4 border px-3 py-2 text-sm">
                {error}
              </p>
            )}

            {dead && (
              <div className="mt-6 border border-[color:var(--color-page-edge)] bg-black/10 p-4 text-center">
                <p className="text-blood-deep text-lg font-semibold">You have fallen.</p>
                <p className="text-page-ink-dim mt-1 text-sm italic">
                  The chronicle keeps what you did. It does not give it back.
                </p>
                <Link href="/campaigns" className="btn-ornate btn-blood mt-4 inline-block px-5 py-2.5 text-sm">
                  Return to the gate
                </Link>
              </div>
            )}
          </div>

          <SceneArt caption={sceneArtCaption} />
        </div>

        {!dead && (
          <ChoiceList choices={choices} busy={busy} onChoose={onChoose} onFreeText={onFreeText} />
        )}
      </div>

      {/* Crest slot — a real button so it stays a legitimate interactive target,
          even though nothing is wired to it yet. */}
      <button
        type="button"
        aria-label="Campaign crest"
        className="frame-carved absolute left-1/2 flex items-center justify-center"
        style={{ bottom: -8, width: 150, height: 44, transform: "translateX(-50%)" }}
      >
        <span className="label-engraved" aria-hidden>
          ❖
        </span>
      </button>
    </div>
  );
}

function SceneArt({ caption }: { caption?: string | null }) {
  return (
    <div className="relative shrink-0" style={{ height: 352 }}>
      <div className="slot relative h-full w-full overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "linear-gradient(270deg, transparent 68%, rgba(190,166,126,.35))" }}
        />
        <div className="flex h-full items-center justify-center px-4">
          <span className="label-engraved text-center opacity-50">Uncharted</span>
        </div>
      </div>
      <p className="label-engraved mt-2 text-center opacity-60">{caption || "No scene art yet"}</p>
    </div>
  );
}

/** Splits narration into paragraphs. The model emits blank-line separated prose. */
function Prose({ text }: { text: string }) {
  return (
    <>
      {text.split(/\n{2,}/).map((para, i) => (
        <p
          key={i}
          className="mb-4 last:mb-0"
          style={{ fontSize: 17, lineHeight: 1.62, textWrap: "pretty" } as React.CSSProperties}
        >
          {para.trim()}
        </p>
      ))}
    </>
  );
}
