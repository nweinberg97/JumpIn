import "server-only";
import { env } from "./env";

/**
 * Private contact details, kept on the server.
 *
 * Members' emails are never sent to other members' browsers: the client
 * refers to people by id and the server resolves the address only at the
 * moment it sends an invite or adds a calendar guest. In a real backend this
 * is a lookup against the auth/users table.
 *
 * The seeded members use reserved example.com-style addresses, which nothing
 * will deliver to. Set INVITE_TEST_RECIPIENT to route every invite and
 * calendar guest to your own inbox so you can experience the recipient side.
 */

const SEEDED_EMAILS: Record<string, string> = Object.fromEntries(
  [
    "maddison",
    "kyle",
    "sarah",
    "josh",
    "mark",
    "ally",
    "gita",
    "tony",
    "vasi",
    "ben",
    "ella",
    "kacy",
    "amara",
    "diego",
    "priya",
    "hana",
    "marcus",
    "leila",
    "noa",
    "theo",
  ].map((id) => [id, `${id}@members.jumpin.example`]),
);

/** The address to actually deliver to, or null if there is nowhere real to send. */
export function deliverableEmailFor(memberId: string): string | null {
  const test = env.email()?.testRecipient;
  if (test) return test;
  const email = SEEDED_EMAILS[memberId];
  if (!email || email.endsWith(".example")) return null;
  return email;
}
