import "server-only";
import { adminClient } from "@/lib/supabase/server";
import { seal, unseal } from "./crypto";
import type { GoogleTokens } from "./session";

/**
 * Live mode keeps each member's Google Calendar tokens in the database
 * (oauth_tokens), sealed with AES-256-GCM using SESSION_SECRET, so they work
 * on any device and can be revoked. Nobody but server code can read the table.
 */
export async function loadGoogleTokens(memberId: string): Promise<GoogleTokens | null> {
  const db = adminClient();
  if (!db) return null;
  const { data } = await db
    .from("oauth_tokens")
    .select("refresh_token_enc")
    .eq("member_id", memberId)
    .eq("provider", "google")
    .maybeSingle();
  const sealed = (data as { refresh_token_enc: string | null } | null)?.refresh_token_enc;
  return sealed ? unseal<GoogleTokens>(sealed) : null;
}

export async function saveGoogleTokens(memberId: string, tokens: GoogleTokens) {
  const db = adminClient();
  if (!db) throw new Error("No database configured");
  const { error } = await db.from("oauth_tokens").upsert({
    member_id: memberId,
    provider: "google",
    refresh_token_enc: seal(tokens),
    scopes: tokens.scope,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(`Saving Google tokens: ${error.message}`);
  await db.from("members").update({ calendar_connected: tokens.scope.includes("calendar") }).eq("id", memberId);
}
