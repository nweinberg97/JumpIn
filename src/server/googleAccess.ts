import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { integrationStatus } from "./env";
import { freshGoogleTokens, hasCalendarScopes } from "./providers/google";
import { readSession, writeSession, type ServerSessionData } from "./session";

/**
 * Resolves a usable Google access token for API routes, or the exact HTTP
 * error the client's demo fallback keys off:
 *   501 → Google isn't configured on this server
 *   401 → configured, but this person hasn't connected Google Calendar
 */
export async function withGoogle(
  request: NextRequest,
  run: (accessToken: string, session: ServerSessionData) => Promise<NextResponse>,
): Promise<NextResponse> {
  if (!integrationStatus().google) {
    return NextResponse.json({ error: "Google is not configured", code: "not_configured" }, { status: 501 });
  }
  const session = readSession(request);
  if (!session?.google || !hasCalendarScopes(session.google)) {
    return NextResponse.json({ error: "Connect Google Calendar first", code: "not_connected" }, { status: 401 });
  }
  try {
    const { tokens, changed } = await freshGoogleTokens(session.google);
    const updated = { ...session, google: tokens };
    const response = await run(tokens.accessToken, updated);
    if (changed) writeSession(response, updated);
    return response;
  } catch (err) {
    console.error("[google] request failed", err);
    const message = err instanceof Error ? err.message : "Google request failed";
    const expired = message.includes("expired") || message.includes("401");
    return NextResponse.json(
      { error: message, code: expired ? "not_connected" : "google_error" },
      { status: expired ? 401 : 502 },
    );
  }
}
