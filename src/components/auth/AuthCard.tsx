import Link from "next/link";
import { Panel } from "@/components/ui/Panel";
import { Divider } from "@/components/ui/Divider";

/** Shared chrome for the sign-in and sign-up screens. */
export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-5 py-14">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-8 block text-center text-3xl font-black tracking-wide"
        >
          Dungeon<span className="text-gold-dim">Delver</span>
        </Link>

        <Panel ornate className="px-7 py-8">
          <h1 className="text-center text-2xl">{title}</h1>
          <p className="text-ash mt-2 text-center text-sm italic">{subtitle}</p>

          <Divider className="my-6" />

          {children}
        </Panel>

        <p className="text-ash mt-6 text-center text-sm">{footer}</p>
      </div>
    </main>
  );
}

/** Google's mark, inlined — an external image would break the CSP and offline. */
export function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
      <path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-3.2-.4-4.7H24v8.9h11.8c-.5 2.7-2 5-4.4 6.6v5.5h7.1c4.2-3.8 6.6-9.5 6.6-16.3z" />
      <path fill="#34A853" d="M24 46c6 0 11-2 14.6-5.3l-7.1-5.5c-2 1.3-4.5 2.1-7.5 2.1-5.8 0-10.6-3.9-12.4-9.1H4.3v5.7C7.9 41.1 15.4 46 24 46z" />
      <path fill="#FBBC05" d="M11.6 28.2c-.5-1.3-.7-2.8-.7-4.2s.3-2.9.7-4.2v-5.7H4.3C2.8 17 2 20.4 2 24s.8 7 2.3 9.9l7.3-5.7z" />
      <path fill="#EA4335" d="M24 10.7c3.3 0 6.2 1.1 8.5 3.3l6.3-6.3C35 4.1 30 2 24 2 15.4 2 7.9 6.9 4.3 14.1l7.3 5.7c1.8-5.2 6.6-9.1 12.4-9.1z" />
    </svg>
  );
}
