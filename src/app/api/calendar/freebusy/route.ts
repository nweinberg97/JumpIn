import { NextResponse, type NextRequest } from "next/server";
import { withGoogle } from "@/server/googleAccess";
import { queryFreeBusy } from "@/server/googleCalendar";

export const dynamic = "force-dynamic";

/** Busy blocks on the signed-in person's primary calendar (no event details). */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { timeMin?: string; timeMax?: string } | null;
  if (!body?.timeMin || !body.timeMax) {
    return NextResponse.json({ error: "timeMin and timeMax are required" }, { status: 400 });
  }
  return withGoogle(request, async (accessToken) => {
    const busy = await queryFreeBusy(accessToken, body.timeMin!, body.timeMax!);
    return NextResponse.json({ busy });
  });
}
