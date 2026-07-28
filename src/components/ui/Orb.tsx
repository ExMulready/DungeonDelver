import { cn } from "@/lib/cn";

type OrbProps = {
  kind: "health" | "mana";
  current: number;
  max: number;
  /** Pixel diameter. */
  size?: number;
  className?: string;
};

/**
 * The Diablo vital globe. More than any other single element, this is what
 * makes the HUD read as Diablo rather than as a generic dark theme.
 *
 * Fill level is driven by the `--fill` custom property consumed by `.orb-fill`.
 */
export function Orb({ kind, current, max, size = 88, className }: OrbProps) {
  const safeMax = Math.max(1, max);
  const clamped = Math.max(0, Math.min(current, safeMax));
  const pct = (clamped / safeMax) * 100;

  const label = kind === "health" ? "Life" : "Mana";
  const critical = kind === "health" && pct <= 25;

  return (
    <div className={cn("flex flex-col items-center gap-1.5", className)}>
      <div
        className={cn(
          "orb",
          kind === "health" ? "orb-health" : "orb-mana",
          critical && "animate-[pulse-slow_1.4s_ease-in-out_infinite]",
        )}
        style={{ width: size, height: size }}
        role="meter"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-label={`${label}: ${clamped} of ${safeMax}`}
      >
        <div className="orb-fill" style={{ ["--fill" as string]: pct }} />
      </div>
      <span className="label-engraved tabular-nums">
        {clamped}
        <span className="text-ash">/</span>
        {safeMax}
      </span>
    </div>
  );
}
