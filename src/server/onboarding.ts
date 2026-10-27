import "server-only";
import { createHash } from "node:crypto";
import type { User } from "@supabase/supabase-js";
import { base64UrlDecode } from "@/lib/invite";
import type { IntroPayload } from "@/lib/intro";
import { adminClient } from "@/lib/supabase/server";
import { verify } from "./crypto";
import { introJoinedEmail, sendOnce, sendQuietly, waitlistEmail, welcomeEmail } from "./email";
import { emailForMember } from "./memberDirectory";

/** Holds a warm intro link between clicking "Join" and finishing sign-in. */
export const INTRO_COOKIE = "jumpin_intro";

/** A signed, unexpired warm intro token, or null. */
export function checkIntroToken(token: string | undefined | null): IntroPayload | null {
  if (!token) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature || signature === "demo" || !verify(body, signature)) return null;
  try {
    const payload = JSON.parse(base64UrlDecode(body)) as IntroPayload;
    return Date.parse(payload.expiresAt) > Date.now() ? payload : null;
  } catch {
    return null;
  }
}

/** "Monday, November 2 at 10:00 AM", in the member's own timezone. */
export function launchLabel(launchAt: string | null, timeZone?: string) {
  if (!launchAt) return null;
  try {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: timeZone || "America/Vancouver",
      timeZoneName: "short",
    }).format(Date.parse(launchAt));
  } catch {
    return null;
  }
}

/** Send the "you're in" email (once), with the launch date in their timezone. */
export async function sendWelcome(memberId: string, appUrl: string, invitedBy?: string | null) {
  const db = adminClient();
  if (!db) return false;
  const [member, launch] = await Promise.all([
    db.from("members").select("name, timezone").eq("id", memberId).maybeSingle(),
    db.from("launch_settings").select("launch_at, opened_at").maybeSingle(),
  ]);
  const m = member.data as { name: string; timezone: string } | null;
  const l = launch.data as { launch_at: string | null; opened_at: string | null } | null;
  if (!m) return false;
  const label = l?.opened_at ? null : launchLabel(l?.launch_at ?? null, m.timezone);
  return sendOnce(memberId, "welcome", await emailForMember(memberId), welcomeEmail({ name: m.name, appUrl, launchLabel: label, invitedBy }));
}

/**
 * Everything that happens right after a real sign-in, in order:
 *  1. Signed in with LinkedIn → Verified badge.
 *  2. Arrived through a warm intro (cookie) → redeem it if their email
 *     matches: approved straight away, welcome email, and the Connector
 *     hears that it worked.
 *  3. Otherwise, still waiting → the "you're on the list" email, once.
 * Never throws: sign-in must not fail because of email or bookkeeping.
 */
export async function afterSignIn(user: User, introToken: string | undefined, appUrl: string, demoUrl: string) {
  const db = adminClient();
  if (!db) return;
  try {
    if (user.app_metadata?.provider === "linkedin_oidc") {
      await db.from("members").update({ verified: true }).eq("id", user.id);
    }

    const intro = checkIntroToken(introToken);
    if (intro && introToken) {
      const hash = createHash("sha256").update(introToken).digest("hex");
      const { data: introId } = await db.rpc("redeem_warm_intro", { token_sha256: hash, new_member: user.id });
      if (introId) {
        const { data: row } = await db
          .from("warm_intros")
          .select("introducer_id, subject_id, members!warm_intros_introducer_id_fkey(name)")
          .eq("id", introId as string)
          .maybeSingle();
        const r = row as { introducer_id: string; members: { name: string } | null } | null;
        const connectorName = r?.members?.name ?? intro.fromName;
        await sendWelcome(user.id, appUrl, connectorName);
        if (r) {
          const { data: me } = await db.from("members").select("name").eq("id", user.id).maybeSingle();
          await sendQuietly(
            await emailForMember(r.introducer_id),
            introJoinedEmail({
              connectorName,
              newName: (me as { name: string } | null)?.name ?? intro.recipientName,
              subjectName: intro.subject.name,
              appUrl,
            }),
          );
        }
        return;
      }
    }

    const { data: membership } = await db.from("memberships").select("status").eq("member_id", user.id).maybeSingle();
    if ((membership as { status: string } | null)?.status === "waitlisted") {
      const { data: me } = await db.from("members").select("name").eq("id", user.id).maybeSingle();
      await sendOnce(
        user.id,
        "waitlist",
        await emailForMember(user.id),
        waitlistEmail({ name: (me as { name: string } | null)?.name ?? "", appUrl, demoUrl }),
      );
    }
  } catch (err) {
    console.error("[onboarding] after sign-in", err);
  }
}
