import type { PortraitSpec, Morph } from "@/lib/portraits/spec";
import { generatePortrait } from "@/lib/portraits/spec";
import type { RaceId, GenderId } from "@/lib/game/srd";
import { cn } from "@/lib/cn";

/**
 * Renders a PortraitSpec as SVG.
 *
 * Drawn back to front like a painting: garment, back hair, neck, skull, ears,
 * horns, shading, features, facial hair, front hair, then marks. Every layer
 * reads its geometry from the morph so all six races share one construction.
 *
 * Art direction is gothic woodcut — a single warm key light from upper-left, a
 * hard ink contour, and a cold rim on the right — matched to Diablo 2's
 * character portraits rather than to modern flat vector avatars.
 */

const W = 200;
const H = 240;
const CX = 100;

/** Skull outline: cranium arc into jaw into chin. */
function skullPath(m: Morph): string {
  const crownY = 96 - m.headH;
  const jawHingeY = m.eyeY + 22;

  /* jawSquare interpolates the chin between a point and a shelf. */
  const chinHalf = m.jawW * (0.22 + m.jawSquare * 0.46);
  const chinCtrl = m.jawW * (0.62 + m.jawSquare * 0.3);

  return [
    `M ${CX - m.headW} 96`,
    `C ${CX - m.headW} ${crownY + 8}, ${CX - m.headW * 0.66} ${crownY}, ${CX} ${crownY}`,
    `C ${CX + m.headW * 0.66} ${crownY}, ${CX + m.headW} ${crownY + 8}, ${CX + m.headW} 96`,
    `C ${CX + m.headW} ${jawHingeY - 6}, ${CX + m.jawW + 2} ${jawHingeY}, ${CX + m.jawW} ${jawHingeY + 6}`,
    `C ${CX + chinCtrl} ${m.chinY - 4}, ${CX + chinHalf} ${m.chinY}, ${CX} ${m.chinY}`,
    `C ${CX - chinHalf} ${m.chinY}, ${CX - chinCtrl} ${m.chinY - 4}, ${CX - m.jawW} ${jawHingeY + 6}`,
    `C ${CX - m.jawW - 2} ${jawHingeY}, ${CX - m.headW} ${jawHingeY - 6}, ${CX - m.headW} 96`,
    "Z",
  ].join(" ");
}

function Ear({ m, side, skin }: { m: Morph; side: -1 | 1; skin: PortraitSpec["skin"] }) {
  const x = CX + side * (m.headW - 2);
  const y = m.eyeY + 2;

  const d = m.earPoint
    ? `M ${x} ${y - 10} C ${x + side * 9} ${y - 14}, ${x + side * 14} ${y - m.earLen}, ${x + side * 10} ${y - m.earLen - 4}
       C ${x + side * 7} ${y - m.earLen + 4}, ${x + side * 8} ${y + 6}, ${x} ${y + 12} Z`
    : `M ${x} ${y - 10} C ${x + side * 11} ${y - 13}, ${x + side * 13} ${y + 2}, ${x + side * 7} ${y + 12}
       C ${x + side * 3} ${y + 15}, ${x} ${y + 14}, ${x} ${y + 12} Z`;

  return (
    <>
      <path d={d} fill={skin.base} stroke={skin.line} strokeWidth={1.4} />
      <path
        d={d}
        fill={skin.shadow}
        opacity={side === 1 ? 0.45 : 0.12}
      />
    </>
  );
}

