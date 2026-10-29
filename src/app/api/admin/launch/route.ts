import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/server/admin";

export const dynamic = "force-dynamic";

/**
 * Set or clear the launch date, open calls now, or close them again.
 *   { launchAt: ISO | null }   the countdown
 *   { open: true | false }     open early / close again (testing)
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;
  const body = (await request.json().catch(() => null)) as { launchAt?: string | null; open?: boolean } | null;
  if (!body) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const patch: Record<string, string | null> = {};
  if ("launchAt" in body) {
    if (body.launchAt !== null && Number.isNaN(Date.parse(String(body.launchAt)))) {
      return NextResponse.json({ error: "That isn't a date", code: "invalid" }, { status: 400 });
    }
    patch.launch_at = body.launchAt ? new Date(body.launchAt).toISOString() : null;
  }
  if (typeof body.open === "boolean") patch.opened_at = body.open ? new Date().toISOString() : null;
  if (!Object.keys(patch).length) return NextResponse.json({ error: "Nothing to change" }, { status: 400 });

  const { error } = await auth.db.from("launch_settings").update(patch).eq("id", true);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
