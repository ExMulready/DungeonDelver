import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

/**
 * Route protection. Next 16 renamed the `middleware` file convention to
 * `proxy`; the behaviour is unchanged.
 *
 * Uses the edge-safe half of the Auth.js config — authConfig carries no adapter
 * and no providers, so neither the Postgres driver nor any crypto reaches the
 * edge bundle. The rules themselves live in its `authorized` callback.
 */
const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  /* Skip Next internals, the auth API itself, and anything with a file
     extension — matching those would break OAuth callbacks and static assets. */
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.).*)"],
};
