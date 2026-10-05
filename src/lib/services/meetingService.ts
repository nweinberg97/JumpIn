import { ApiError, api } from "./http";

/**
 * Creates Google Meet links.
 *
 * Real path (Google connected): POST /api/meetings → Calendar API
 * events.insert with conferenceData.createRequest (hangoutsMeet) → the
 * event's hangoutLink.
 *
 * Demo path: hands off to https://meet.google.com/new, which opens a fresh,
 * real Meet in whatever Google account the browser is signed into. The rest
 * of the flow is identical.
 */

export interface MeetingResult {
  meetingUrl: string;
  eventId?: string;
  htmlLink?: string;
  source: "google" | "demo";
  /** Why we fell back to demo, for the UI's "demo mode" note. */
  demoReason?: "not-configured" | "not-connected" | "error";
}

export const DEMO_MEET_URL = "https://meet.google.com/new";

interface CreateMeetingInput {
  memberId: string;
  title: string;
  description?: string;
  /** ISO times. Omit for an instant JumpIn (starts now, 30 minutes). */
  start?: string;
  end?: string;
  /** Add the other member as a guest (their email is resolved server-side). */
  inviteMember?: boolean;
}

async function create(input: CreateMeetingInput): Promise<MeetingResult> {
  try {
    const res = await api<{ meetingUrl: string; eventId: string; htmlLink?: string }>("/api/meetings", {
      json: input,
    });
    return { ...res, source: "google" };
  } catch (err) {
    const status = err instanceof ApiError ? err.status : 0;
    return {
      meetingUrl: DEMO_MEET_URL,
      source: "demo",
      demoReason:
        status === 501 || status === 404 || status === 0
          ? "not-configured"
          : status === 401
            ? "not-connected"
            : "error",
    };
  }
}

export const meetingService = {
  createInstant(input: Omit<CreateMeetingInput, "start" | "end">) {
    return create(input);
  },
  createScheduled(input: CreateMeetingInput & { start: string; end: string }) {
    return create({ ...input, inviteMember: true });
  },
};
