"use server";

import { eq } from "drizzle-orm";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { hashPassword } from "@/lib/auth/password";
import { signUpSchema, signInSchema } from "@/lib/auth/schemas";
import { signIn } from "@/auth";

export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

/** Flattens a zod error into the shape the forms render. */
function fieldErrorsFrom(issues: { path: PropertyKey[]; message: string }[]) {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

export async function registerAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = signUpSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }

  const { name, email, password } = parsed.data;

  const existing = await db
    .select({ id: users.id, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing.length > 0) {
    /* Deliberately specific. An account-existence oracle matters on sign-in,
       where an attacker probes addresses; on registration the address is
       already known to whoever is typing it, and staying vague here just
       strands people who forgot they had signed up with Google. */
    const viaGoogleOnly = !existing[0].passwordHash;
    return {
      error: viaGoogleOnly
        ? "That email is already registered through Google. Sign in with Google instead."
        : "That email is already registered. Sign in instead.",
    };
  }

  const passwordHash = await hashPassword(password);

  await db.insert(users).values({ name, email, passwordHash });

  /* Sign in immediately so registration lands the player in the game rather
     than back at the gate. redirectTo is handled by the redirect below. */
  await signIn("credentials", {
    email,
    password,
    redirect: false,
  });

  redirect("/campaigns");
}

export async function loginAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      /* One message for every failure mode, so this cannot be used to test
         which addresses have accounts. */
      return { error: "That email and password do not match." };
    }
    throw err;
  }

  redirect("/campaigns");
}

export async function googleSignInAction() {
  await signIn("google", { redirectTo: "/campaigns" });
}
