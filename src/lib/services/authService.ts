import { api } from "./http";

/**
 * Client side of authentication. The OAuth dance itself (state, PKCE, token
 * exchange, secrets) happens entirely in server route handlers under
 * /api/auth/*; the browser only ever navigates to them.
 */

export interface ServerSession {
  provider: "linkedin" | "google";
  linked: { linkedin: boolean; google: boolean; instagram: boolean };
  profile: { sub: string; name: string; email?: string; picture?: string; emailVerified?: boolean };
  instagramHandle?: string;
}

function go(path: string, returnTo: string, extra: Record<string, string> = {}) {
  const params = new URLSearchParams({ returnTo, ...extra });
  window.location.assign(`${path}?${params.toString()}`);
}

export const authService = {
  continueWithLinkedIn(returnTo = "/auth/complete") {
    go("/api/auth/linkedin", returnTo);
  },
  continueWithGoogle(returnTo = "/auth/complete") {
    go("/api/auth/google", returnTo);
  },
  /**
   * Incremental Google consent for Calendar + Meet. Comes back through
   * /auth/complete in "link" mode so it never replaces the current profile.
   */
  linkGoogleCalendar(next = "/availability") {
    const returnTo = `/auth/complete?link=google&next=${encodeURIComponent(next)}`;
    go("/api/auth/google", returnTo, { scope: "calendar", intent: "link" });
  },
  connectInstagram(returnTo = "/settings") {
    go("/api/auth/instagram", returnTo);
  },
  /** The server-side session created by a real OAuth sign-in, if any. */
  async fetchServerSession(): Promise<ServerSession | null> {
    try {
      const res = await api<{ session: ServerSession | null }>("/api/auth/session");
      return res.session;
    } catch {
      return null;
    }
  },
  async signOut() {
    try {
      await api("/api/auth/signout", { method: "POST" });
    } catch {
      /* demo mode has no server session */
    }
  },
};
