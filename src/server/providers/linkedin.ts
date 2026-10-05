import "server-only";
import { getJson, postForm } from "../oauth";

/**
 * LinkedIn — "Sign In with LinkedIn using OpenID Connect".
 * Scopes: openid profile email. (The legacy r_liteprofile / r_emailaddress
 * scopes and /v2/me profile calls are deprecated for new apps.)
 * Docs: https://learn.microsoft.com/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2
 */

export const LINKEDIN = {
  authorizeUrl: "https://www.linkedin.com/oauth/v2/authorization",
  tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
  userInfoUrl: "https://api.linkedin.com/v2/userinfo",
  scope: "openid profile email",
};

export interface LinkedInUserInfo {
  sub: string;
  name: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  email?: string;
  email_verified?: boolean;
  locale?: unknown;
}

export async function exchangeLinkedInCode(opts: {
  code: string;
  redirectUri: string;
  clientId: string;
  clientSecret: string;
}) {
  const token = await postForm<{ access_token: string; expires_in: number; id_token?: string }>(
    LINKEDIN.tokenUrl,
    {
      grant_type: "authorization_code",
      code: opts.code,
      redirect_uri: opts.redirectUri,
      client_id: opts.clientId,
      client_secret: opts.clientSecret,
    },
  );
  const user = await getJson<LinkedInUserInfo>(LINKEDIN.userInfoUrl, token.access_token);
  return user;
}
