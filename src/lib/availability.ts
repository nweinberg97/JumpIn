import { displayStatus } from "./connections";
import type { AvailabilityStatus, Connection, Member } from "./types";

/** Status after accounting for an expired "open" window. */
export function effectiveStatus(member: Pick<Member, "availability">, now: number): AvailabilityStatus {
  const { status, openUntil } = member.availability;
  if (status === "open" && openUntil && Date.parse(openUntil) <= now) return "later";
  return status;
}

export function isOpenNow(member: Pick<Member, "availability">, now: number) {
  return effectiveStatus(member, now) === "open";
}

/** Milliseconds left in an open window, or null if open-ended / not open. */
export function openRemainingMs(member: Pick<Member, "availability">, now: number): number | null {
  const { status, openUntil } = member.availability;
  if (status !== "open" || !openUntil) return null;
  return Math.max(0, Date.parse(openUntil) - now);
}

/** 5400000 → "1:30:00", 300000 → "5:00" */
export function formatCountdown(ms: number) {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** 5400000 → "1h 30m", 300000 → "5m" */
export function formatDurationShort(ms: number) {
  const mins = Math.max(1, Math.round(ms / 60000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

export const STATUS_COPY: Record<AvailabilityStatus, { label: string; blurb: string }> = {
  open: { label: "Open to JumpIn", blurb: "I'm free and happy to meet someone interesting." },
  later: { label: "Available later", blurb: "Open to connecting, just not right now." },
  unavailable: { label: "Not available", blurb: "Heads down for now." },
};

export function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}

/** You've actually talked: a JumpIn you joined, or a scheduled call that happened. */
export function hasMet(memberId: string, connections: Connection[], now = Date.now()) {
  return connections.some((c) => {
    if (c.otherUserId !== memberId) return false;
    const s = displayStatus(c, now);
    return s === "met" || s === "live";
  });
}

/**
 * How clicking "Jump In" behaves for this person, right now.
 *
 *  direct   → you've met before and they're open: straight into Meet
 *  invite   → first time: send a short note, they say yes, you're in
 *  schedule → they aren't open (or only take instant calls from people
 *             they've met), so book a time instead
 */
export type JumpInRoute =
  | { mode: "direct" }
  | { mode: "invite" }
  | { mode: "schedule"; reason: string };

export function jumpInRoute(member: Member, connections: Connection[], now: number): JumpInRoute {
  const first = firstName(member.name);
  const status = effectiveStatus(member, now);
  if (status === "later") {
    return { mode: "schedule", reason: `${first} isn't free right now, but is happy to find a time.` };
  }
  if (status === "unavailable") {
    return { mode: "schedule", reason: `${first} is heads down right now. Pick a time that works later.` };
  }
  if (member.jumpInPolicy === "nobody") {
    return { mode: "schedule", reason: `${first} is only taking scheduled JumpIns at the moment.` };
  }
  const met = hasMet(member.id, connections, now);
  if (member.jumpInPolicy === "met" && !met) {
    return {
      mode: "schedule",
      reason: `${first} takes instant JumpIns from people they've met. Schedule your first one.`,
    };
  }
  return met ? { mode: "direct" } : { mode: "invite" };
}
