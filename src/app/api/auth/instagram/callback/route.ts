import { NextResponse, type NextRequest } from "next/server";
import { env, originFor } from "@/server/env";
import { clearPending, completeOAuth, oauthErrorRedirect, redirectUri } from "@/server/oauth";
import { exchangeInstagramCode } from "@/server/providers/instagram";
import { readSession, writeSession } from "@/server/session";

export async function GET(request: NextRequest) {
  const cfg = env.instagram();
  if (!cfg) return oauthErrorRedirect(request, "instagram", "not_configured");
  const result = completeOAuth("instagram", request);
  if (!result.ok) return oauthErrorRedirect(request, "instagram", result.error);

  const existing = readSession(request);
  if (!existing) return oauthErrorRedirect(request, "instagram", "sign_in_first");

  try {
    const ig = await exchangeInstagramCode({
      code: result.code,
      redirectUri: redirectUri(request, "instagram"),
      clientId: cfg.clientId,
      clientSecret: cfg.clientSecret,
    });
    const url = new URL(result.pending.returnTo, originFor(request));
    url.searchParams.set("instagram", ig.username);
    const response = NextResponse.redirect(url);
    writeSession(response, { ...existing, instagram: ig });
    clearPending(response, "instagram");
    return response;
  } catch (err) {
    console.error("[instagram] callback failed", err);
    return oauthErrorRedirect(request, "instagram", "exchange_failed");
  }
}
