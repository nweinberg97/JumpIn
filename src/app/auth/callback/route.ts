import { NextResponse, type NextRequest } from "next/server";
import { serverClient } from "@/lib/supabase/server";
import { originFor } from "@/server/env";
import { afterSignIn, INTRO_COOKIE } from "@/server/onboarding";

export const dynamic = "force-dynamic";

/**
 * Where Google / LinkedIn send people back after signing in through
 * Supabase. Swaps the one-time code for a session cookie, then hands over
 * to /auth/complete, which loads the profile and routes onward.
 */
export async function GET(request: NextRequest) {
  const origin = originFor(request);
  const params = request.nextUrl.searchParams;
  const next = params.get("next");
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "";
  const fail = (reason: string) =>
    NextResponse.redirect(new URL(`/?auth=error&reason=${encodeURIComponent(reason)}`, origin));

  if (params.get("error")) return fail(params.get("error_description") ?? params.get("error")!);
  const code = params.get("code");
  const supabase = await serverClient();
  if (!supabase) return NextResponse.redirect(new URL("/?auth=not-configured", origin));
  if (!code) return fail("missing_code");

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return fail(error.message);

  // Verified badge, warm intro, first emails (see server/onboarding.ts).
  const introToken = request.cookies.get(INTRO_COOKIE)?.value;
  if (data.user) {
    await afterSignIn(data.user, introToken, origin, process.env.NEXT_PUBLIC_DEMO_URL || `${origin}/`);
  }

  const response = NextResponse.redirect(
    new URL(`/auth/complete?live=1${safeNext ? `&next=${encodeURIComponent(safeNext)}` : ""}`, origin),
  );
  if (introToken) response.cookies.set(INTRO_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
