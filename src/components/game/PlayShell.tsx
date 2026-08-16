import type { ReactNode } from "react";

/**
 * Three-column HUD v2 shell.
 *
 * Fixed geometry per the design source: 388px inventory / flexible story /
 * 268px spells+attributes, title bar above, hotbar below. This is deliberately
 * NOT responsive below its minimum width — the layout is a game HUD, not a
 * page, and squeezing it below ~1460px produces overlapping chrome rather
 * than a usable narrow layout. Columns scroll internally so the shell itself
 * never grows the page.
 */
export function PlayShell({
  titleBar,
  left,
  centre,
  right,
  hotbar,
  overlay,
}: {
  titleBar: ReactNode;
  left: ReactNode;
  centre: ReactNode;
  right: ReactNode;
  hotbar: ReactNode;
  overlay?: ReactNode;
}) {
  return (
    <div
      className="mx-auto grid min-w-[1460px] gap-3 p-3.5"
      style={{ gridTemplateRows: "auto minmax(620px, 1fr) auto" }}
    >
      <div className="h-11">{titleBar}</div>

      <div
        className="grid min-h-0 gap-3"
        style={{ gridTemplateColumns: "388px minmax(660px, 1fr) 268px" }}
      >
        <div className="flex min-h-0 flex-col gap-3 overflow-y-auto">{left}</div>

        <div className="relative min-h-0">
          {centre}
          {overlay}
        </div>

        <div className="flex min-h-0 flex-col gap-3 overflow-y-auto">{right}</div>
      </div>

      <div>{hotbar}</div>
    </div>
  );
}
