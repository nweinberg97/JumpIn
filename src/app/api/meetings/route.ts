import { NextResponse, type NextRequest } from "next/server";
import { withGoogle } from "@/server/googleAccess";
import { createMeetEvent } from "@/server/googleCalendar";
import { callsOpenFor, identify } from "@/server/identity";
import { emailForMember } from "@/server/memberDirectory";
import { take } from "@/server/rateLimit";

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

  const me = await identify(request);
  if (me && !(await callsOpenFor(me))) {
    return NextResponse.json({ error: "Calls open at launch", code: "not_launched" }, { status: 403 });
  }

  return withGoogle(request, async (accessToken, session) => {
    if (!take(session.profile.sub, "meeting")) {
      return NextResponse.json(
        { error: "Too many calls started this hour. Try again in a little while.", code: "rate_limited" },
        { status: 429 },
      );
    }
    const guest = body.inviteMember ? await emailForMember(body.memberId) : null;
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
