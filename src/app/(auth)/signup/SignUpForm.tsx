"use client";

import { useActionState } from "react";
import { registerAction, googleSignInAction, type FormState } from "@/lib/auth/actions";
import { Input } from "@/components/ui/Input";
import { OrnateButton } from "@/components/ui/OrnateButton";
import { GoogleMark } from "@/components/auth/AuthCard";

const EMPTY: FormState = {};

export function SignUpForm({ googleEnabled }: { googleEnabled: boolean }) {
  const [state, action, pending] = useActionState(registerAction, EMPTY);

  return (
    <div className="space-y-5">
      {googleEnabled && (
        <>
          <form action={googleSignInAction}>
            <OrnateButton type="submit" size="lg" className="w-full">
              <GoogleMark />
              Continue with Google
            </OrnateButton>
          </form>

          <div className="flex items-center gap-3">
            <span className="bg-bevel h-px flex-1" />
            <span className="label-engraved">or</span>
            <span className="bg-bevel h-px flex-1" />
          </div>
        </>
      )}

      <form action={action} className="space-y-4">
        <Input
          name="name"
          label="Name"
          autoComplete="name"
          maxLength={60}
          required
          error={state.fieldErrors?.name}
        />
        <Input
          name="email"
          type="email"
          label="Email"
          autoComplete="email"
          required
          error={state.fieldErrors?.email}
        />
        <Input
          name="password"
          type="password"
          label="Password"
          autoComplete="new-password"
          minLength={10}
          required
          error={state.fieldErrors?.password}
        />
        <p className="text-ash text-xs italic">
          At least 10 characters. Length beats punctuation.
        </p>

        {state.error && (
          <p
            role="alert"
            className="border-blood/50 bg-blood/10 text-blood-bright border px-3 py-2 text-sm"
          >
            {state.error}
          </p>
        )}

        <OrnateButton type="submit" size="lg" className="w-full" busy={pending}>
          {pending ? "Binding…" : "Forge"}
        </OrnateButton>
      </form>
    </div>
  );
}
