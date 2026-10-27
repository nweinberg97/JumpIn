import { NextResponse, type NextRequest } from "next/server";
import { INTRO_TTL_MS, isEmail, type IntroPayload, type IntroProfile } from "@/lib/intro";
import { base64UrlEncode } from "@/lib/invite";
import { sign } from "@/server/crypto";
import { introEmail, sendEmail } from "@/server/email";
import { env, integrationStatus, isConnectorEmail, originFor } from "@/server/env";
import { deliverableEmailFor } from "@/server/memberDirectory";
import { take } from "@/server/rateLimit";
import { readSession } from "@/server/session";

export const dynamic = "force-dynamic";

const ID = /^[A-Za-z0-9_-]{1,64}$/;

interface IntroRequest {
  introId: string;
  subject: IntroProfile;
  recipient: { kind: "member"; memberId: string; name: string } | { kind: "email"; email: string; name: string };
  note: string;
}

const str = (v: unknown, max: number, required = true): string | null | undefined => {
  if (v === undefined || v === null || v === "") return required ? null : undefined;
  return typeof v === "string" && v.trim() && v.length <= max ? v.trim() : null;
};

function parse(body: unknown): IntroRequest | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const s = (b.subject ?? {}) as Record<string, unknown>;
  const r = (b.recipient ?? {}) as Record<string, unknown>;

  const introId = str(b.introId, 64);
  const note = str(b.note, 1200);
  const subjectId = str(s.id, 64);
  const subjectName = str(s.name, 120);
  const headline = str(s.headline, 300, false);
  const avatarUrl = str(s.avatarUrl, 500, false);
  const recipientName = str(r.name, 120);
  if (!introId || !note || !subjectId || !subjectName || !recipientName) return null;
  if (headline === null || avatarUrl === null || !ID.test(subjectId)) return null;
  if (avatarUrl && !avatarUrl.startsWith("https://")) return null;

  const subject: IntroProfile = { id: subjectId, name: subjectName, headline: headline ?? "", avatarUrl };
  if (r.kind === "member") {
    const memberId = str(r.memberId, 64);
    if (!memberId || !ID.test(memberId) || memberId === subjectId) return null;
    return { introId, note, subject, recipient: { kind: "member", memberId, name: recipientName } };
  }
  if (r.kind === "email") {
    const email = str(r.email, 254);
    if (!email || !isEmail(email)) return null;
    return { introId, note, subject, recipient: { kind: "email", email: email.toLowerCase(), name: recipientName } };
  }
  return null;
}

/**
 * Sends a warm intro: a Connector shares a member's profile with someone.
 *
 *  501 → no SESSION_SECRET: the client builds a demo preview instead
 *  401 → not signed in with a real provider
 *  403 → signed in, but not a Connector
 *  429 → too many intros today
 *
 * Who it's from always comes from the session. The Connector list is
 * CONNECTOR_EMAILS until the database (members.is_connector) takes over.
 */
export async function POST(request: NextRequest) {
  if (!env.sessionSecret()) {
    return NextResponse.json({ error: "Warm intros are in demo mode", code: "not_configured" }, { status: 501 });
  }
  const session = readSession(request);
  if (!session) {
    return NextResponse.json({ error: "Sign in to send warm intros", code: "not_signed_in" }, { status: 401 });
  }
  if (session.profile.emailVerified === false || !isConnectorEmail(session.profile.email)) {
    return NextResponse.json({ error: "Only Connectors can send warm intros", code: "not_connector" }, { status: 403 });
  }
  const input = parse(await request.json().catch(() => null));
  if (!input) {
    return NextResponse.json({ error: "Incomplete intro", code: "invalid" }, { status: 400 });
  }
  if (!take(session.profile.sub, "intro")) {
    return NextResponse.json({ error: "That's a lot of intros for one day. Try again tomorrow.", code: "rate_limited" }, { status: 429 });
  }

  const payload: IntroPayload = {
    introId: input.introId,
    fromName: session.profile.name,
    fromAvatarUrl: session.profile.picture,
    subject: input.subject,
    recipientName: input.recipient.name,
    recipientIsNew: input.recipient.kind === "email",
    note: input.note,
    expiresAt: new Date(Date.now() + INTRO_TTL_MS).toISOString(),
  };
  const body = base64UrlEncode(JSON.stringify(payload));
  const token = `${body}.${sign(body)}`;
  const origin = originFor(request);

  // Where the email goes. INVITE_TEST_RECIPIENT, when set, catches everything.
  const testInbox = env.email()?.testRecipient;
  const to =
    input.recipient.kind === "member" ? deliverableEmailFor(input.recipient.memberId) : testInbox ?? input.recipient.email;

  let delivered = false;
  if (integrationStatus().email && to) {
    try {
      await sendEmail({ to, ...introEmail(payload, { view: `${origin}/intro/${token}` }) });
      delivered = true;
    } catch (err) {
      console.error("[intros] email failed", err);
    }
  }
  return NextResponse.json({ introUrl: `/intro/${token}`, delivered });
}
