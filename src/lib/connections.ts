import type { Connection } from "./types";

export type DisplayStatus = "upcoming" | "live" | "waiting" | "met" | "no-answer" | "declined" | "cancelled";

const INVITE_TTL = 2 * 60 * 60 * 1000;

/** Derive what a connection means *now*: calls end, invites lapse. */
export function displayStatus(c: Connection, now: number): DisplayStatus {
  const start = Date.parse(c.scheduledAt ?? c.createdAt);
  const end = start + c.durationMinutes * 60_000;
  switch (c.status) {
    case "scheduled":
      if (now < start) return "upcoming";
      return now < end ? "live" : "met";
    case "live":
      return now < end ? "live" : "met";
    case "invited":
      return now - Date.parse(c.createdAt) < INVITE_TTL ? "waiting" : "no-answer";
    case "completed":
      return "met";
    case "declined":
      return "declined";
    default:
      return "cancelled";
  }
}
