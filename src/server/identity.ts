import "server-only";
import type { NextRequest } from "next/server";
import { LIVE } from "@/lib/supabase/config";
import { adminClient, serverClient } from "@/lib/supabase/server";
import { readSession } from "./session";

/**
 * Who is making this request, whichever sign-in is in use:
 *  live → the Supabase session (id = the member's id in the database)
 *  else → the prototype's encrypted cookie session
 */
export interface Identity {
  id: string;
  name: string;
  email?: string;
  picture?: string;
  emailVerified: boolean;
  live: boolean;
}

export async function identify(request: NextRequest): Promise<Identity | null> {
  if (LIVE) {
    const supabase = await serverClient();
    const { data } = (await supabase?.auth.getClaims()) ?? { data: null };
    const claims = data?.claims as Record<string, unknown> | undefined;
    const id = typeof claims?.sub === "string" ? claims.sub : null;
    if (!id) return null;
    const meta = (claims?.user_metadata ?? {}) as Record<string, unknown>;
    const str = (v: unknown) => (typeof v === "string" && v ? v : undefined);
    const email = str(claims?.email);
    // The name and photo people see are the ones they curated on their profile.
    const profile = await memberCard(id);
    return {
      id,
      name: profile?.name ?? str(meta.full_name) ?? str(meta.name) ?? "A JumpIn member",
      email,
      picture: profile?.avatarUrl ?? str(meta.avatar_url) ?? str(meta.picture),
      emailVerified: true, // Google and LinkedIn only issue verified addresses
      live: true,
    };
  }
  const session = readSession(request);
  if (!session) return null;
  return {
    id: session.profile.sub,
    name: session.profile.name,
    email: session.profile.email,
    picture: session.profile.picture,
    emailVerified: session.profile.emailVerified !== false,
    live: false,
  };
}

/** Name, photo and headline for a member, read with the secret key. */
export async function memberCard(id: string) {
  const db = adminClient();
  if (!db) return null;
  const { data } = await db.from("members").select("id, name, avatar_url, headline").eq("id", id).maybeSingle();
  if (!data) return null;
  const row = data as { id: string; name: string; avatar_url: string | null; headline: string };
  return { id: row.id, name: row.name, avatarUrl: row.avatar_url ?? undefined, headline: row.headline };
}

/** The founder's accounts: ADMIN_EMAILS, comma-separated. */
export function isAdminEmail(email: string | undefined) {
  if (!email) return false;
  const admins = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return admins.includes(email.trim().toLowerCase());
}

/**
 * Are calls open for this person? Before launch only the founder can start
 * calls (to test); everyone else waits for the countdown.
 */
export async function callsOpenFor(identity: Identity): Promise<boolean> {
  if (!identity.live) return true;
  if (isAdminEmail(identity.email)) return true;
  const db = adminClient();
  if (!db) return false;
  const { data } = await db.rpc("is_launched");
  return data === true;
}
