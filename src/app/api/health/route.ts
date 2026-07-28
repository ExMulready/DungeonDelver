import { NextResponse } from "next/server";

/** Liveness probe for the Docker HEALTHCHECK. Deliberately touches nothing. */
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ status: "ok", service: "dungeondelver" });
}
