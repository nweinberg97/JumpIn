import "server-only";
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "./env";

/**
 * Minimal, dependency-free crypto for the prototype:
 *  - seal/unseal: AES-256-GCM authenticated encryption for cookie payloads
 *    (sessions and provider tokens), so tokens are never readable or
 *    forgeable client-side.
 *  - sign/verify: HMAC-SHA256 for invite links.
 * Both are keyed from SESSION_SECRET with domain separation.
 */

function key(purpose: "seal" | "sign") {
  const secret = env.sessionSecret();
  if (!secret) throw new Error("SESSION_SECRET is not set");
  return createHash("sha256").update(`jumpin:${purpose}:${secret}`).digest();
}

const b64url = (buf: Buffer) => buf.toString("base64url");

export function seal(value: unknown): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key("seal"), iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return b64url(Buffer.concat([iv, cipher.getAuthTag(), data]));
}

export function unseal<T>(token: string | undefined | null): T | null {
  if (!token) return null;
  try {
    const raw = Buffer.from(token, "base64url");
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const data = raw.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", key("seal"), iv);
    decipher.setAuthTag(tag);
    const text = Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export function sign(text: string): string {
  return b64url(createHmac("sha256", key("sign")).update(text).digest());
}

export function verify(text: string, signature: string): boolean {
  const expected = Buffer.from(sign(text));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function randomToken(bytes = 32) {
  return b64url(randomBytes(bytes));
}

/** PKCE S256 code challenge for a verifier. */
export function pkceChallenge(verifier: string) {
  return b64url(createHash("sha256").update(verifier).digest());
}
