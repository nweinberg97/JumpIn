import { NextResponse, type NextRequest } from "next/server";
import { base64UrlDecode, type InvitePayload } from "@/lib/invite";
import { verify } from "@/server/crypto";
import { env, originFor } from "@/server/env";

export const dynamic = "force-dynamic";

/**
 * The recipient's Yes / No from the email. A valid, unexpired signature on
 * "yes" sends them straight into the Meet; "no" shows a kind decline page.
 */
export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const token = params.get("token") ?? "";
  const answer = params.get("answer");
  const origin = originFor(request);
  const [body, signature] = token.split(".");

  const invalid = () => NextResponse.redirect(new URL("/invite/invalid", origin));
  if (!env.sessionSecret() || !body || !signature || !verify(body, signature)) return invalid();

  let payload: InvitePayload;
  try {
    payload = JSON.parse(base64UrlDecode(body)) as InvitePayload;
  } catch {
    return invalid();
  }
  if (Date.parse(payload.expiresAt) < Date.now()) {
    return NextResponse.redirect(new URL(`/invite/${token}?expired=1`, origin));
  }
  if (answer === "yes") return NextResponse.redirect(payload.meetingUrl);
  return NextResponse.redirect(new URL(`/invite/${token}?answered=no`, origin));
}
