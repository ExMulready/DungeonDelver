import NextAuth from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { eq } from "drizzle-orm";

import { authConfig } from "@/auth.config";
import { db } from "@/lib/db";
import { users, accounts, sessions, verificationTokens } from "@/lib/db/schema";
import { verifyPassword } from "@/lib/auth/password";
import { signInSchema } from "@/lib/auth/schemas";

/**
 * Full Auth.js configuration. Node runtime only — it pulls in the Postgres
 * driver and the native argon2 binding. Middleware uses authConfig instead.
 */

const googleConfigured =
  Boolean(process.env.AUTH_GOOGLE_ID) && Boolean(process.env.AUTH_GOOGLE_SECRET);

/* Lazy config factory rather than a plain object. DrizzleAdapter inspects the
   database instance the moment it is called, which forces a connection; as a
   module-scope call that happens while `next build` collects page data, making
   a database URL a build-time requirement for a build that never queries
   anything. Deferring construction to the request keeps the adapter identical
   and lets the build run with no environment at all. */
export const { handlers, auth, signIn, signOut } = NextAuth(() => ({
  ...authConfig,

  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),

  providers: [
    /* Registered only when credentials exist. Listing it unconditionally makes
       Auth.js throw on the sign-in page whenever Google is left unconfigured,
       which would block the email/password path too. */
    ...(googleConfigured
      ? [
          Google({
            clientId: process.env.AUTH_GOOGLE_ID!,
            clientSecret: process.env.AUTH_GOOGLE_SECRET!,
            /* Someone who registered with a password and later clicks "Sign in
               with Google" should land on the same account. Safe here because
               Google verifies its own addresses; it would not be with a
               provider that does not. */
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),

    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = signInSchema.safeParse(raw);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const found = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        const user = found[0];

        /* A missing user and a Google-only account (null passwordHash) both
           fall through to the same generic failure — distinguishing them would
           turn this endpoint into an account-existence oracle. */
        if (!user?.passwordHash) return null;

        const ok = await verifyPassword(user.passwordHash, password);
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
}));

/** True when Google sign-in should be offered in the UI. */
export const isGoogleEnabled = googleConfigured;
