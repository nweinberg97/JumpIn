import { browserClient } from "../supabase/browser";
import { LIVE } from "../supabase/config";
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
  /** Holds the Connector badge: may send warm intros. */
  connector?: boolean;
}

function go(path: string, returnTo: string, extra: Record<string, string> = {}) {
  const params = new URLSearchParams({ returnTo, ...extra });
  window.location.assign(`${path}?${params.toString()}`);
}

/**
 * Live: sign in through Supabase Auth (it holds the Google and LinkedIn app
 * credentials); people come back through /auth/callback.
 */
async function supabaseSignIn(provider: "google" | "linkedin_oidc", next?: string) {
  const supabase = browserClient();
  if (!supabase) return;
  const redirectTo = `${window.location.origin}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ""}`;
  await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } });
}

export const authService = {
  /** Sign-in buttons work whenever the real backend is on. */
  liveSignIn: LIVE,
  continueWithLinkedIn(returnTo = "/auth/complete") {
    if (LIVE) return void supabaseSignIn("linkedin_oidc");
    go("/api/auth/linkedin", returnTo);
  },
  continueWithGoogle(returnTo = "/auth/complete") {
    if (LIVE) return void supabaseSignIn("google");
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
  /** Clears the prototype's cookie session only (used when leaving the demo). */
  async signOutPrototype() {
    try {
      await api("/api/auth/signout", { method: "POST" });
    } catch {
      /* demo mode has no server session */
    }
  },
  /** Signs out everywhere, including the real (Supabase) account. */
  async signOut() {
    await authService.signOutPrototype();
    await browserClient()?.auth.signOut();
  },
};
