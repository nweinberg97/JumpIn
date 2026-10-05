import { encodeDemoInvite, type InvitePayload } from "../invite";
import { api } from "./http";

/**
 * Sends the first-time "Are you still free to connect?" invite.
 *
 * Real: POST /api/invites signs an invite token (HMAC) and emails the member
 * from a JumpIn address via Resend. The member's email is looked up on the
 * server and never reaches the sender's browser.
 *
 * Demo: builds an unsigned invite link that renders the same email in-app so
 * you can see exactly what the other person receives.
 */
export interface InviteResult {
  inviteUrl: string;
  delivered: boolean;
  source: "email" | "demo";
}

export const inviteService = {
  async send(payload: InvitePayload): Promise<InviteResult> {
    try {
      const res = await api<{ inviteUrl: string; delivered: boolean }>("/api/invites", { json: payload });
      return { ...res, source: res.delivered ? "email" : "demo" };
    } catch {
      return { inviteUrl: `/invite/${encodeDemoInvite(payload)}`, delivered: false, source: "demo" };
    }
  },
};
