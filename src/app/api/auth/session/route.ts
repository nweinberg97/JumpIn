import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/server/env";
import { publicSession, readSession } from "@/server/session";

export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  if (!env.sessionSecret()) return NextResponse.json({ session: null });
  const data = readSession(request);
  return NextResponse.json({ session: data ? publicSession(data) : null });
}
