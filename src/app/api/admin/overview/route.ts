import { NextResponse, type NextRequest } from "next/server";
import { profileGaps, type AdminMember, type AdminOverview, type MembershipStatus } from "@/lib/admin";
import { requireAdmin } from "@/server/admin";

export const dynamic = "force-dynamic";

interface Row {
  id: string;
  name: string;
  avatar_url: string | null;
  headline: string;
  what_i_do: string;
  bio: string;
  impact_areas: string[];
  onboarded: boolean;
  is_connector: boolean;
  verified: boolean;
  linkedin_url: string | null;
  joined_at: string;
  member_private: { email: string } | Array<{ email: string }> | null;
  memberships: { status: MembershipStatus; invited_by: string | null } | Array<{ status: MembershipStatus; invited_by: string | null }> | null;
}

const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v);

/** Everyone who has signed in, with what their profile still needs. */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;
  const { db } = auth;

  const [members, launch] = await Promise.all([
    db
      .from("members")
      .select(
        "id, name, avatar_url, headline, what_i_do, bio, impact_areas, onboarded, is_connector, verified, linkedin_url, joined_at, member_private(email), memberships(status, invited_by)",
      )
      .order("joined_at", { ascending: false }),
    db.from("launch_settings").select("launch_at, opened_at, launch_email_sent_at").maybeSingle(),
  ]);
  if (members.error) return NextResponse.json({ error: members.error.message }, { status: 500 });

  const rows = (members.data ?? []) as Row[];
  const names = new Map(rows.map((r) => [r.id, r.name]));
  const list: AdminMember[] = rows.map((r) => {
    const m = one(r.memberships);
    return {
      id: r.id,
      name: r.name,
      email: one(r.member_private)?.email ?? null,
      avatarUrl: r.avatar_url,
      headline: r.headline,
      membership: m?.status ?? "waitlisted",
      isConnector: r.is_connector,
      verified: r.verified,
      linkedinUrl: r.linkedin_url,
      onboarded: r.onboarded,
      joinedAt: r.joined_at,
      gaps: profileGaps(r),
      invitedBy: m?.invited_by ? names.get(m.invited_by) ?? null : null,
    };
  });
  const l = launch.data as { launch_at: string | null; opened_at: string | null; launch_email_sent_at: string | null } | null;
  const body: AdminOverview = {
    launch: { launchAt: l?.launch_at ?? null, openedAt: l?.opened_at ?? null, launchEmailSentAt: l?.launch_email_sent_at ?? null },
    members: list,
  };
  return NextResponse.json(body);
}
