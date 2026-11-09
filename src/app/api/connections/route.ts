import { NextResponse, type NextRequest } from "next/server";
import { isUuid } from "@/lib/data/rows";
import { adminClient } from "@/lib/supabase/server";
import type { Connection } from "@/lib/types";
import { callsOpenFor, identify } from "@/server/identity";

export const dynamic = "force-dynamic";

const MEET = /^https:\/\/meet\.google\.com\/[a-z0-9-]+$/i;
const STATUSES = new Set<Connection["status"]>(["invited", "live", "scheduled", "completed", "declined", "cancelled"]);
/** What either person may change on an existing call. */
const NEXT_STATUS: Record<string, Connection["status"][]> = {
  invited: ["live", "declined", "cancelled"],
  live: ["completed", "cancelled"],
  scheduled: ["live", "completed", "cancelled"],
};

/**
 * Live mode: saves a JumpIn (a shared row both people see). Members can't
 * write these directly; this route checks that you're one of the two people,
 * that calls are open, that neither has blocked the other, and that the
 * link is a real Google Meet.
 */
export async function POST(request: NextRequest) {
  const db = adminClient();
  if (!db) return NextResponse.json({ error: "No database configured", code: "not_configured" }, { status: 501 });
  const me = await identify(request);
  if (!me) return NextResponse.json({ error: "Sign in first", code: "not_signed_in" }, { status: 401 });

  const c = (await request.json().catch(() => null)) as Partial<Connection> | null;
  if (!c?.id || !isUuid(c.id) || !c.status || !STATUSES.has(c.status)) {
    return NextResponse.json({ error: "Invalid call", code: "invalid" }, { status: 400 });
  }

  const { data: existing } = await db.from("connections").select("*").eq("id", c.id).maybeSingle();
  if (existing) {
    const row = existing as { initiator_id: string; recipient_id: string; status: string };
    if (![row.initiator_id, row.recipient_id].includes(me.id)) {
      return NextResponse.json({ error: "Not your call", code: "forbidden" }, { status: 403 });
    }
    if (row.status === c.status) return NextResponse.json({ ok: true });
    if (!NEXT_STATUS[row.status]?.includes(c.status)) {
      return NextResponse.json({ error: `Can't go from ${row.status} to ${c.status}`, code: "invalid" }, { status: 400 });
    }
    const { error } = await db
      .from("connections")
      .update({ status: c.status, completed_at: c.status === "completed" ? new Date().toISOString() : null })
      .eq("id", c.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // A new call, started by me.
  if (!c.otherUserId || !isUuid(c.otherUserId) || c.otherUserId === me.id) {
    return NextResponse.json({ error: "Who is this call with?", code: "invalid" }, { status: 400 });
  }
  if (!(await callsOpenFor(me))) {
    return NextResponse.json({ error: "Calls open at launch", code: "not_launched" }, { status: 403 });
  }
  const { data: blocked } = await db.rpc("is_blocked_between", { a: me.id, b: c.otherUserId });
  if (blocked === true) return NextResponse.json({ error: "Not available", code: "forbidden" }, { status: 403 });
  if (c.meetingUrl && !MEET.test(c.meetingUrl)) {
    return NextResponse.json({ error: "Calls must use a Google Meet link", code: "invalid" }, { status: 400 });
  }
  const { error } = await db.from("connections").insert({
    id: c.id,
    initiator_id: me.id,
    recipient_id: c.otherUserId,
    type: c.type === "scheduled" ? "scheduled" : "jumpin",
    status: c.status,
    scheduled_at: c.scheduledAt ?? null,
    duration_minutes: Math.min(240, Math.max(5, Number(c.durationMinutes) || 30)),
    meet_link: c.meetingUrl || null,
    calendar_event_id: c.calendarEventId ?? null,
    note: c.note?.slice(0, 1200) ?? null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
