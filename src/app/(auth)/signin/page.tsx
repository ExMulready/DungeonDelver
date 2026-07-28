import Link from "next/link";
import type { Metadata } from "next";
import { isGoogleEnabled } from "@/auth";
import { AuthCard } from "@/components/auth/AuthCard";
import { SignInForm } from "./SignInForm";

export const metadata: Metadata = { title: "Enter the Gate" };

/* Reads env at request time to decide whether Google is offered. */
export const dynamic = "force-dynamic";

export default function SignInPage() {
  return (
    <AuthCard
      title="Enter the Gate"
      subtitle="The chronicle remembers you."
      footer={
        <>
          No soul yet?{" "}
          <Link href="/signup" className="text-gold hover:text-gold-bright underline">
            Forge one
          </Link>
        </>
      }
    >
      <SignInForm googleEnabled={isGoogleEnabled} />
    </AuthCard>
  );
}
