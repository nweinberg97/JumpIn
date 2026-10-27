/** Shapes shared by the founder page and its API routes. */

export type MembershipStatus = "waitlisted" | "approved" | "suspended";

export interface AdminMember {
  id: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  headline: string;
  membership: MembershipStatus;
  isConnector: boolean;
  onboarded: boolean;
  joinedAt: string;
  /** What's missing before this profile is ready (see profileGaps). */
  gaps: string[];
  /** Name of the Connector who brought them in, if any. */
  invitedBy: string | null;
}

export interface AdminLaunch {
  launchAt: string | null;
  openedAt: string | null;
  launchEmailSentAt: string | null;
}

export interface AdminOverview {
  launch: AdminLaunch;
  members: AdminMember[];
}

export type AdminAction = "approve" | "waitlist" | "suspend" | "connector" | "unconnector";

/** Same rules as public.profile_gaps() in the database. */
export function profileGaps(m: {
  avatar_url: string | null;
  headline: string;
  what_i_do: string;
  bio: string;
  impact_areas: string[];
  onboarded: boolean;
}): string[] {
  return [
    !m.avatar_url && "photo",
    !m.headline && "headline",
    !m.what_i_do && "what I do",
    !m.bio && "about",
    !(m.impact_areas?.length > 0) && "impact areas",
    !m.onboarded && "onboarding",
  ].filter((g): g is string => Boolean(g));
}
