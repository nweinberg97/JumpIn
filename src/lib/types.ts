/**
 * JumpIn domain model.
 *
 * These types are deliberately flat and serialisable so they map 1:1 onto
 * database tables later (see README → "Adding a real backend"):
 *
 *   members            ← Member (minus the private email, which lives in auth)
 *   weekly_availability← WeeklySlot (member_id, day, start, end)
 *   connections        ← Connection
 *   blocks / reports   ← SafetyState
 */

export type ISODateString = string;

/** Is the person using JumpIn right now? Separate from willingness to talk. */
export type OnlineStatus = "online" | "offline";

/**
 * Willingness to talk.
 *  open        → "Open to JumpIn": happy to talk right now (until `openUntil`)
 *  later       → "Available later": not now, but open to scheduling
 *  unavailable → heads down
 */
export type AvailabilityStatus = "open" | "later" | "unavailable";

/** Who is allowed to start an instant JumpIn with this member. */
export type JumpInPolicy = "anyone" | "met" | "nobody";

export interface CurrentAvailability {
  status: AvailabilityStatus;
  /** When an "open" window closes. Absent = open until switched off. */
  openUntil?: ISODateString;
}

/** A recurring window, in the member's own timezone. day: 0 = Sunday. */
export interface WeeklySlot {
  id: string;
  day: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  start: string; // "09:00"
  end: string; // "12:00"
}

export interface Project {
  name: string;
  description: string;
  url?: string;
}

export interface Member {
  id: string;
  name: string;
  avatarUrl: string;
  /** One-liner shown on cards. */
  headline: string;
  /** "What I do" — one sentence. */
  whatIDo: string;
  /** Longer "About" paragraph. */
  bio: string;
  city: string;
  /** ISO 3166-1 alpha-2, used for the flag. */
  countryCode: string;
  timezone: string; // IANA, e.g. "Europe/London"
  interests: string[];
  impactAreas: string[];
  skills: string[];
  projects: Project[];
  loomUrl?: string;
  linkedinUrl?: string;
  instagramUrl?: string;
  websiteUrl?: string;
  onlineStatus: OnlineStatus;
  availability: CurrentAvailability;
  weeklyAvailability: WeeklySlot[];
  calendarConnected: boolean;
  jumpInPolicy: JumpInPolicy;
  /** LinkedIn OIDC identity confirmed. */
  verified: boolean;
  joinedAt: ISODateString;
}

/**
 * The signed-in member. Same shape as Member plus private fields that other
 * members never see.
 */
export interface Viewer extends Member {
  email: string;
  profileHidden: boolean;
  onboarded: boolean;
}

export type ConnectionType = "jumpin" | "scheduled";

/**
 * invited   → a first-time JumpIn note was sent, waiting for a yes
 * live      → a Meet is open right now
 * scheduled → a future JumpIn on the calendar
 * completed → it happened
 * declined  → they said not right now
 * cancelled → someone called it off
 */
export type ConnectionStatus =
  | "invited"
  | "live"
  | "scheduled"
  | "completed"
  | "declined"
  | "cancelled";

export interface Connection {
  id: string;
  userId: string;
  otherUserId: string;
  type: ConnectionType;
  status: ConnectionStatus;
  createdAt: ISODateString;
  meetingUrl: string;
  scheduledAt?: ISODateString;
  durationMinutes: number;
  note?: string;
  calendarEventId?: string;
  /** Whether the Meet/event came from the real Google API or demo mode. */
  source: "google" | "demo";
}

export interface Report {
  id: string;
  memberId: string;
  reason: string;
  details?: string;
  createdAt: ISODateString;
}

export interface SafetyState {
  blockedIds: string[];
  reports: Report[];
}

export type AuthProvider = "linkedin" | "google" | "demo";

export interface Session {
  userId: string;
  provider: AuthProvider;
  /** Linked identities, e.g. signed in with LinkedIn and connected Google. */
  linked: { linkedin: boolean; google: boolean; instagram: boolean };
  instagramHandle?: string;
  createdAt: ISODateString;
}

/** Which real integrations the server has credentials for. Booleans only. */
export interface IntegrationStatus {
  linkedin: boolean;
  google: boolean;
  instagram: boolean;
  email: boolean;
}
