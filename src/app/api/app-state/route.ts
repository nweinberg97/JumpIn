import { NextResponse, type NextRequest } from "next/server";
import { LIVE } from "@/lib/supabase/config";
import { adminClient, serverClient } from "@/lib/supabase/server";
import type { AppAccess } from "@/lib/types";
import { identify, isAdminEmail } from "@/server/identity";

export const dynamic = "force-dynamic";

/**
 * What the app needs to know about this deployment and this person:
 * whether the real backend is on, when launch is, whether they're approved,
 * and whether they're the founder. Demo mode: everything open.
 */
export async function GET(request: NextRequest) {
  if (!LIVE) {
    const demo: AppAccess = { live: false, launchAt: null, open: true, admin: false, membership: "approved" };
    return NextResponse.json(demo);
  }
  const supabase = await serverClient();
  const identity = await identify(request);
  const [launch, launched, membership] = await Promise.all([
    supabase!.from("launch_settings").select("launch_at, opened_at").maybeSingle(),
    supabase!.rpc("is_launched"),
    identity
      ? supabase!.from("memberships").select("status").eq("member_id", identity.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const row = launch.data as { launch_at: string | null; opened_at: string | null } | null;
  let status = (membership.data as { status: AppAccess["membership"] } | null)?.status ?? null;
  const admin = isAdminEmail(identity?.email);
  // The founder is approved automatically, so their own profile is visible.
  if (admin && identity && status !== "approved") {
    await adminClient()
      ?.from("memberships")
      .update({ status: "approved", approved_at: new Date().toISOString() })
      .eq("member_id", identity.id);
    status = "approved";
  }
  const access: AppAccess = {
    live: true,
    launchAt: row?.launch_at ?? null,
    open: launched.data === true,
    admin,
    membership: status,
  };
  return NextResponse.json(access);
}
