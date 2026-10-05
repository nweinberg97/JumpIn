import { NextResponse, type NextRequest } from "next/server";
import { env, originFor } from "@/server/env";
import { clearPending, completeOAuth, oauthErrorRedirect, redirectUri } from "@/server/oauth";
import { exchangeLinkedInCode } from "@/server/providers/linkedin";
import { readSession, writeSession } from "@/server/session";

/** Step 2: verify state, exchange the code, read the OIDC profile, start a session. */
export async function GET(request: NextRequest) {
  const cfg = env.linkedin();
  if (!cfg) return oauthErrorRedirect(request, "linkedin", "not_configured");
  const result = completeOAuth("linkedin", request);
  if (!result.ok) return oauthErrorRedirect(request, "linkedin", result.error);

  try {
    const user = await exchangeLinkedInCode({
      code: result.code,
      redirectUri: redirectUri(request, "linkedin"),
      clientId: cfg.clientId,
      clientSecret: cfg.clientSecret,
    });
    const existing = readSession(request);
    const response = NextResponse.redirect(new URL(result.pending.returnTo, originFor(request)));
    writeSession(response, {
      ...existing,
      // LinkedIn is the primary identity: it always owns the profile.
      provider: "linkedin",
      profile: {
        sub: user.sub,
        name: user.name,
        email: user.email,
        picture: user.picture,
        emailVerified: user.email_verified,
      },
      linkedinSub: user.sub,
      createdAt: existing?.createdAt ?? Date.now(),
    });
    clearPending(response, "linkedin");
    return response;
  } catch (err) {
    console.error("[linkedin] callback failed", err);
    return oauthErrorRedirect(request, "linkedin", "exchange_failed");
  }
}