function Horns({ style, m }: { style: NonNullable<PortraitSpec["horns"]>; m: Morph }) {
  const baseY = 96 - m.headH + 12;
  const bx = m.headW * 0.62;

  /* Horn colour is fixed rather than palette-driven: keratin should read as
     bone against every tiefling skin tone. */
  const shell = "#3a3129";
  const lit = "#5c5045";

  const shapes: Record<typeof style, (s: -1 | 1) => string> = {
    curved: (s) =>
      `M ${CX + s * bx} ${baseY} C ${CX + s * (bx + 16)} ${baseY - 26}, ${CX + s * (bx + 6)} ${baseY - 50}, ${CX + s * (bx - 8)} ${baseY - 58}
       C ${CX + s * (bx + 14)} ${baseY - 46}, ${CX + s * (bx + 20)} ${baseY - 20}, ${CX + s * (bx + 9)} ${baseY + 3} Z`,
    swept: (s) =>
      `M ${CX + s * bx} ${baseY} C ${CX + s * (bx + 24)} ${baseY - 14}, ${CX + s * (bx + 38)} ${baseY - 34}, ${CX + s * (bx + 40)} ${baseY - 50}
       C ${CX + s * (bx + 30)} ${baseY - 34}, ${CX + s * (bx + 18)} ${baseY - 14}, ${CX + s * (bx + 8)} ${baseY + 3} Z`,
    ram: (s) =>
      `M ${CX + s * bx} ${baseY} C ${CX + s * (bx + 26)} ${baseY - 10}, ${CX + s * (bx + 32)} ${baseY - 34}, ${CX + s * (bx + 14)} ${baseY - 40}
       C ${CX + s * (bx + 2)} ${baseY - 42}, ${CX + s * (bx - 2)} ${baseY - 28}, ${CX + s * (bx + 8)} ${baseY - 24}
       C ${CX + s * (bx + 20)} ${baseY - 20}, ${CX + s * (bx + 20)} ${baseY - 6}, ${CX + s * (bx + 8)} ${baseY + 3} Z`,
    spiked: (s) =>
      `M ${CX + s * bx} ${baseY} L ${CX + s * (bx + 4)} ${baseY - 34} L ${CX + s * (bx + 12)} ${baseY - 30}
       L ${CX + s * (bx + 10)} ${baseY - 52} L ${CX + s * (bx + 18)} ${baseY - 20} L ${CX + s * (bx + 9)} ${baseY + 3} Z`,
  };

  return (
    <g>
      {([-1, 1] as const).map((s) => (
        <g key={s}>
          <path d={shapes[style](s)} fill={shell} stroke="#1c1712" strokeWidth={1.2} strokeLinejoin="round" />
          <path d={shapes[style](s)} fill={lit} opacity={s === -1 ? 0.4 : 0.12} />
        </g>
      ))}
    </g>
  );
}

function Eyes({ spec }: { spec: PortraitSpec }) {
  const { morph: m, eye, skin, glowEyes } = spec;
  const y = m.eyeY;
  const rx = 8.4 * m.eyeScale;
  const ry = 5.2 * m.eyeScale;

  return (
    <g>
      {([-1, 1] as const).map((s) => {
        const x = CX + s * m.eyeSpread;
        return (
          <g key={s}>
            {/* Socket shadow — deepened by the brow ridge. */}
            <ellipse
              cx={x} cy={y - 1} rx={rx + 3.5} ry={ry + 3.5}
              fill={skin.shadow}
              opacity={0.3 + m.brow * 0.4}
            />

            {glowEyes ? (
              /* No sclera: the whole eye is a lit coal. */
              <>
                <ellipse cx={x} cy={y} rx={rx} ry={ry} fill={eye.iris} />
                <ellipse cx={x} cy={y} rx={rx * 0.62} ry={ry * 0.62} fill={eye.glow ?? eye.iris} opacity={0.95} />
                <ellipse cx={x} cy={y} rx={rx * 1.5} ry={ry * 1.5} fill={eye.glow ?? eye.iris} opacity={0.22} />
              </>
            ) : (
              <>
                <ellipse cx={x} cy={y} rx={rx} ry={ry} fill="#ddd3c4" />
                <ellipse cx={x} cy={y} rx={rx} ry={ry} fill={skin.shadow} opacity={0.22} />
                <circle cx={x + s * 0.6} cy={y} r={ry * 0.86} fill={eye.iris} />
                <circle cx={x + s * 0.6} cy={y} r={ry * 0.4} fill="#0d0a08" />
                {/* Specular dot, upper-left to match the key light. */}
                <circle cx={x + s * 0.6 - 1.8} cy={y - 1.7} r={1.15} fill="#fff" opacity={0.85} />
              </>
            )}

            {/* Upper lid line — the heaviest ink on the face. */}
            <path
              d={`M ${x - rx - 1.5} ${y - 1} Q ${x} ${y - ry - 3.2} ${x + rx + 1.5} ${y - 1}`}
              fill="none" stroke={skin.line} strokeWidth={1.7} strokeLinecap="round"
            />
            <path
              d={`M ${x - rx} ${y + 1.5} Q ${x} ${y + ry + 1.6} ${x + rx} ${y + 1.5}`}
              fill="none" stroke={skin.line} strokeWidth={0.9} opacity={0.55} strokeLinecap="round"
            />
          </g>
        );
      })}
    </g>
  );
}

