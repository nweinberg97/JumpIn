import { NextResponse, type NextRequest } from "next/server";
import { base64UrlEncode, type InvitePayload } from "@/lib/invite";
import { sign } from "@/server/crypto";
import { inviteEmail, sendEmail } from "@/server/email";
import { env, integrationStatus, originFor } from "@/server/env";
import { deliverableEmailFor } from "@/server/memberDirectory";
import { take } from "@/server/rateLimit";
import { readSession } from "@/server/session";

export const dynamic = "force-dynamic";

const MEET_HOST = /^https:\/\/meet\.google\.com\/[a-z0-9-]+$/i;
const MEMBER_ID = /^[A-Za-z0-9_-]{1,64}$/;

/** Only what the browser may decide. Who it's from comes from the session. */
interface InviteRequest {
  connectionId: string;
  toMemberId: string;
  toName: string;
  note: string;
  meetingUrl: string;
  fromHeadline?: string;
}

function parse(body: unknown): InviteRequest | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const str = (v: unknown, max: number) => (typeof v === "string" && v.trim() && v.length <= max ? v : null);
  const connectionId = str(b.connectionId, 64);
  const toMemberId = str(b.toMemberId, 64);
  const toName = str(b.toName, 120);
  const note = str(b.note, 1200);
  const meetingUrl = str(b.meetingUrl, 200);
  if (!connectionId || !toMemberId || !toName || !note || !meetingUrl) return null;
  if (!MEMBER_ID.test(toMemberId)) return null;
  const fromHeadline = typeof b.fromHeadline === "string" ? b.fromHeadline.slice(0, 160) : undefined;
  return { connectionId, toMemberId, toName, note, meetingUrl, fromHeadline };
}

/**
 * Signs an invite and, when email is configured, sends it.
 *
 *  501 → no SESSION_SECRET: the client uses a demo link
 *  401 → not signed in with a real provider: the client uses a demo link
 *  429 → too many invites this hour
 *
 * The sender's name and photo come from the encrypted session, never from
 * the request body, so nobody can send email "on behalf of" someone else.
 */
export async function POST(request: NextRequest) {
  if (!env.sessionSecret()) {
    return NextResponse.json({ error: "Invites are in demo mode", code: "not_configured" }, { status: 501 });
  }
  const session = readSession(request);
  if (!session) {
    return NextResponse.json({ error: "Sign in to send invites", code: "not_signed_in" }, { status: 401 });
  }
  const input = parse(await request.json().catch(() => null));
  if (!input) {
    return NextResponse.json({ error: "Incomplete invite", code: "invalid" }, { status: 400 });
  }
  if (!MEET_HOST.test(input.meetingUrl)) {
    return NextResponse.json({ error: "Invites can only link to a Google Meet", code: "invalid" }, { status: 400 });
  }
  if (!take(session.profile.sub, "invite")) {
    return NextResponse.json({ error: "You've sent a lot of invites. Try again in a little while.", code: "rate_limited" }, { status: 429 });
  }

  const clean: InvitePayload = {
    connectionId: input.connectionId,
    fromName: session.profile.name,
    fromAvatarUrl: session.profile.picture,
    fromHeadline: input.fromHeadline,
    toMemberId: input.toMemberId,
    toName: input.toName,
    note: input.note,
    meetingUrl: input.meetingUrl,
    expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
  };

  const body = base64UrlEncode(JSON.stringify(clean));
  const token = `${body}.${sign(body)}`;
  const origin = originFor(request);
  const inviteUrl = `${origin}/invite/${token}`;

  let delivered = false;
  const to = deliverableEmailFor(clean.toMemberId);
  if (integrationStatus().email && to) {
    try {
      const email = inviteEmail(clean, {
        yes: `${origin}/api/invites/respond?answer=yes&token=${token}`,
        no: `${origin}/api/invites/respond?answer=no&token=${token}`,
        view: inviteUrl,
      });
      await sendEmail({ to, ...email });
      delivered = true;
    } catch (err) {
      console.error("[invites] email failed", err);
    }
  }
  return NextResponse.json({ inviteUrl: `/invite/${token}`, delivered });
}
