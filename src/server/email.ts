import "server-only";
import type { Email } from "@/lib/emails/templates";
import { adminClient } from "@/lib/supabase/server";
import { env } from "./env";

/**
 * Sending email through Resend's REST API (no SDK needed). Templates live in
 * src/lib/emails/templates.ts. Mail comes from a JumpIn address, so nobody's
 * personal email is exposed to anyone else. Everything here is a no-op
 * error until RESEND_API_KEY and INVITE_FROM_EMAIL are set.
 */

export {
  connectorEmail,
  introducedNoticeEmail,
  introJoinedEmail,
  inviteEmail,
  launchEmail,
  waitlistEmail,
  warmIntroEmail as introEmail,
  welcomeEmail,
} from "@/lib/emails/templates";

export async function sendEmail(message: { to: string; subject: string; html: string; text: string }) {
  const cfg = env.email();
  if (!cfg) throw new Error("Email is not configured");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${cfg.apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({ from: cfg.from, to: [message.to], subject: message.subject, html: message.html, text: message.text }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()) as { id: string };
}

/**
 * Send a one-off email to a member at most once (e.g. "welcome"), recorded in
 * email_log. Never throws: a missing email setup or a failed send just means
 * no email, and a failed send can be retried later. Returns true if sent.
 */
export async function sendOnce(memberId: string, kind: string, to: string | null, email: Email): Promise<boolean> {
  if (!to || !env.email()) return false;
  const db = adminClient();
  if (!db) return false;
  const claimed = await db.from("email_log").insert({ member_id: memberId, kind }).select("member_id").maybeSingle();
  if (claimed.error || !claimed.data) return false; // already sent (unique) or no table yet
  try {
    await sendEmail({ to, ...email });
    return true;
  } catch (err) {
    console.error(`[email] ${kind} to ${memberId} failed`, err);
    await db.from("email_log").delete().eq("member_id", memberId).eq("kind", kind);
    return false;
  }
}

/** Send without throwing (for side notifications that shouldn't fail a request). */
export async function sendQuietly(to: string | null, email: Email) {
  if (!to || !env.email()) return false;
  try {
    await sendEmail({ to, ...email });
    return true;
  } catch (err) {
    console.error("[email] send failed", err);
    return false;
  }
}

/** Up to 100 emails per call (Resend's batch limit); larger lists are chunked. */
export async function sendBatch(messages: Array<{ to: string; subject: string; html: string; text: string }>) {
  const cfg = env.email();
  if (!cfg) throw new Error("Email is not configured");
  let sent = 0;
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100).map((m) => ({ from: cfg.from, to: [m.to], subject: m.subject, html: m.html, text: m.text }));
    const res = await fetch("https://api.resend.com/emails/batch", {
      method: "POST",
      headers: { authorization: `Bearer ${cfg.apiKey}`, "content-type": "application/json" },
      body: JSON.stringify(chunk),
    });
    if (!res.ok) throw new Error(`Resend ${res.status} after ${sent} sent: ${(await res.text()).slice(0, 200)}`);
    sent += chunk.length;
  }
  return sent;
}
