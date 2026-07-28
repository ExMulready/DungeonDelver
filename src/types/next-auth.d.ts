import type { DefaultSession } from "next-auth";

/**
 * Adds the database user id to the session.
 *
 * Auth.js's default session carries name/email/image but no id, and every
 * ownership check in this app is keyed on the id — so without this the app
 * would have to look the user up by email on each request.
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
  }
}

export {};
