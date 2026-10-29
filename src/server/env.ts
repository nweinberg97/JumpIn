import "server-only";
import type { IntegrationStatus } from "@/lib/types";

/**
 * Server-only configuration. Secrets are read here and nowhere else; the
 * browser only ever learns *whether* a provider is configured.
 */

const v = (name: string) => {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
};

export const env = {
  appUrl: () => v("APP_URL"),
  sessionSecret: () => v("SESSION_SECRET"),
  linkedin: () => {
    const clientId = v("LINKEDIN_CLIENT_ID");
    const clientSecret = v("LINKEDIN_CLIENT_SECRET");
    return clientId && clientSecret ? { clientId, clientSecret } : null;
  },
  google: () => {
    const clientId = v("GOOGLE_CLIENT_ID");
    const clientSecret = v("GOOGLE_CLIENT_SECRET");
    return clientId && clientSecret ? { clientId, clientSecret } : null;
  },
  instagram: () => {
    const clientId = v("INSTAGRAM_CLIENT_ID");
    const clientSecret = v("INSTAGRAM_CLIENT_SECRET");
    return clientId && clientSecret ? { clientId, clientSecret } : null;
  },
  email: () => {
    const apiKey = v("RESEND_API_KEY");
    const from = v("INVITE_FROM_EMAIL");
    return apiKey && from ? { apiKey, from, testRecipient: v("INVITE_TEST_RECIPIENT") } : null;
  },
  /**
   * Who holds the Connector badge, until the database does: a comma-separated
   * list of email addresses the founder controls. Only these people can send
   * warm intros from a real session.
   */
  connectorEmails: () =>
    new Set(
      (v("CONNECTOR_EMAILS") ?? "")
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean),
    ),
};

/** Whether a signed-in person holds the Connector badge. */
export function isConnectorEmail(email: string | undefined | null) {
  return Boolean(email) && env.connectorEmails().has(email!.trim().toLowerCase());
}

/** A provider only counts as configured if sessions can be secured too. */
export function integrationStatus(): IntegrationStatus {
  const secure = Boolean(env.sessionSecret());
  return {
    linkedin: secure && Boolean(env.linkedin()),
    google: secure && Boolean(env.google()),
    instagram: secure && Boolean(env.instagram()),
    email: secure && Boolean(env.email()),
  };
}

/** Public origin for redirect URIs: APP_URL, else the request's own origin. */
export function originFor(request: Request) {
  return (env.appUrl() ?? new URL(request.url).origin).replace(/\/$/, "");
}
