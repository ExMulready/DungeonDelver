import type { Metadata } from "next";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { CharacterForge } from "./CharacterForge";

export const metadata: Metadata = { title: "Forge a Character" };
export const dynamic = "force-dynamic";

export default async function NewCharacterPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  return <CharacterForge />;
}
