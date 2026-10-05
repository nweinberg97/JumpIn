import { NextResponse, type NextRequest } from "next/server";
import { withGoogle } from "@/server/googleAccess";
import { createMeetEvent } from "@/server/googleCalendar";
import { deliverableEmailFor } from "@/server/memberDirectory";

export const dynamic = "force-dynamic";

interface Body {
  memberId: string;
  title: string;
  description?: string;
  start?: string;
  end?: string;
  inviteMember?: boolean;
}

/**
 * Creates a Google Calendar event with a Meet link on the signed-in
 * person's calendar. Instant JumpIns start now and last 30 minutes.
 */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as Body | null;
  if (!body?.memberId || !body.title) {
    return NextResponse.json({ error: "memberId and title are required" }, { status: 400 });
  }
  const start = body.start ? new Date(body.start) : new Date();
  const end = body.end ? new Date(body.end) : new Date(start.getTime() + 30 * 60_000);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return NextResponse.json({ error: "Invalid start/end" }, { status: 400 });
  }

  return withGoogle(request, async (accessToken) => {
    const guest = body.inviteMember ? deliverableEmailFor(body.memberId) : null;
    const result = await createMeetEvent(accessToken, {
      summary: body.title.slice(0, 200),
      description: body.description?.slice(0, 2000),
      start,
      end,
      attendees: guest ? [guest] : undefined,
    });
    return NextResponse.json(result);
  });
}
