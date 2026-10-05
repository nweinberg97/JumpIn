import { NextResponse } from "next/server";
import { clearSession } from "@/server/session";

export function POST() {
  const response = NextResponse.json({ ok: true });
  clearSession(response);
  return response;
}
