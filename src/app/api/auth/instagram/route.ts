import type { NextRequest } from "next/server";
import { env, integrationStatus } from "@/server/env";
import { beginOAuth, notConfiguredRedirect, redirectUri, safeReturnTo } from "@/server/oauth";
import { INSTAGRAM } from "@/server/providers/instagram";

/** Optional: verify an Instagram handle (Business/Creator accounts only). */
export function GET(request: NextRequest) {
  const cfg = env.instagram();
  if (!cfg || !integrationStatus().instagram) return notConfiguredRedirect(request, "instagram");
  return beginOAuth(
    "instagram",
    INSTAGRAM.authorizeUrl,
    {
      client_id: cfg.clientId,
      redirect_uri: redirectUri(request, "instagram"),
      response_type: "code",
      scope: INSTAGRAM.scope,
    },
    { returnTo: safeReturnTo(request.nextUrl.searchParams.get("returnTo"), "/settings"), intent: "link" },
  );
}
