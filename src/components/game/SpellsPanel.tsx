import { getClass } from "@/lib/game/srd";

/** Violet sigil header, 4x4 empty spell grid. Spellcasting is not implemented yet. */
export function SpellsPanel({ classId }: { classId: string }) {
  const cls = getClass(classId);

  return (
    <div className="frame-carved p-3">
      <div className="mb-3 flex items-center gap-2">
        <span aria-hidden style={{ color: "#b06ad8", fontSize: 16, textShadow: "0 0 8px rgba(176,106,216,.6)" }}>
          ✸
        </span>
        <p
          className="uppercase"
          style={{ fontFamily: "var(--font-display)", fontSize: 11, letterSpacing: "0.14em", color: "#c7a8e0" }}
        >
          Spells
        </p>
      </div>

      {cls.caster ? (
        <>
          <div className="grid grid-cols-4 gap-1">
            {Array.from({ length: 16 }, (_, i) => (
              <div key={i} className="slot" style={{ aspectRatio: "1 / 1" }} />
            ))}
          </div>
          <p className="text-ash mt-2 text-center text-xs italic">None Known</p>
        </>
      ) : (
        <p className="text-ash py-4 text-center text-xs italic">{cls.name}s do not cast spells.</p>
      )}
    </div>
  );
}
