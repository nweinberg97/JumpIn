import { NextResponse, type NextRequest } from "next/server";
import { originFor } from "@/server/env";
import { checkIntroToken, INTRO_COOKIE } from "@/server/onboarding";

export const dynamic = "force-dynamic";

/**
 * "Join JumpIn to meet Sarah" from a warm intro. Keeps the (signed) intro
 * link in a short-lived httpOnly cookie while the person signs in; the
 * sign-in callback redeems it. Only valid, unexpired links are kept.
 */
export function GET(request: NextRequest) {
  const origin = originFor(request);
  const token = request.nextUrl.searchParams.get("token") ?? "";
  if (!checkIntroToken(token)) return NextResponse.redirect(new URL("/?intro=invalid#join", origin));
  const response = NextResponse.redirect(new URL("/?intro=1#join", origin));
  response.cookies.set(INTRO_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24,
  });
  return response;
}
