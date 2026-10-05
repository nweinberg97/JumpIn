import type { NextRequest } from "next/server";
import { pkceChallenge, randomToken } from "@/server/crypto";
import { env, integrationStatus } from "@/server/env";
import { beginOAuth, notConfiguredRedirect, redirectUri, safeReturnTo } from "@/server/oauth";
import { GOOGLE } from "@/server/providers/google";
import { readSession } from "@/server/session";

/**
 * Step 1 of Google OAuth.
 *   ?scope=calendar  → also request Calendar (free/busy + events for Meet)
 *   ?intent=link     → attach Google to the current account instead of signing in
 */
export function GET(request: NextRequest) {
  const cfg = env.google();
  if (!cfg || !integrationStatus().google) return notConfiguredRedirect(request, "google");
  const params = request.nextUrl.searchParams;
  const wantsCalendar = params.get("scope") === "calendar";
  const intent = params.get("intent") === "link" || readSession(request) ? "link" : "signin";
  const verifier = randomToken(48);

  return beginOAuth(
    "google",
    GOOGLE.authorizeUrl,
    {
      response_type: "code",
      client_id: cfg.clientId,
      redirect_uri: redirectUri(request, "google"),
      scope: [...GOOGLE.signInScopes, ...(wantsCalendar ? GOOGLE.calendarScopes : [])].join(" "),
      code_challenge: pkceChallenge(verifier),
      code_challenge_method: "S256",
      include_granted_scopes: "true",
      // offline + consent → a refresh token, so Meet creation keeps working.
      access_type: wantsCalendar ? "offline" : "online",
      prompt: wantsCalendar ? "consent" : "select_account",
    },
    { returnTo: safeReturnTo(params.get("returnTo")), intent, verifier },
  );
}