function Brows({ spec }: { spec: PortraitSpec }) {
  const { morph: m, hair, browAngle } = spec;
  const y = m.eyeY - 11 - m.brow * 3;
  const halfLen = 11 * m.eyeScale;
  const thickness = 2.4 + m.brow * 2.6;

  return (
    <g>
      {([-1, 1] as const).map((s) => {
        const x = CX + s * m.eyeSpread;
        const inner = x - s * halfLen;
        const outer = x + s * halfLen;
        return (
          <path
            key={s}
            d={`M ${inner} ${y + browAngle * 0.28} Q ${x} ${y - 3.4} ${outer} ${y + 2.2}`}
            fill="none"
            stroke={hair.base}
            strokeWidth={thickness}
            strokeLinecap="round"
          />
        );
      })}
    </g>
  );
}

function Nose({ spec }: { spec: PortraitSpec }) {
  const { morph: m, skin } = spec;
  const top = m.eyeY + 4;
  const len = (m.chinY - m.eyeY) * 0.42;
  const bottom = top + len;
  const wide = 5.4 * m.noseScale;

  return (
    <g>
      {/* Bridge shadow on the light-away side. */}
      <path
        d={`M ${CX + 1.5} ${top} L ${CX + wide * 0.7} ${bottom - 3} Q ${CX + wide} ${bottom + 1.5} ${CX + wide * 0.3} ${bottom + 2}`}
        fill="none" stroke={skin.shadow} strokeWidth={2.6} strokeLinecap="round" opacity={0.62}
      />
      {/* Base and nostrils. */}
      <path
        d={`M ${CX - wide} ${bottom} Q ${CX} ${bottom + 3.4} ${CX + wide} ${bottom}`}
        fill="none" stroke={skin.line} strokeWidth={1.5} strokeLinecap="round"
      />
      <ellipse cx={CX - wide * 0.62} cy={bottom - 0.4} rx={1.5} ry={1.05} fill={skin.line} opacity={0.85} />
      <ellipse cx={CX + wide * 0.62} cy={bottom - 0.4} rx={1.5} ry={1.05} fill={skin.line} opacity={0.85} />
    </g>
  );
}

function Mouth({ spec }: { spec: PortraitSpec }) {
  const { morph: m, skin, mouthWidth, mouthCurve } = spec;
  const y = m.chinY - (m.chinY - m.eyeY) * 0.28;
  const half = 11 * mouthWidth;

  return (
    <g>
      <path
        d={`M ${CX - half} ${y} Q ${CX} ${y + mouthCurve} ${CX + half} ${y}`}
        fill="none" stroke={skin.line} strokeWidth={1.9} strokeLinecap="round"
      />
      {/* Lower lip catch-light. */}
      <path
        d={`M ${CX - half * 0.6} ${y + 3.2} Q ${CX} ${y + 5.4} ${CX + half * 0.6} ${y + 3.2}`}
        fill="none" stroke={skin.light} strokeWidth={1.5} opacity={0.32} strokeLinecap="round"
      />
    </g>
  );
}

