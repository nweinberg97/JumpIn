/**
 * Database rows ⇄ app types. Pure functions, no I/O, so they're unit-tested
 * (tests/unit/rows.test.ts) without a database.
 */
import type {
  AvailabilityStatus,
  Connection,
  JumpInPolicy,
  Member,
  Project,
  Viewer,
  WarmIntro,
  WeeklySlot,
} from "../types";

export interface PresenceRow {
  status: AvailabilityStatus;
  open_until: string | null;
}

export interface WeeklyRow {
  id: string;
  day: number;
  start_time: string; // "09:00:00"
  end_time: string;
}

export interface ProjectRow {
  name: string;
  description: string;
  url: string | null;
  position: number;
}

export interface MemberRow {
  id: string;
  name: string;
  avatar_url: string | null;
  headline: string;
  what_i_do: string;
  bio: string;
  city: string;
  country_code: string | null;
  timezone: string;
  interests: string[];
  impact_areas: string[];
  skills: string[];
  loom_url: string | null;
  linkedin_url: string | null;
  instagram_url: string | null;
  website_url: string | null;
  jump_in_policy: JumpInPolicy;
  profile_hidden: boolean;
  onboarded: boolean;
  verified: boolean;
  calendar_connected: boolean;
  is_connector?: boolean;
  joined_at: string;
  // Embedded by the select in SupabaseRepository. One-to-one embeds may come
  // back as an object or a one-item array depending on the API version.
  presence?: PresenceRow | PresenceRow[] | null;
  weekly_availability?: WeeklyRow[] | null;
  projects?: ProjectRow[] | null;
}

export const MEMBER_SELECT =
  "*, presence(status, open_until), weekly_availability(id, day, start_time, end_time), projects(name, description, url, position)";

const one = <T>(v: T | T[] | null | undefined): T | undefined => (Array.isArray(v) ? v[0] : v ?? undefined);
const hhmm = (t: string) => t.slice(0, 5);
const orUndefined = (v: string | null | undefined) => (v ? v : undefined);

export function memberFromRow(row: MemberRow, online: boolean): Member {
  const presence = one(row.presence);
  const status = presence?.status ?? "later";
  return {
    id: row.id,
    name: row.name,
    avatarUrl: row.avatar_url ?? "",
    headline: row.headline,
    whatIDo: row.what_i_do,
    bio: row.bio,
    city: row.city,
    countryCode: (row.country_code ?? "").trim(),
    timezone: row.timezone,
    interests: row.interests ?? [],
    impactAreas: row.impact_areas ?? [],
    skills: row.skills ?? [],
    projects: [...(row.projects ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((p): Project => ({ name: p.name, description: p.description, url: orUndefined(p.url) })),
    loomUrl: orUndefined(row.loom_url),
    linkedinUrl: orUndefined(row.linkedin_url),
    instagramUrl: orUndefined(row.instagram_url),
    websiteUrl: orUndefined(row.website_url),
    onlineStatus: online ? "online" : "offline",
    availability:
      status === "open" ? { status, openUntil: presence?.open_until ?? undefined } : { status },
    weeklyAvailability: [...(row.weekly_availability ?? [])]
      .sort((a, b) => a.day - b.day || a.start_time.localeCompare(b.start_time))
      .map(
        (w): WeeklySlot => ({
          id: w.id,
          day: w.day as WeeklySlot["day"],
          start: hhmm(w.start_time),
          end: hhmm(w.end_time),
        }),
      ),
    calendarConnected: row.calendar_connected,
    jumpInPolicy: row.jump_in_policy,
    verified: row.verified,
    isConnector: Boolean(row.is_connector),
    joinedAt: row.joined_at,
  };
}

export function viewerFromRow(row: MemberRow, email: string): Viewer {
  return {
    ...memberFromRow(row, true),
    email,
    profileHidden: row.profile_hidden,
    onboarded: row.onboarded,
  };
}

/** The columns a member may change on their own row (see the column grants). */
export function profileUpdate(v: Viewer) {
  const text = (s: string | undefined, max: number) => (s ?? "").trim().slice(0, max);
  const link = (s: string | undefined) => (s && s.trim() ? s.trim() : null);
  return {
    name: text(v.name, 120) || "New member",
    avatar_url: v.avatarUrl ? v.avatarUrl : null,
    headline: text(v.headline, 160),
    what_i_do: text(v.whatIDo, 300),
    bio: text(v.bio, 2000),
    city: text(v.city, 120),
    country_code: /^[A-Za-z]{2}$/.test(v.countryCode ?? "") ? v.countryCode.toUpperCase() : null,
    timezone: v.timezone || "UTC",
    interests: v.interests,
    impact_areas: v.impactAreas,
    skills: v.skills,
    loom_url: link(v.loomUrl),
    linkedin_url: link(v.linkedinUrl),
    instagram_url: link(v.instagramUrl),
    website_url: link(v.websiteUrl),
    jump_in_policy: v.jumpInPolicy,
    profile_hidden: v.profileHidden,
    onboarded: v.onboarded,
  };
}

export function presenceUpdate(v: Pick<Member, "availability">) {
  const { status, openUntil } = v.availability;
  return { status, open_until: status === "open" ? openUntil ?? null : null };
}

export function weeklyRows(memberId: string, slots: WeeklySlot[]) {
  return slots
    .filter((s) => s.end > s.start)
    .map((s) => ({ member_id: memberId, day: s.day, start_time: s.start, end_time: s.end }));
}

export function projectRows(memberId: string, projects: Project[]) {
  return projects
    .filter((p) => p.name.trim())
    .slice(0, 10)
    .map((p, i) => ({
      member_id: memberId,
      name: p.name.trim().slice(0, 120),
      description: p.description.trim().slice(0, 500),
      url: p.url?.trim() || null,
      position: i,
    }));
}

export interface ConnectionRow {
  id: string;
  initiator_id: string;
  recipient_id: string;
  type: Connection["type"];
  status: Connection["status"];
  scheduled_at: string | null;
  duration_minutes: number;
  meet_link: string | null;
  calendar_event_id: string | null;
  note: string | null;
  created_at: string;
}

/** A shared connection row, seen from the viewer's side. */
export function connectionFromRow(row: ConnectionRow, viewerId: string): Connection {
  return {
    id: row.id,
    userId: viewerId,
    otherUserId: row.initiator_id === viewerId ? row.recipient_id : row.initiator_id,
    type: row.type,
    status: row.status,
    createdAt: row.created_at,
    meetingUrl: row.meet_link ?? "",
    scheduledAt: row.scheduled_at ?? undefined,
    durationMinutes: row.duration_minutes,
    note: row.note ?? undefined,
    calendarEventId: row.calendar_event_id ?? undefined,
    source: "google",
  };
}

export interface WarmIntroRow {
  id: string;
  subject_id: string;
  recipient_member_id: string | null;
  recipient_email: string | null;
  recipient_name: string;
  note: string;
  created_at: string;
}

export function introFromRow(row: WarmIntroRow): WarmIntro {
  return {
    id: row.id,
    subjectId: row.subject_id,
    recipient: row.recipient_member_id
      ? { kind: "member", memberId: row.recipient_member_id, name: row.recipient_name }
      : { kind: "email", email: row.recipient_email ?? "", name: row.recipient_name },
    note: row.note,
    createdAt: row.created_at,
    // The link itself isn't stored (only a hash of it), so there's no preview to reopen.
    introUrl: "",
    source: "email",
  };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (s: string) => UUID.test(s);
