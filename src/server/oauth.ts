import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { randomToken, safeEqual, seal, unseal } from "./crypto";
import { originFor } from "./env";

/**
 * Shared OAuth plumbing: CSRF `state`, optional PKCE verifier, and a safe
 * post-login redirect, all held in a short-lived encrypted cookie that is
 * scoped to one provider and deleted on use.
 */

export type Provider = "linkedin" | "google" | "instagram";

interface Pending {
  state: string;
  verifier?: string;
  returnTo: string;
  /** "link" = attach to an existing session instead of signing in. */
  intent: "signin" | "link";
  extra?: Record<string, string>;
  exp: number;
}

const cookieName = (p: Provider) => `jumpin_oauth_${p}`;
const TTL_MS = 10 * 60 * 1000;

/** Only same-site relative paths. Blocks open redirects like //evil.com. */
export function safeReturnTo(value: string | null | undefined, fallback = "/auth/complete") {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  return value;
}

export function redirectUri(request: Request, provider: Provider) {
  return `${originFor(request)}/api/auth/${provider}/callback`;
}

export function beginOAuth(
  provider: Provider,
  authorizeUrl: string,
  params: Record<string, string>,
  pending: Omit<Pending, "state" | "exp">,
) {
  const state = randomToken();
  const url = new URL(authorizeUrl);
  for (const [k, v] of Object.entries({ ...params, state })) url.searchParams.set(k, v);
  const response = NextResponse.redirect(url);
  response.cookies.set(cookieName(provider), seal({ ...pending, state, exp: Date.now() + TTL_MS }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth",
    maxAge: TTL_MS / 1000,
  });
  return response;
}

/** Validates state and returns the pending request, or an error code. */
export function completeOAuth(
  provider: Provider,
  request: NextRequest,
): { ok: true; code: string; pending: Pending } | { ok: false; error: string } {
  const params = request.nextUrl.searchParams;
  if (params.get("error")) return { ok: false, error: params.get("error") ?? "denied" };
  const pending = unseal<Pending>(request.cookies.get(cookieName(provider))?.value);
  const state = params.get("state");
  const code = params.get("code");
  if (!pending || !state || !code) return { ok: false, error: "missing_state" };
  if (pending.exp < Date.now()) return { ok: false, error: "expired" };
  if (!safeEqual(pending.state, state)) return { ok: false, error: "state_mismatch" };
  return { ok: true, code, pending };
}

export function clearPending(response: NextResponse, provider: Provider) {
  response.cookies.set(cookieName(provider), "", { path: "/api/auth", maxAge: 0 });
}

/** Send the browser back to the landing page with a readable error. */
export function oauthErrorRedirect(request: NextRequest, provider: Provider, error: string) {
  const url = new URL("/", originFor(request));
  url.searchParams.set("auth", "error");
  url.searchParams.set("provider", provider);
  url.searchParams.set("reason", error);
  const response = NextResponse.redirect(url);
  clearPending(response, provider);
  return response;
}

export function notConfiguredRedirect(request: NextRequest, provider: Provider) {
  const url = new URL("/", originFor(request));
  url.searchParams.set("auth", "not-configured");
  url.searchParams.set("provider", provider);
  return NextResponse.redirect(url);
}

export async function postForm<T>(url: string, form: Record<string, string>, headers?: Record<string, string>) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json", ...headers },
    body: new URLSearchParams(form),
    cache: "no-store",
  });
  const body = (await res.json().catch(() => ({}))) as T & { error?: string; error_description?: string };
  if (!res.ok) throw new Error(body.error_description ?? body.error ?? `HTTP ${res.status}`);
  return body;
}

export async function getJson<T>(url: string, accessToken: string) {
  const res = await fetch(url, {
    headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${new URL(url).host}`);
  return (await res.json()) as T;
}
