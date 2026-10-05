import type { NextRequest } from "next/server";
import { env, integrationStatus } from "@/server/env";
import { beginOAuth, notConfiguredRedirect, redirectUri, safeReturnTo } from "@/server/oauth";
import { LINKEDIN } from "@/server/providers/linkedin";

/** Step 1: send the browser to LinkedIn's consent screen. */
export function GET(request: NextRequest) {
  const cfg = env.linkedin();
  if (!cfg || !integrationStatus().linkedin) return notConfiguredRedirect(request, "linkedin");
  const returnTo = safeReturnTo(request.nextUrl.searchParams.get("returnTo"));
  return beginOAuth(
    "linkedin",
    LINKEDIN.authorizeUrl,
    {
      response_type: "code",
      client_id: cfg.clientId,
      redirect_uri: redirectUri(request, "linkedin"),
      scope: LINKEDIN.scope,
    },
    { returnTo, intent: "signin" },
  );
}
