import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe half of the Auth.js configuration.
 *
 * Middleware runs on the Edge runtime, where neither the Postgres driver nor
 * the native argon2 binding can load. Keeping the route-protection rules in a
 * separate object — with no adapter and no providers — is the standard Auth.js
 * v5 split, and it is what lets middleware check a session without dragging the
 * whole database layer into the edge bundle.
 *
 * The full configuration, including the adapter and credentials provider, lives
 * in src/auth.ts and only ever runs in Node.
 */

/** Everything under these prefixes requires a signed-in user. */
const PROTECTED_PREFIXES = ["/campaigns", "/characters", "/play"];

export const authConfig = {
  pages: {
    signIn: "/signin",
    error: "/signin",
  },
  session: {
    /* Required: the credentials provider is incompatible with database
       sessions, so the whole app uses JWT sessions. */
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 30,
  },
  callbacks: {
    authorized({ auth, request }) {
      const signedIn = Boolean(auth?.user);
      const { pathname } = request.nextUrl;

      if (PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))) {
        return signedIn;
      }

      /* Already signed in and heading for the gate — send them inside. */
      if (signedIn && (pathname === "/signin" || pathname === "/signup")) {
        return Response.redirect(new URL("/campaigns", request.nextUrl));
      }

      return true;
    },

    jwt({ token, user }) {
      /* `user` is only present on the sign-in pass; persist the id so the
         session callback can read it on every subsequent request. */
      if (user) token.id = user.id;
      return token;
    },

    session({ session, token }) {
      if (token.id && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
