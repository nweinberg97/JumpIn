import { NextResponse } from "next/server";
import { integrationStatus } from "@/server/env";

export const dynamic = "force-dynamic";

/** Booleans only: which providers are configured. Never returns secrets. */
export function GET() {
  return NextResponse.json(integrationStatus());
}
