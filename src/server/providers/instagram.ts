import "server-only";
import { postForm } from "../oauth";

/**
 * Instagram — "Instagram API with Instagram Login".
 *
 * The Instagram Basic Display API (personal accounts) was retired by Meta on
 * 4 December 2024. The supported path today only works for Instagram
 * Business and Creator accounts, with the instagram_business_basic scope.
 * JumpIn uses it purely to verify a handle: we read the username once and
 * discard the token.
 */

export const INSTAGRAM = {
  authorizeUrl: "https://www.instagram.com/oauth/authorize",
  tokenUrl: "https://api.instagram.com/oauth/access_token",
  meUrl: "https://graph.instagram.com/me",
  scope: "instagram_business_basic",
};

type TokenResponse =
  | { access_token: string; user_id: string | number }
  | { data: Array<{ access_token: string; user_id: string | number }> };

export async function exchangeInstagramCode(opts: {
  code: string;
  redirectUri: string;
  clientId: string;
  clientSecret: string;
}) {
  const raw = await postForm<TokenResponse>(INSTAGRAM.tokenUrl, {
    client_id: opts.clientId,
    client_secret: opts.clientSecret,
    grant_type: "authorization_code",
    redirect_uri: opts.redirectUri,
    code: opts.code,
  });
  const token = "data" in raw ? raw.data[0] : raw;
  const url = new URL(INSTAGRAM.meUrl);
  url.searchParams.set("fields", "user_id,username");
  url.searchParams.set("access_token", token.access_token);
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Instagram profile request failed (${res.status})`);
  const me = (await res.json()) as { user_id?: string; id?: string; username: string };
  return { userId: String(me.user_id ?? me.id ?? token.user_id), username: me.username };
}
