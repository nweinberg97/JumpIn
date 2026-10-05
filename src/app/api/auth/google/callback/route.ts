import { NextResponse, type NextRequest } from "next/server";
import { originFor } from "@/server/env";
import { clearPending, completeOAuth, oauthErrorRedirect, redirectUri } from "@/server/oauth";
import { exchangeGoogleCode } from "@/server/providers/google";
import { readSession, writeSession } from "@/server/session";

export async function GET(request: NextRequest) {
  const result = completeOAuth("google", request);
  if (!result.ok) return oauthErrorRedirect(request, "google", result.error);
  if (!result.pending.verifier) return oauthErrorRedirect(request, "google", "missing_verifier");

  try {
    const { user, tokens } = await exchangeGoogleCode({
      code: result.code,
      verifier: result.pending.verifier,
      redirectUri: redirectUri(request, "google"),
    });
    const existing = readSession(request);
    const response = NextResponse.redirect(new URL(result.pending.returnTo, originFor(request)));

    if (existing) {
      // Linking Google to an existing (e.g. LinkedIn) account: keep its profile.
      writeSession(response, { ...existing, google: tokens });
    } else {
      writeSession(response, {
        provider: "google",
        profile: {
          sub: user.sub,
          name: user.name,
          email: user.email,
          picture: user.picture,
          emailVerified: user.email_verified,
        },
        google: tokens,
        createdAt: Date.now(),
      });
    }
    clearPending(response, "google");
    return response;
  } catch (err) {
    console.error("[google] callback failed", err);
    return oauthErrorRedirect(request, "google", "exchange_failed");
  }
}
