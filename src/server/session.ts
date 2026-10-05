import "server-only";
import type { NextRequest, NextResponse } from "next/server";
import { seal, unseal } from "./crypto";

/**
 * Server session, stored as an encrypted httpOnly cookie. No database: the
 * cookie *is* the session store. Provider tokens never leave the server in
 * readable form.
 */

export const SESSION_COOKIE = "jumpin_session";
const MAX_AGE = 60 * 60 * 24 * 14; // 14 days

export interface GoogleTokens {
  accessToken: string;
  refreshToken?: string;
  /** epoch ms */
  expiresAt: number;
  scope: string;
}

export interface ServerSessionData {
  provider: "linkedin" | "google";
  profile: { sub: string; name: string; email?: string; picture?: string; emailVerified?: boolean };
  linkedinSub?: string;
  google?: GoogleTokens;
  instagram?: { userId: string; username: string };
  createdAt: number;
}

export function readSession(request: NextRequest): ServerSessionData | null {
  return unseal<ServerSessionData>(request.cookies.get(SESSION_COOKIE)?.value);
}

export function writeSession(response: NextResponse, data: ServerSessionData) {
  response.cookies.set(SESSION_COOKIE, seal(data), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export function clearSession(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
}

/** What the browser is allowed to know about the session. */
export function publicSession(data: ServerSessionData) {
  return {
    provider: data.provider,
    linked: {
      linkedin: Boolean(data.linkedinSub),
      google: Boolean(data.google?.scope.includes("calendar")),
      instagram: Boolean(data.instagram),
    },
    profile: data.profile,
    instagramHandle: data.instagram?.username,
  };
}