function Tusks({ spec }: { spec: PortraitSpec }) {
  const { morph: m, mouthWidth } = spec;
  const y = m.chinY - (m.chinY - m.eyeY) * 0.28;
  const half = 11 * mouthWidth;

  /* Anchored at the mouth corners and curving inward as they rise, so they read
     as an underbite rather than as bared teeth. Drawn narrow and ivory-dark —
     a bright fill at this size merges into a single white block. */
  return (
    <g>
      {([-1, 1] as const).map((s) => {
        const bx = CX + s * half * 0.92;
        const tip = y - 11;
        return (
          <g key={s}>
            <path
              d={`M ${bx - s * 2.4} ${y + 2}
                  C ${bx - s * 2.8} ${y - 4}, ${bx - s * 1.6} ${tip + 2}, ${bx + s * 0.4} ${tip}
                  C ${bx + s * 2.2} ${tip + 3}, ${bx + s * 2.6} ${y - 3}, ${bx + s * 2.2} ${y + 2} Z`}
              fill="#cabfa4"
              stroke="#6e6553"
              strokeWidth={0.9}
              strokeLinejoin="round"
            />
            {/* Core shadow along the inner face of each tusk. */}
            <path
              d={`M ${bx - s * 2.4} ${y + 2} C ${bx - s * 2.8} ${y - 4}, ${bx - s * 1.6} ${tip + 2}, ${bx + s * 0.4} ${tip}
                  C ${bx - s * 0.4} ${tip + 4}, ${bx - s * 1.2} ${y - 3}, ${bx - s * 0.6} ${y + 2} Z`}
              fill="#8a8069"
              opacity={0.55}
            />
          </g>
        );
      })}
    </g>
  );
}

function FacialHairLayer({ spec }: { spec: PortraitSpec }) {
  const { morph: m, hair, facialHair } = spec;
  if (facialHair === "none") return null;

  const mouthY = m.chinY - (m.chinY - m.eyeY) * 0.28;
  const jawHingeY = m.eyeY + 26;
  const jw = m.jawW;

  const moustache = (
    <path
      d={`M ${CX - jw * 0.42} ${mouthY - 4} Q ${CX} ${mouthY - 9} ${CX + jw * 0.42} ${mouthY - 4}
          Q ${CX} ${mouthY - 1.5} ${CX - jw * 0.42} ${mouthY - 4} Z`}
      fill="currentColor"
    />
  );

  /* Beards hang below the chin, so length is an overshoot past m.chinY rather
     than an absolute y — that keeps them attached on every race's jaw.
     The top edge sits BELOW the mouth line (mouthY + 7): letting it ride any
     higher swallows the mouth and the whole face reads as bandaged. */
  const beard = (drop: number, width: number) => (
    <path
      d={`M ${CX - jw * width} ${jawHingeY}
          C ${CX - jw * width} ${m.chinY + drop * 0.55}, ${CX - jw * 0.42} ${m.chinY + drop}, ${CX} ${m.chinY + drop}
          C ${CX + jw * 0.42} ${m.chinY + drop}, ${CX + jw * width} ${m.chinY + drop * 0.55}, ${CX + jw * width} ${jawHingeY}
          C ${CX + jw * 0.62} ${mouthY + 7}, ${CX - jw * 0.62} ${mouthY + 7}, ${CX - jw * width} ${jawHingeY} Z`}
      fill="currentColor"
    />
  );

  const layers: Record<Exclude<PortraitSpec["facialHair"], "none">, React.ReactNode> = {
    stubble: (
      <path
        d={`M ${CX - jw * 0.98} ${jawHingeY} C ${CX - jw} ${m.chinY}, ${CX} ${m.chinY + 6}, ${CX} ${m.chinY + 6}
            C ${CX} ${m.chinY + 6}, ${CX + jw} ${m.chinY}, ${CX + jw * 0.98} ${jawHingeY} Z`}
        fill="currentColor" opacity={0.3}
      />
    ),
    moustache,
    goatee: (
      <>
        {moustache}
        <path
          d={`M ${CX - jw * 0.3} ${mouthY + 4} Q ${CX} ${mouthY + 2} ${CX + jw * 0.3} ${mouthY + 4}
              Q ${CX + jw * 0.22} ${m.chinY + 9} ${CX} ${m.chinY + 11}
              Q ${CX - jw * 0.22} ${m.chinY + 9} ${CX - jw * 0.3} ${mouthY + 4} Z`}
          fill="currentColor"
        />
      </>
    ),
    "short-beard": <>{beard(8, 0.82)}{moustache}</>,
    "full-beard": <>{beard(24, 0.86)}{moustache}</>,
    "long-beard": <>{beard(48, 0.88)}{moustache}</>,
    forked: (
      <>
        {/* Body drops deeper than the tails reach, so the fork emerges from
            inside the mass. A shallower body leaves the braids floating below
            the beard, where they read as a second pair of tusks. */}
        {beard(34, 0.86)}
        {moustache}
        {([-1, 1] as const).map((s) => (
          <path
            key={s}
            d={`M ${CX + s * jw * 0.34} ${m.chinY + 18} Q ${CX + s * jw * 0.46} ${m.chinY + 34} ${CX + s * jw * 0.3} ${m.chinY + 50}
                L ${CX + s * jw * 0.06} ${m.chinY + 47} Q ${CX + s * jw * 0.18} ${m.chinY + 33} ${CX + s * jw * 0.1} ${m.chinY + 18} Z`}
            fill="currentColor"
          />
        ))}
      </>
    ),
  };

  /* Paths fill with currentColor so the same geometry can be re-stroked in the
     base, key-light and shadow tones without duplicating the path strings. */
  return (
    <g>
      <g style={{ color: hair.base }}>{layers[facialHair]}</g>
      {/* Key light, clipped to the lit side. A full-coverage screen blend here
          turns pale hair colours into a white mask. */}
      <g style={{ color: hair.light }} opacity={0.26} clipPath="url(#lightSide)">
        {layers[facialHair]}
      </g>
      <g style={{ color: hair.shadow }} opacity={0.32} clipPath="url(#rimSide)">
        {layers[facialHair]}
      </g>
    </g>
  );
}

