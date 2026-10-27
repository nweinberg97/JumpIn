import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { adminClient } from "@/lib/supabase/server";
import { identify, isAdminEmail, type Identity } from "./identity";

/**
 * Founder-only routes: signed in with an email listed in ADMIN_EMAILS.
 * Returns the identity and a secret-key database client, or the error
 * response to send.
 */
export async function requireAdmin(
  request: NextRequest,
): Promise<{ me: Identity; db: SupabaseClient } | { error: NextResponse }> {
  const db = adminClient();
  if (!db) {
    return { error: NextResponse.json({ error: "Connect the database first", code: "not_configured" }, { status: 501 }) };
  }
  const me = await identify(request);
  if (!me || !isAdminEmail(me.email)) {
    return { error: NextResponse.json({ error: "Founder only", code: "forbidden" }, { status: 403 }) };
  }
  return { me, db };
}
