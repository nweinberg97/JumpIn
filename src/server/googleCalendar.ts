import "server-only";
import { randomUUID } from "node:crypto";

/**
 * Google Calendar API calls. Meet links are created the supported way: an
 * event with conferenceData.createRequest (conferenceSolutionKey
 * "hangoutsMeet") and conferenceDataVersion=1.
 */

const BASE = "https://www.googleapis.com/calendar/v3";

interface CalendarEvent {
  id: string;
  htmlLink?: string;
  hangoutLink?: string;
  conferenceData?: {
    createRequest?: { status?: { statusCode?: "pending" | "success" | "failure" } };
    entryPoints?: Array<{ entryPointType: string; uri: string }>;
  };
}

async function call<T>(accessToken: string, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Google Calendar ${res.status}: ${text.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

function meetUrl(event: CalendarEvent) {
  return (
    event.hangoutLink ??
    event.conferenceData?.entryPoints?.find((e) => e.entryPointType === "video")?.uri
  );
}

export async function createMeetEvent(
  accessToken: string,
  input: {
    summary: string;
    description?: string;
    start: Date;
    end: Date;
    attendees?: string[];
    timeZone?: string;
  },
) {
  const sendUpdates = input.attendees?.length ? "all" : "none";
  let event = await call<CalendarEvent>(
    accessToken,
    `/calendars/primary/events?conferenceDataVersion=1&sendUpdates=${sendUpdates}`,
    {
      method: "POST",
      body: JSON.stringify({
        summary: input.summary,
        description: input.description,
        start: { dateTime: input.start.toISOString(), timeZone: input.timeZone },
        end: { dateTime: input.end.toISOString(), timeZone: input.timeZone },
        attendees: input.attendees?.map((email) => ({ email })),
        conferenceData: {
          createRequest: { requestId: randomUUID(), conferenceSolutionKey: { type: "hangoutsMeet" } },
        },
        reminders: { useDefault: true },
      }),
    },
  );

  // Conference creation is usually synchronous but can come back "pending".
  for (let i = 0; i < 3 && !meetUrl(event); i++) {
    await new Promise((r) => setTimeout(r, 600));
    event = await call<CalendarEvent>(accessToken, `/calendars/primary/events/${encodeURIComponent(event.id)}`);
  }

  const url = meetUrl(event);
  if (!url) throw new Error("Google did not return a Meet link for this event");
  return { meetingUrl: url, eventId: event.id, htmlLink: event.htmlLink };
}

export async function queryFreeBusy(accessToken: string, timeMin: string, timeMax: string) {
  const res = await call<{ calendars: Record<string, { busy: Array<{ start: string; end: string }> }> }>(
    accessToken,
    "/freeBusy",
    { method: "POST", body: JSON.stringify({ timeMin, timeMax, items: [{ id: "primary" }] }) },
  );
  return res.calendars.primary?.busy ?? [];
}
