import { NextResponse, type NextRequest } from "next/server";
import { INTRO_TTL_MS, isEmail, maskEmail, type IntroPayload, type IntroProfile } from "@/lib/intro";
import { base64UrlEncode } from "@/lib/invite";
import { sign } from "@/server/crypto";
import { introducedNoticeEmail, introEmail, sendEmail, sendQuietly } from "@/server/email";
import { env, integrationStatus, isConnectorEmail, originFor } from "@/server/env";
import { createHash, randomUUID } from "node:crypto";
import { isUuid } from "@/lib/data/rows";
import { adminClient } from "@/lib/supabase/server";
import { identify, memberCard, type Identity } from "@/server/identity";
import { emailForMember } from "@/server/memberDirectory";
import { take } from "@/server/rateLimit";

/** Connector badge: the database flag (live), or CONNECTOR_EMAILS. */
async function isConnector(me: Identity) {
  if (me.emailVerified && isConnectorEmail(me.email)) return true;
  if (!me.live) return false;
  const db = adminClient();
  const { data } = (await db?.from("members").select("is_connector").eq("id", me.id).maybeSingle()) ?? { data: null };
  return (data as { is_connector: boolean } | null)?.is_connector === true;
}

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
  const me = await identify(request);
  if (!me) {
    return NextResponse.json({ error: "Sign in to send warm intros", code: "not_signed_in" }, { status: 401 });
  }
  if (!(await isConnector(me))) {
    return NextResponse.json({ error: "Only Connectors can send warm intros", code: "not_connector" }, { status: 403 });
  }
  const input = parse(await request.json().catch(() => null));
  if (!input) {
    return NextResponse.json({ error: "Incomplete intro", code: "invalid" }, { status: 400 });
  }
  if (!take(me.id, "intro")) {
    return NextResponse.json({ error: "That's a lot of intros for one day. Try again tomorrow.", code: "rate_limited" }, { status: 429 });
  }

  // Live: the profile shown comes from the database, not the request.
  let subject = input.subject;
  const recipientId = input.recipient.kind === "member" ? input.recipient.memberId : null;
  if (me.live) {
    if (!isUuid(subject.id) || (recipientId && !isUuid(recipientId)) || subject.id === me.id) {
      return NextResponse.json({ error: "Invalid intro", code: "invalid" }, { status: 400 });
    }
    const card = await memberCard(subject.id);
    if (!card) return NextResponse.json({ error: "That member isn't available", code: "invalid" }, { status: 400 });
    subject = { ...subject, name: card.name, headline: card.headline, avatarUrl: card.avatarUrl };
  }

  const payload: IntroPayload = {
    introId: me.live ? randomUUID() : input.introId,
    fromName: me.name,
    fromAvatarUrl: me.picture,
    subject,
    recipientName: input.recipient.name,
    recipientIsNew: input.recipient.kind === "email",
    recipientEmailHint: input.recipient.kind === "email" ? maskEmail(input.recipient.email) : undefined,
    note: input.note,
    expiresAt: new Date(Date.now() + INTRO_TTL_MS).toISOString(),
  };
  const body = base64UrlEncode(JSON.stringify(payload));
  const token = `${body}.${sign(body)}`;
  const origin = originFor(request);

  // Live: record the intro with a hash of its link (never the link itself),
  // which is how the new person's sign-up is matched to it later.
  if (me.live) {
    const db = adminClient();
    if (!db) return NextResponse.json({ error: "No database configured", code: "not_configured" }, { status: 501 });
    const { error } = await db.from("warm_intros").insert({
      id: payload.introId,
      introducer_id: me.id,
      subject_id: subject.id,
      recipient_member_id: recipientId,
      recipient_email: input.recipient.kind === "email" ? input.recipient.email : null,
      recipient_name: input.recipient.name,
      note: input.note,
      token_hash: createHash("sha256").update(token).digest("hex"),
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    // So an intro never surprises the person whose profile was shared.
    await sendQuietly(
      await emailForMember(subject.id),
      introducedNoticeEmail({ subjectName: subject.name, fromName: me.name, recipientName: input.recipient.name, note: input.note, appUrl: originFor(request) }),
    );
  }

  // Where the email goes. INVITE_TEST_RECIPIENT, when set, catches everything.
  const testInbox = env.email()?.testRecipient;
  const to =
    input.recipient.kind === "member" ? await emailForMember(input.recipient.memberId) : testInbox ?? input.recipient.email;

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
