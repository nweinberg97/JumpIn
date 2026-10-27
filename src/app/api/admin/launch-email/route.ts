import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/server/admin";
import { launchEmail, sendBatch, sendEmail } from "@/server/email";
import { integrationStatus, originFor } from "@/server/env";

export const dynamic = "force-dynamic";

/**
 * The "we're live" email.
 *   { test: true }  → only to you, to check it looks right
 *   {}              → every approved member, once (refuses a second send)
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;
  const { db, me } = auth;
  if (!integrationStatus().email) {
    return NextResponse.json({ error: "Connect Resend first (RESEND_API_KEY, INVITE_FROM_EMAIL)", code: "not_configured" }, { status: 501 });
  }
  const body = (await request.json().catch(() => ({}))) as { test?: boolean };
  const appUrl = `${originFor(request)}/discover`;

  if (body.test) {
    await sendEmail({ to: me.email!, ...launchEmail(me.name, appUrl) });
    return NextResponse.json({ sent: 1, test: true });
  }

  const { data: settings } = await db.from("launch_settings").select("launch_email_sent_at").maybeSingle();
  if ((settings as { launch_email_sent_at: string | null } | null)?.launch_email_sent_at) {
    return NextResponse.json({ error: "The launch email has already gone out", code: "already_sent" }, { status: 409 });
  }

  const { data, error } = await db
    .from("memberships")
    .select("member_id, members(name, member_private(email))")
    .eq("status", "approved");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  type Row = { member_id: string; members: { name: string; member_private: { email: string } | Array<{ email: string }> | null } | null };
  const recipients = ((data ?? []) as unknown as Row[])
    .map((r) => {
      const priv = r.members?.member_private;
      const email = Array.isArray(priv) ? priv[0]?.email : priv?.email;
      return email ? { email, name: r.members?.name ?? "" } : null;
    })
    .filter((r): r is { email: string; name: string } => r !== null);

  // Mark first, so a double click can't send twice.
  await db.from("launch_settings").update({ launch_email_sent_at: new Date().toISOString() }).eq("id", true);
  try {
    const sent = await sendBatch(recipients.map((r) => ({ to: r.email, ...launchEmail(r.name, appUrl) })));
    return NextResponse.json({ sent });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sending failed";
    // Nothing went out: allow another try. Some went out: stay marked, so
    // nobody gets it twice; the error says how many were sent.
    if (message.includes("after 0 sent")) {
      await db.from("launch_settings").update({ launch_email_sent_at: null }).eq("id", true);
    }
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
