import "server-only";
import type { InvitePayload } from "@/lib/invite";
import { env } from "./env";

/**
 * Transactional email via Resend's REST API (no SDK needed). Invites come
 * from a JumpIn address, so neither person's email is exposed to the other.
 */

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function inviteEmail(payload: InvitePayload, links: { yes: string; no: string; view: string }) {
  const from = payload.fromName.split(" ")[0];
  const noteHtml = escape(payload.note).replace(/\n/g, "<br>");
  const subject = "Connecting via JumpIn";
  const button = (href: string, label: string, primary: boolean) =>
    `<a href="${href}" style="display:inline-block;padding:12px 28px;border-radius:10px;font-weight:600;text-decoration:none;font-family:Arial,sans-serif;${
      primary ? "background:#5B7FE3;color:#fff;" : "background:#fff;color:#14161C;border:1.5px solid #14161C;"
    }">${label}</a>`;
  const html = `<!doctype html><html><body style="margin:0;background:#F7F5F0;padding:32px 16px;font-family:Arial,sans-serif;color:#14161C">
<table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;border:1px solid #E4E1D8">
<tr><td style="padding:28px 32px 8px;font-size:15px;line-height:1.6">${noteHtml}</td></tr>
<tr><td style="padding:24px 32px 8px;font-size:18px;font-weight:600">Are you still free to connect with ${escape(from)}?</td></tr>
<tr><td style="padding:8px 32px 28px">${button(links.yes, "Yes, join the call", true)}&nbsp;&nbsp;${button(links.no, "Not right now", false)}</td></tr>
<tr><td style="padding:0 32px 28px;font-size:12px;color:#858A96">Sent by JumpIn on behalf of ${escape(payload.fromName)}. Your email address was not shared. <a href="${links.view}" style="color:#5B7FE3">View in browser</a></td></tr>
</table></body></html>`;
  const text = `${payload.note}\n\nAre you still free to connect with ${from}?\nYes: ${links.yes}\nNot right now: ${links.no}`;
  return { subject, html, text };
}

export async function sendEmail(message: { to: string; subject: string; html: string; text: string }) {
  const cfg = env.email();
  if (!cfg) throw new Error("Email is not configured");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${cfg.apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({ from: cfg.from, to: [message.to], subject: message.subject, html: message.html, text: message.text }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()) as { id: string };
}
