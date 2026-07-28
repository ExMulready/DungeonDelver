import Link from "next/link";
import { OrnateButton } from "@/components/ui/OrnateButton";
import { Divider } from "@/components/ui/Divider";

/** Embers drifting up from the bottom of the screen. Pure decoration. */
function Embers() {
  const embers = Array.from({ length: 14 }, (_, i) => ({
    left: `${(i * 7.3 + 4) % 100}%`,
    delay: `${(i * 1.7) % 14}s`,
    duration: `${11 + ((i * 3) % 7)}s`,
    size: 1 + (i % 3),
  }));

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      {embers.map((e, i) => (
        <span
          key={i}
          className="absolute bottom-0 rounded-full bg-gold-dim animate-ember"
          style={{
            left: e.left,
            width: e.size,
            height: e.size,
            animationDelay: e.delay,
            animationDuration: e.duration,
            boxShadow: "0 0 6px rgba(199,179,119,0.8)",
          }}
        />
      ))}
    </div>
  );
}

export default function TitleScreen() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center px-6 py-16">
      <Embers />

      <div className="relative flex w-full max-w-2xl flex-col items-center text-center">
        <p className="label-engraved animate-flicker mb-6">
          Sanctuary awaits the foolish
        </p>

        <h1 className="text-5xl leading-tight font-black sm:text-7xl">
          <span className="block">Dungeon</span>
          <span className="text-gold-dim -mt-2 block text-4xl sm:text-6xl">
            Delver
          </span>
        </h1>

        <Divider className="my-8 w-64" />

        <p className="text-ash max-w-md text-base leading-relaxed italic">
          No two descents are alike. The chronicle is written as you walk it, and
          what you leave behind is remembered.
        </p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link href="/signin">
            <OrnateButton size="lg" className="w-56">
              Enter the Gate
            </OrnateButton>
          </Link>
          <Link href="/signup">
            <OrnateButton size="lg" variant="blood" className="w-56">
              Forge a Soul
            </OrnateButton>
          </Link>
        </div>

        <p className="label-engraved mt-14 opacity-60">
          A tale told by a machine that does not forget
        </p>
      </div>
    </main>
  );
}
