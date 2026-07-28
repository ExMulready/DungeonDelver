import type { Metadata } from "next";
import Link from "next/link";
import { Panel } from "@/components/ui/Panel";
import { Divider } from "@/components/ui/Divider";
import { OrnateButton } from "@/components/ui/OrnateButton";

export const metadata: Metadata = { title: "No Signal" };

/** Served by the service worker when a navigation fails while offline. */
export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-5 py-14">
      <Panel ornate className="max-w-md text-center">
        <h1 className="text-2xl">The Candle Gutters</h1>
        <Divider className="my-5" />
        <p className="text-ash text-sm leading-relaxed italic">
          You are offline, and the narrator cannot be reached from here. Scenes
          you have already read are kept; new ones need a connection.
        </p>
        <Link href="/campaigns" className="mt-6 inline-block">
          <OrnateButton>Try again</OrnateButton>
        </Link>
      </Panel>
    </main>
  );
}
