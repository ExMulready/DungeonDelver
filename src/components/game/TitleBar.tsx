import Link from "next/link";

/** Title bar: campaigns link · DUNGEON DELVER · turn count · window controls. */
export function TitleBar({ title, turns }: { title: string; turns: number }) {
  return (
    <div className="frame-carved flex h-11 items-center justify-between px-4">
      <Link
        href="/campaigns"
        className="label-engraved hover:text-gold-bright shrink-0 transition-colors"
      >
        ← Campaigns
      </Link>

      <h1
        className="animate-flicker truncate text-[19px] font-semibold uppercase"
        style={{
          fontFamily: "var(--font-display)",
          letterSpacing: "0.3em",
          color: "#d9c48c",
          animationDuration: "5s",
        }}
        title={title}
      >
        Dungeon Delver
      </h1>

      <div className="flex shrink-0 items-center gap-3">
        <span className="label-engraved tabular-nums">{turns} turns</span>
        {/* Decorative window controls — carved studs, not functional. */}
        <div aria-hidden className="flex items-center gap-1.5">
          {["#8a7a4e", "#8a7a4e", "#a41e1e"].map((c, i) => (
            <span
              key={i}
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{
                background: c,
                boxShadow: "inset 0 1px 1px rgba(255,255,255,.25), 0 1px 2px rgba(0,0,0,.6)",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
