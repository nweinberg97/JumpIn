import "server-only";
import { env } from "../env";
import { getJson, postForm } from "../oauth";
import type { GoogleTokens } from "../session";

/**
 * Google OAuth 2.0 (authorization code + PKCE), with incremental scopes:
 *  - sign-in asks only for openid email profile
 *  - "Connect Google Calendar" adds calendar.events + calendar.freebusy,
 *    with include_granted_scopes so earlier grants are kept.
 */

export const GOOGLE = {
  authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenUrl: "https://oauth2.googleapis.com/token",
  userInfoUrl: "https://openidconnect.googleapis.com/v1/userinfo",
  signInScopes: ["openid", "email", "profile"],
  calendarScopes: [
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/calendar.freebusy",
  ],
};

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  id_token?: string;
}

export interface GoogleUserInfo {
  sub: string;
  name: string;
  email?: string;
  email_verified?: boolean;
  picture?: string;
}

function toTokens(t: TokenResponse, previous?: GoogleTokens): GoogleTokens {
  return {
    accessToken: t.access_token,
    // Google only returns a refresh token on first consent; keep the old one.
    refreshToken: t.refresh_token ?? previous?.refreshToken,
    expiresAt: Date.now() + (t.expires_in - 60) * 1000,
    scope: t.scope,
  };
}

export async function exchangeGoogleCode(opts: { code: string; verifier: string; redirectUri: string }) {
  const cfg = env.google();
  if (!cfg) throw new Error("Google is not configured");
  const token = await postForm<TokenResponse>(GOOGLE.tokenUrl, {
    grant_type: "authorization_code",
    code: opts.code,
    code_verifier: opts.verifier,
    redirect_uri: opts.redirectUri,
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
  });
  const user = await getJson<GoogleUserInfo>(GOOGLE.userInfoUrl, token.access_token);
  return { user, tokens: toTokens(token) };
}

/** Returns usable tokens, refreshing if needed. `changed` = re-save the cookie. */
export async function freshGoogleTokens(tokens: GoogleTokens): Promise<{ tokens: GoogleTokens; changed: boolean }> {
  if (tokens.expiresAt > Date.now()) return { tokens, changed: false };
  const cfg = env.google();
  if (!cfg || !tokens.refreshToken) throw new Error("Google session expired");
  const token = await postForm<TokenResponse>(GOOGLE.tokenUrl, {
    grant_type: "refresh_token",
    refresh_token: tokens.refreshToken,
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
  });
  return { tokens: toTokens(token, tokens), changed: true };
}

export function hasCalendarScopes(tokens?: GoogleTokens) {
  return Boolean(tokens && GOOGLE.calendarScopes.every((s) => tokens.scope.includes(s)));
}