function HairLayer({ spec, back }: { spec: PortraitSpec; back: boolean }) {
  const { morph: m, hair, hairStyle } = spec;
  if (hairStyle === "bald") return null;

  const crownY = 96 - m.headH;
  const hw = m.headW;

  /* Long styles need a mass behind the shoulders, drawn before the head. */
  if (back) {
    const hasBackMass = hairStyle === "long" || hairStyle === "braids" || hairStyle === "curls" || hairStyle === "wild";
    if (!hasBackMass) return null;

    const drop = hairStyle === "long" ? 96 : hairStyle === "braids" ? 84 : 62;
    return (
      <path
        d={`M ${CX - hw - 4} ${crownY + 26}
            C ${CX - hw - 16} ${crownY + drop * 0.6}, ${CX - hw - 12} ${crownY + drop}, ${CX - hw - 6} ${H}
            L ${CX + hw + 6} ${H}
            C ${CX + hw + 12} ${crownY + drop}, ${CX + hw + 16} ${crownY + drop * 0.6}, ${CX + hw + 4} ${crownY + 26} Z`}
        fill={hair.shadow}
      />
    );
  }

  /*
   * A symmetric cubic from (x0, y) to (x3, y) with both control points at yc
   * reaches its extreme at 0.25*y + 0.75*yc. Solving that for yc is the only
   * way to place a hairline reliably: setting control points "a bit above the
   * crown" by eye puts the curve's actual apex well below the skull, which
   * renders every style as a thin band across the forehead.
   */
  const ctrlFor = (endY: number, targetY: number) => (targetY - 0.25 * endY) / 0.75;

  /**
   * Cap covering the skull.
   * @param widen  outward offset from the skull silhouette
   * @param sideY  where the hair ends down the sides of the head
   * @param peakY  apex of the outer silhouette (should clear crownY)
   * @param fringeY  where the hairline crosses the forehead
   */
  const cap = (widen: number, sideY: number, peakY: number, fringeY: number) => {
    const w = hw + widen;
    const outerC = ctrlFor(sideY, peakY);
    const innerC = ctrlFor(sideY, fringeY);
    return (
      `M ${CX - w} ${sideY} C ${CX - w} ${outerC}, ${CX + w} ${outerC}, ${CX + w} ${sideY} ` +
      `C ${CX + w * 0.5} ${innerC}, ${CX - w * 0.5} ${innerC}, ${CX - w} ${sideY} Z`
    );
  };

  const eyeY = m.eyeY;

  const styles: Record<Exclude<PortraitSpec["hairStyle"], "bald">, string> = {
    /* Side height matters more than it looks: stop the mass above the ear and
       the hair reads as a swim cap sitting on the head rather than growing
       from it. Everything but the tightest crop descends past ear level. */
    cropped: cap(1, eyeY - 2, crownY - 3, crownY + 13),

    short: cap(3, eyeY + 14, crownY - 5, crownY + 21),

    /* Asymmetric sweep: piled on the lit side, tight on the other. */
    swept:
      `M ${CX - hw - 5} ${eyeY + 4} ` +
      `C ${CX - hw - 9} ${ctrlFor(eyeY + 4, crownY - 12)}, ${CX + hw + 4} ${ctrlFor(eyeY + 4, crownY - 6)}, ${CX + hw + 2} ${eyeY - 10} ` +
      `C ${CX + hw * 0.5} ${crownY + 26}, ${CX - hw * 0.1} ${crownY + 30}, ${CX - hw - 5} ${eyeY + 4} Z`,

    long: cap(4, eyeY + 26, crownY - 6, crownY + 22),

    braids: cap(4, eyeY + 18, crownY - 5, crownY + 19),

    /* Tight cap plus a knot rising off the crown. */
    topknot:
      cap(1, eyeY - 2, crownY - 2, crownY + 15) +
      ` M ${CX - 10} ${crownY - 1} C ${CX - 18} ${crownY - 30}, ${CX + 18} ${crownY - 30}, ${CX + 10} ${crownY - 1} Z`,

    /* Spikes struck off the top of a normal cap. Heights and rakes are
       deliberately uneven — evenly spaced points read as a tiara. */
    wild:
      cap(5, eyeY + 16, crownY - 4, crownY + 20) +
      ` M ${CX - hw * 0.82} ${crownY + 8} L ${CX - hw * 1.05} ${crownY - 14} L ${CX - hw * 0.34} ${crownY - 3} Z` +
      ` M ${CX - hw * 0.36} ${crownY - 2} L ${CX - hw * 0.08} ${crownY - 27} L ${CX + hw * 0.16} ${crownY - 6} Z` +
      ` M ${CX + hw * 0.12} ${crownY - 5} L ${CX + hw * 0.46} ${crownY - 19} L ${CX + hw * 0.58} ${crownY - 1} Z` +
      ` M ${CX + hw * 0.55} ${crownY} L ${CX + hw * 1.02} ${crownY - 11} L ${CX + hw * 0.88} ${crownY + 12} Z`,

    /* M-shaped hairline: two temple lobes with bare scalp between them. */
    receding:
      `M ${CX - hw - 1} ${eyeY - 6} ` +
      `C ${CX - hw - 2} ${ctrlFor(eyeY - 6, crownY + 2)}, ${CX + hw + 2} ${ctrlFor(eyeY - 6, crownY + 2)}, ${CX + hw + 1} ${eyeY - 6} ` +
      `C ${CX + hw * 0.62} ${crownY + 20}, ${CX + hw * 0.5} ${crownY + 8}, ${CX + hw * 0.42} ${crownY + 24} ` +
      `C ${CX + hw * 0.2} ${crownY + 14}, ${CX - hw * 0.2} ${crownY + 14}, ${CX - hw * 0.42} ${crownY + 24} ` +
      `C ${CX - hw * 0.5} ${crownY + 8}, ${CX - hw * 0.62} ${crownY + 20}, ${CX - hw - 1} ${eyeY - 6} Z`,

    /* Scalloped silhouette: curl lobes ride on a normal cap and must overlap
       each other, or they read as separate circles balanced on the head. */
    curls:
      cap(5, eyeY + 18, crownY - 2, crownY + 22) +
      ` M ${CX - hw * 0.98} ${crownY + 8} a 12 12 0 1 1 24 0 a 12 12 0 1 1 -24 0 Z` +
      ` M ${CX - hw * 0.52} ${crownY - 3} a 13 13 0 1 1 26 0 a 13 13 0 1 1 -26 0 Z` +
      ` M ${CX + hw * 0.02} ${crownY - 6} a 13 13 0 1 1 26 0 a 13 13 0 1 1 -26 0 Z` +
      ` M ${CX + hw * 0.52} ${crownY + 2} a 12 12 0 1 1 24 0 a 12 12 0 1 1 -24 0 Z`,
  };

  const d = styles[hairStyle];

  return (
    <g>
      <path d={d} fill={hair.base} stroke={hair.shadow} strokeWidth={1.1} strokeLinejoin="round" />
      {/* Key-light sheen from upper-left. */}
      <path d={d} fill={hair.light} opacity={0.3} clipPath="url(#lightSide)" />
    </g>
  );
}

