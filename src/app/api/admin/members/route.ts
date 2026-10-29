import { NextResponse, type NextRequest } from "next/server";
import { isUuid } from "@/lib/data/rows";
import type { AdminAction } from "@/lib/admin";
import { requireAdmin } from "@/server/admin";
import { connectorEmail, sendOnce } from "@/server/email";
import { originFor } from "@/server/env";
import { emailForMember } from "@/server/memberDirectory";
import { sendWelcome } from "@/server/onboarding";

export const dynamic = "force-dynamic";

const ACTIONS = new Set<AdminAction>(["approve", "waitlist", "suspend", "connector", "unconnector", "verify", "unverify"]);

/** Approve, waitlist or pause a member; give or take the Connector badge. */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;
  const { db } = auth;
  const body = (await request.json().catch(() => null)) as { memberId?: string; action?: AdminAction } | null;
  if (!body?.memberId || !isUuid(body.memberId) || !body.action || !ACTIONS.has(body.action)) {
    return NextResponse.json({ error: "Invalid request", code: "invalid" }, { status: 400 });
  }
  const id = body.memberId;
  const now = new Date().toISOString();
  const result =
    body.action === "approve"
      ? await db.from("memberships").update({ status: "approved", approved_at: now }).eq("member_id", id)
      : body.action === "waitlist"
        ? await db.from("memberships").update({ status: "waitlisted", approved_at: null }).eq("member_id", id)
        : body.action === "suspend"
          ? await db.from("memberships").update({ status: "suspended" }).eq("member_id", id)
          : body.action === "connector"
            ? await db.rpc("grant_connector", { member: id })
            : body.action === "unconnector"
              ? await db.from("members").update({ is_connector: false }).eq("id", id)
              : await db.from("members").update({ verified: body.action === "verify" }).eq("id", id);
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });

  // Emails that go with the change (once each; nothing if email isn't set up).
  const appUrl = originFor(request);
  let emailed = false;
  if (body.action === "approve" || body.action === "connector") emailed = await sendWelcome(id, appUrl);
  if (body.action === "connector") {
    const { data: m } = await db.from("members").select("name").eq("id", id).maybeSingle();
    emailed = (await sendOnce(id, "connector", await emailForMember(id), connectorEmail({ name: (m as { name: string } | null)?.name ?? "", appUrl }))) || emailed;
  }
  return NextResponse.json({ ok: true, emailed });
}
