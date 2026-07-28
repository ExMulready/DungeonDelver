import Link from "next/link";
import type { Metadata } from "next";
import { isGoogleEnabled } from "@/auth";
import { AuthCard } from "@/components/auth/AuthCard";
import { SignUpForm } from "./SignUpForm";

export const metadata: Metadata = { title: "Forge a Soul" };

export const dynamic = "force-dynamic";

export default function SignUpPage() {
  return (
    <AuthCard
      title="Forge a Soul"
      subtitle="Every chronicle needs someone foolish enough to start it."
      footer={
        <>
          Already bound?{" "}
          <Link href="/signin" className="text-gold hover:text-gold-bright underline">
            Enter the gate
          </Link>
        </>
      }
    >
      <SignUpForm googleEnabled={isGoogleEnabled} />
    </AuthCard>
  );
}
