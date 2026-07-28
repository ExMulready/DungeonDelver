import { RACES, GENDERS } from "@/lib/game/srd";
import { generatePortrait } from "@/lib/portraits/spec";
import { Portrait } from "@/components/portrait/Portrait";

/**
 * Development-only contact sheet for the portrait generator.
 *
 * Renders every race against every gender across a fixed seed row, which makes
 * regressions in the morph table obvious at a glance. Not linked from anywhere
 * in the app; visit /dev/portraits directly.
 */

const SEEDS = [1, 7, 42, 99, 1337, 8675309, 271828, 31415];

export default function PortraitContactSheet() {
  return (
    <main className="mx-auto max-w-[1400px] px-6 py-12">
      <h1 className="mb-2 text-3xl font-bold">Portrait Contact Sheet</h1>
      <p className="text-ash mb-10 text-sm italic">
        Every race by gender across {SEEDS.length} fixed seeds. Faces here must
        stay stable — if a change to spec.ts alters these, existing characters
        changed face too.
      </p>

      {RACES.map((race) => (
        <section key={race.id} className="mb-14">
          <h2 className="mb-1 text-2xl">{race.name}</h2>
          <p className="text-ash mb-5 text-sm italic">{race.blurb}</p>

          {GENDERS.map((gender) => (
            <div key={gender.id} className="mb-6">
              <p className="label-engraved mb-2">{gender.name}</p>
              <div className="flex flex-wrap gap-3">
                {SEEDS.map((seed) => (
                  <div key={seed} className="flex flex-col items-center gap-1">
                    <Portrait
                      spec={generatePortrait(race.id, gender.id, seed)}
                      size={120}
                    />
                    <span className="text-ash text-[10px] tabular-nums">{seed}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      ))}
    </main>
  );
}
