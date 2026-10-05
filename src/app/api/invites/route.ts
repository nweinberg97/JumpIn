import { NextResponse, type NextRequest } from "next/server";
import { base64UrlEncode, type InvitePayload } from "@/lib/invite";
import { sign } from "@/server/crypto";
import { inviteEmail, sendEmail } from "@/server/email";
import { env, integrationStatus, originFor } from "@/server/env";
import { deliverableEmailFor } from "@/server/memberDirectory";

export const dynamic = "force-dynamic";

const MEET_HOST = /^https:\/\/meet\.google\.com\//;

/**
 * Signs an invite and, when email is configured, sends it.
 * Responds 501 when there's no SESSION_SECRET so the client uses a demo link.
 */
export async function POST(request: NextRequest) {
  if (!env.sessionSecret()) {
    return NextResponse.json({ error: "Invites are in demo mode", code: "not_configured" }, { status: 501 });
  }
  const payload = (await request.json().catch(() => null)) as InvitePayload | null;
  if (!payload?.toMemberId || !payload.fromName || !payload.note || !payload.meetingUrl) {
    return NextResponse.json({ error: "Incomplete invite" }, { status: 400 });
  }
  if (!MEET_HOST.test(payload.meetingUrl)) {
    return NextResponse.json({ error: "Invites can only link to Google Meet" }, { status: 400 });
  }
  const clean: InvitePayload = {
    ...payload,
    note: payload.note.slice(0, 1200),
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
