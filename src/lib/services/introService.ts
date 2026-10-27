import { encodeDemoIntro, INTRO_TTL_MS, maskEmail, type IntroPayload } from "../intro";
import type { IntroRecipient, Member, Viewer } from "../types";
import { ApiError, api } from "./http";

/**
 * Sends a warm intro.
 *
 * Real: POST /api/intros checks the Connector badge, signs the link and
 * emails the recipient from a JumpIn address.
 *
 * Demo: builds an unsigned link that shows exactly what the recipient would
 * receive. Only "not configured" / "not signed in" fall back to demo; a
 * real refusal (not a Connector, too many intros) is shown as an error.
 */
export interface IntroResult {
  introUrl: string;
  delivered: boolean;
  source: "email" | "demo";
}

export class IntroError extends Error {}

export const introService = {
  async send(input: {
    introId: string;
    from: Viewer;
    subject: Member;
    recipient: IntroRecipient;
    note: string;
  }): Promise<IntroResult> {
    const subject = {
      id: input.subject.id,
      name: input.subject.name,
      headline: input.subject.headline,
      avatarUrl: input.subject.avatarUrl || undefined,
    };
    try {
      const res = await api<{ introUrl: string; delivered: boolean }>("/api/intros", {
        json: { introId: input.introId, subject, recipient: input.recipient, note: input.note },
      });
      return { ...res, source: res.delivered ? "email" : "demo" };
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0;
      if (status === 403 || status === 429 || status === 400) {
        throw new IntroError(err instanceof Error ? err.message : "Couldn't send that intro");
      }
      const payload: IntroPayload = {
        introId: input.introId,
        fromName: input.from.name,
        fromAvatarUrl: input.from.avatarUrl || undefined,
        subject: {
          ...subject,
          whatIDo: input.subject.whatIDo,
          city: input.subject.city,
          impactAreas: input.subject.impactAreas,
        },
        recipientName: input.recipient.name,
        recipientIsNew: input.recipient.kind === "email",
        recipientEmailHint: input.recipient.kind === "email" ? maskEmail(input.recipient.email) : undefined,
        note: input.note,
        expiresAt: new Date(Date.now() + INTRO_TTL_MS).toISOString(),
      };
      return { introUrl: `/intro/${encodeDemoIntro(payload)}`, delivered: false, source: "demo" };
    }
  },
};
