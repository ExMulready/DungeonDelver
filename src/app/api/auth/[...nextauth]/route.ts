import { handlers } from "@/auth";

/* Node runtime: this path loads the Drizzle adapter and the native argon2
   binding, neither of which runs on Edge. */
export const runtime = "nodejs";

export const { GET, POST } = handlers;
