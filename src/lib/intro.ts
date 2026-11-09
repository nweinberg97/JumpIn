/**
 * Warm intro links: `/intro/<token>`.
 *
 * Same shape as invite links (see invite.ts): `<base64url(json)>.<signature>`.
 * Real tokens are signed on the server; demo tokens use the literal
 * signature "demo". The payload carries a snapshot of the profile being
 * shared, so the recipient sees it even before they have an account.
 * Shared by client and server; no crypto here.
 */
import { base64UrlDecode, base64UrlEncode } from "./invite";

export interface IntroProfile {
  id: string;
  name: string;
  avatarUrl?: string;
  headline: string;
  whatIDo?: string;
  city?: string;
  impactAreas?: string[];
}

export interface IntroPayload {
  introId: string;
  /** The Connector making the intro. Set by the server from the session. */
  fromName: string;
  fromAvatarUrl?: string;
  /** Whose profile is being shared. */
  subject: IntroProfile;
  recipientName: string;
  /** True when the recipient isn't on JumpIn yet: the link lets them join. */
  recipientIsNew: boolean;
  /**
   * For a new recipient: the address the intro was sent to, masked
   * ("n•••@example.com"), so they sign in with the right account. The intro
   * only skips the waitlist for that email.
   */
  recipientEmailHint?: string;
  note: string;
  /** ISO time the link stops working. */
  expiresAt: string;
}

/** Warm intro links last 30 days: long enough for a busy person to get to it. */
export const INTRO_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
export const isEmail = (s: string) => EMAIL.test(s.trim()) && s.trim().length <= 254;

/** "nia.okafor@example.com" → "n•••@example.com". Keeps the domain so people recognise which inbox. */
export function maskEmail(email: string) {
  const [local, domain] = email.trim().toLowerCase().split("@");
  if (!local || !domain) return "";
  return `${local[0]}•••@${domain}`;
}

export function encodeDemoIntro(payload: IntroPayload) {
  return `${base64UrlEncode(JSON.stringify(payload))}.demo`;
}

export function decodeIntro(token: string): { payload: IntroPayload; signed: boolean } | null {
  const [body, sig] = decodeURIComponent(token).split(".");
  if (!body || !sig) return null;
  try {
    const payload = JSON.parse(base64UrlDecode(body)) as IntroPayload;
    if (!payload?.subject?.name || !payload.recipientName) return null;
    return { payload, signed: sig !== "demo" };
  } catch {
    return null;
  }
}

export function defaultIntroNote(recipientFirst: string, subjectFirst: string, fromFirst: string) {
  const to = recipientFirst || "there";
  return `Hi ${to},\n\nI'd love for you to meet ${subjectFirst}. I think you two would have a great conversation, and ${subjectFirst} is one of the people I trust most on JumpIn.\n\n${fromFirst}`;
}
