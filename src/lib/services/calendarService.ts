import { demoBusy, type Interval } from "../time";
import { api } from "./http";

/**
 * Busy times for the signed-in viewer, used to avoid double-booking.
 *
 * Real: POST /api/calendar/freebusy → Google Calendar freebusy.query on the
 * viewer's primary calendar (scope calendar.freebusy: busy blocks only, never
 * event titles). Demo: a believable generated calendar.
 */
export const calendarService = {
  async getBusy(range: { timeMin: number; timeMax: number; timeZone: string }): Promise<{
    busy: Interval[];
    source: "google" | "demo";
  }> {
    try {
      const res = await api<{ busy: Array<{ start: string; end: string }> }>("/api/calendar/freebusy", {
        json: {
          timeMin: new Date(range.timeMin).toISOString(),
          timeMax: new Date(range.timeMax).toISOString(),
        },
      });
      return {
        busy: res.busy.map((b) => ({ start: Date.parse(b.start), end: Date.parse(b.end) })),
        source: "google",
      };
    } catch {
      return { busy: demoBusy(range.timeZone, range.timeMin), source: "demo" };
    }
  },
};
