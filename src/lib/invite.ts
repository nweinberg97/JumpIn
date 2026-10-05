/**
 * Invite links: `/invite/<token>`.
 *
 * A token is `<base64url(json)>.<signature>`. Real tokens are signed on the
 * server with SESSION_SECRET (see src/server/crypto.ts) so the recipient's
 * Yes/No can be trusted. Demo tokens use the literal signature "demo".
 * This module is shared by client and server and does no crypto itself.
 */

export interface InvitePayload {
  /** Connection id on the sender's side. */
  connectionId: string;
  fromName: string;
  fromAvatarUrl?: string;
  fromHeadline?: string;
  toMemberId: string;
  toName: string;
  note: string;
  meetingUrl: string;
  /** ISO time the invite stops being valid. */
  expiresAt: string;
}

export function base64UrlEncode(text: string) {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function base64UrlDecode(b64: string) {
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  const bin = atob(b64.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeDemoInvite(payload: InvitePayload) {
  return `${base64UrlEncode(JSON.stringify(payload))}.demo`;
}

export function decodeInvite(token: string): { payload: InvitePayload; signed: boolean } | null {
  const [body, sig] = decodeURIComponent(token).split(".");
  if (!body || !sig) return null;
  try {
    const payload = JSON.parse(base64UrlDecode(body)) as InvitePayload;
    return { payload, signed: sig !== "demo" };
  } catch {
    return null;
  }
}

export function defaultNote(toFirstName: string, fromFirstName: string) {
  return `Hi ${toFirstName},\n\nI saw you on JumpIn and I think what you're building is awesome! Would love to learn about it if you're still free to chat.\n\nCheers,\n${fromFirstName}`;
}