function Marks({ spec }: { spec: PortraitSpec }) {
  const { morph: m, scar, warPaint, earring, skin } = spec;
  const scarColour = "#c9a189";

  return (
    <g>
      {warPaint && (
        <g opacity={0.62}>
          <rect x={CX - m.eyeSpread - 14} y={m.eyeY - 3} width={28} height={5.5} fill="#1d1a17" />
          <rect x={CX + m.eyeSpread - 14} y={m.eyeY - 3} width={28} height={5.5} fill="#1d1a17" />
        </g>
      )}

      {scar === "cheek" && (
        <path d={`M ${CX + m.eyeSpread + 4} ${m.eyeY + 12} L ${CX + m.eyeSpread - 3} ${m.eyeY + 30}`}
              stroke={scarColour} strokeWidth={1.6} opacity={0.75} strokeLinecap="round" />
      )}
      {scar === "brow" && (
        <path d={`M ${CX - m.eyeSpread - 5} ${m.eyeY - 20} L ${CX - m.eyeSpread + 2} ${m.eyeY + 4}`}
              stroke={scarColour} strokeWidth={1.8} opacity={0.8} strokeLinecap="round" />
      )}
      {scar === "cross" && (
        <>
          <path d={`M ${CX - m.eyeSpread - 10} ${m.eyeY - 14} L ${CX - m.eyeSpread + 8} ${m.eyeY + 12}`}
                stroke={scarColour} strokeWidth={1.7} opacity={0.78} strokeLinecap="round" />
          <path d={`M ${CX - m.eyeSpread + 8} ${m.eyeY - 12} L ${CX - m.eyeSpread - 10} ${m.eyeY + 10}`}
                stroke={scarColour} strokeWidth={1.5} opacity={0.68} strokeLinecap="round" />
        </>
      )}
      {scar === "eyepatch" && (
        <g>
          <path d={`M ${CX - m.headW} ${m.eyeY - 16} L ${CX + m.headW} ${m.eyeY - 6}`}
                stroke="#15120f" strokeWidth={3} />
          <ellipse cx={CX - m.eyeSpread} cy={m.eyeY} rx={12.5} ry={10} fill="#15120f" />
          <ellipse cx={CX - m.eyeSpread} cy={m.eyeY} rx={12.5} ry={10} fill="#3a3129" opacity={0.5} />
        </g>
      )}

      {earring && (
        <circle
          cx={CX + m.headW - 1} cy={m.eyeY + 15} r={3.4}
          fill="none" stroke="#c7b377" strokeWidth={1.5}
        />
      )}

      {/* Cold rim light down the right edge — separates the head from the
          background and is the main reason this reads as lit rather than flat. */}
      <path
        d={skullPath(m)}
        fill="none"
        stroke="#8fa4c4"
        strokeWidth={2.2}
        opacity={0.16}
        clipPath="url(#rimSide)"
      />
      <path d={skullPath(m)} fill="none" stroke={skin.line} strokeWidth={1.5} />
    </g>
  );
}

export type PortraitProps = {
  spec: PortraitSpec;
  size?: number;
  className?: string;
  /** Draws the ornate frame and background. Off for tight inline use. */
  framed?: boolean;
};

export function Portrait({ spec, size = 160, className, framed = true }: PortraitProps) {
  const { morph: m, skin, garment } = spec;
  const uid = `p${spec.seed.toString(36)}${spec.race}`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={size}
      height={size * (H / W)}
      className={cn("select-none", className)}
      role="img"
      aria-label={`${spec.gender} ${spec.race} portrait`}
    >
      <defs>
        {/* Light falls from upper-left; these two clips drive every highlight
            and rim in the drawing. */}
        <clipPath id="lightSide">
          <rect x={0} y={0} width={CX} height={H} />
        </clipPath>
        <clipPath id="rimSide">
          <rect x={CX + 12} y={0} width={W} height={H} />
        </clipPath>

        <radialGradient id={`${uid}-bg`} cx="50%" cy="38%" r="72%">
          <stop offset="0%" stopColor="#2a2118" />
          <stop offset="62%" stopColor="#171209" />
          <stop offset="100%" stopColor="#0b0805" />
        </radialGradient>

        <linearGradient id={`${uid}-face`} x1="0%" y1="0%" x2="100%" y2="60%">
          <stop offset="0%" stopColor={skin.light} />
          <stop offset="46%" stopColor={skin.base} />
          <stop offset="100%" stopColor={skin.shadow} />
        </linearGradient>
      </defs>

      {framed && <rect width={W} height={H} fill={`url(#${uid}-bg)`} />}

      {/* Hair mass behind everything. */}
      <HairLayer spec={spec} back />

      {/* Shoulders and garment. */}
      <path
        d={`M ${CX - 86} ${H} C ${CX - 78} ${H - 46}, ${CX - m.neckW - 16} ${H - 62}, ${CX - m.neckW - 4} ${H - 68}
            L ${CX + m.neckW + 4} ${H - 68} C ${CX + m.neckW + 16} ${H - 62}, ${CX + 78} ${H - 46}, ${CX + 86} ${H} Z`}
        fill={garment.base}
      />
      <path
        d={`M ${CX - 86} ${H} C ${CX - 78} ${H - 46}, ${CX - m.neckW - 16} ${H - 62}, ${CX - m.neckW - 4} ${H - 68}
            L ${CX - m.neckW + 6} ${H - 68} C ${CX - 52} ${H - 50}, ${CX - 58} ${H - 26}, ${CX - 60} ${H} Z`}
        fill={garment.light} opacity={0.6}
      />
      {/* Collar trim. */}
      <path
        d={`M ${CX - m.neckW - 6} ${H - 66} Q ${CX} ${H - 52} ${CX + m.neckW + 6} ${H - 66}`}
        fill="none" stroke={garment.trim} strokeWidth={3} strokeLinecap="round"
      />

      {/* Neck, drawn before the head so the jaw overlaps it. */}
      <path
        d={`M ${CX - m.neckW} ${m.chinY - 16} L ${CX - m.neckW} ${H - 62} L ${CX + m.neckW} ${H - 62} L ${CX + m.neckW} ${m.chinY - 16} Z`}
        fill={skin.base}
      />
      <path
        d={`M ${CX - m.neckW} ${m.chinY - 16} L ${CX - m.neckW} ${H - 62} L ${CX + m.neckW} ${H - 62} L ${CX + m.neckW} ${m.chinY - 16} Z`}
        fill={skin.shadow} opacity={0.55}
      />

      <Ear m={m} side={-1} skin={skin} />
      <Ear m={m} side={1} skin={skin} />

      {/* Skull. */}
      <path d={skullPath(m)} fill={`url(#${uid}-face)`} />
      {/* Brow-ridge shadow across the upper face. */}
      <path
        d={`M ${CX - m.headW} ${m.eyeY - 14} Q ${CX} ${m.eyeY - 26} ${CX + m.headW} ${m.eyeY - 14}
            L ${CX + m.headW} ${m.eyeY - 4} Q ${CX} ${m.eyeY - 14} ${CX - m.headW} ${m.eyeY - 4} Z`}
        fill={skin.shadow} opacity={m.brow * 0.5}
      />

      {spec.horns && <Horns style={spec.horns} m={m} />}

      <Brows spec={spec} />
      <Eyes spec={spec} />
      <Nose spec={spec} />
      <Mouth spec={spec} />
      {spec.tusks && <Tusks spec={spec} />}
      <FacialHairLayer spec={spec} />
      <HairLayer spec={spec} back={false} />
      <Marks spec={spec} />

      {framed && (
        <>
          {/* Vignette, then a gold inner rule. */}
          <rect width={W} height={H} fill="none" stroke="#000" strokeWidth={14} opacity={0.5} />
          <rect x={3} y={3} width={W - 6} height={H - 6} fill="none" stroke="#3d3227" strokeWidth={2} />
          <rect x={6} y={6} width={W - 12} height={H - 12} fill="none" stroke="#c7b377" strokeWidth={1} opacity={0.45} />
        </>
      )}
    </svg>
  );
}

/** Convenience wrapper for callers that hold a seed rather than a spec. */
export function PortraitFromSeed({
  race,
  gender,
  seed,
  ...rest
}: { race: RaceId; gender: GenderId; seed: number } & Omit<PortraitProps, "spec">) {
  return <Portrait spec={generatePortrait(race, gender, seed)} {...rest} />;
}
