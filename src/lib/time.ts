import type { WeeklySlot } from "./types";

/**
 * Small timezone toolkit built on Intl so we don't need a date library.
 * Weekly availability is stored in each member's own timezone; slots are
 * converted to absolute instants and displayed in the viewer's timezone.
 */

export interface Interval {
  start: number; // epoch ms
  end: number;
}

function partsIn(ms: number, timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    weekday: "short",
  });
  const out: Record<string, string> = {};
  for (const p of fmt.formatToParts(ms)) out[p.type] = p.value;
  return {
    year: Number(out.year),
    month: Number(out.month),
    day: Number(out.day),
    hour: Number(out.hour) % 24,
    minute: Number(out.minute),
    second: Number(out.second),
    weekday: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(out.weekday),
  };
}

/** Offset of `timeZone` from UTC at the given instant, in ms. */
function offsetAt(ms: number, timeZone: string) {
  const p = partsIn(ms, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(ms / 1000) * 1000;
}

/** Wall-clock time in a timezone → epoch ms (DST-safe). */
export function zonedToEpoch(
  y: number,
  m: number,
  d: number,
  hhmm: string,
  timeZone: string,
): number {
  const [h, min] = hhmm.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, h, min);
  let ms = guess - offsetAt(guess, timeZone);
  const corrected = guess - offsetAt(ms, timeZone);
  if (corrected !== ms) ms = corrected;
  return ms;
}

export function viewerTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/** "Pacific Daylight Time" style label for the viewer's zone. */
export function timeZoneLabel(timeZone: string, at = Date.now()) {
  try {
    const part = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "long" })
      .formatToParts(at)
      .find((p) => p.type === "timeZoneName");
    return part?.value ?? timeZone;
  } catch {
    return timeZone;
  }
}

export function cityFromTimeZone(timeZone: string) {
  return timeZone.split("/").pop()?.replace(/_/g, " ") ?? timeZone;
}

export function overlaps(a: Interval, b: Interval) {
  return a.start < b.end && b.start < a.end;
}

export interface Slot extends Interval {
  /** Key for React + selection. */
  id: string;
}

/**
 * Bookable 30-minute slots from a member's weekly availability over the next
 * `daysAhead` days, minus anything that collides with `busy`.
 */
export function buildSlots(opts: {
  weekly: WeeklySlot[];
  memberTimeZone: string;
  busy: Interval[];
  now?: number;
  daysAhead?: number;
  durationMinutes?: number;
  leadMinutes?: number;
  /** Only offer times inside these local hours for the person booking. */
  viewerTimeZone?: string;
  viewerHours?: [number, number];
}): { slots: Slot[]; hiddenForBusy: number; hiddenForHours: number } {
  const {
    weekly,
    memberTimeZone,
    busy,
    now = Date.now(),
    daysAhead = 14,
    durationMinutes = 30,
    leadMinutes = 60,
    viewerTimeZone,
    viewerHours = [7, 22],
  } = opts;
  const step = durationMinutes * 60_000;
  const earliest = now + leadMinutes * 60_000;
  const slots: Slot[] = [];
  let hiddenForBusy = 0;
  let hiddenForHours = 0;

  for (let i = 0; i < daysAhead; i++) {
    const p = partsIn(now + i * 86_400_000, memberTimeZone);
    for (const w of weekly.filter((w) => w.day === p.weekday)) {
      const start = zonedToEpoch(p.year, p.month, p.day, w.start, memberTimeZone);
      const end = zonedToEpoch(p.year, p.month, p.day, w.end, memberTimeZone);
      for (let t = start; t + step <= end; t += step) {
        if (t < earliest) continue;
        if (viewerTimeZone) {
          const local = partsIn(t, viewerTimeZone);
          const endLocal = partsIn(t + step, viewerTimeZone);
          const endHour = endLocal.hour + endLocal.minute / 60 || 24;
          if (local.hour < viewerHours[0] || endHour > viewerHours[1]) {
            hiddenForHours++;
            continue;
          }
        }
        const slot = { id: `${t}`, start: t, end: t + step };
        if (busy.some((b) => overlaps(b, slot))) {
          hiddenForBusy++;
          continue;
        }
        slots.push(slot);
      }
    }
  }
  slots.sort((a, b) => a.start - b.start);
  // De-duplicate in case two weekly windows overlap.
  return {
    slots: slots.filter((s, i) => i === 0 || s.start !== slots[i - 1].start),
    hiddenForBusy,
    hiddenForHours,
  };
}

/** Group slots by the viewer-local calendar day. */
export function groupByDay(slots: Slot[], timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
  const map = new Map<string, Slot[]>();
  for (const s of slots) {
    const key = fmt.format(s.start);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(s);
  }
  return [...map.entries()].map(([key, daySlots]) => ({ key, slots: daySlots, first: daySlots[0].start }));
}

export function formatTime(ms: number, timeZone?: string) {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone }).format(ms);
}

export function formatDay(ms: number, timeZone?: string, style: "short" | "long" = "short") {
  return new Intl.DateTimeFormat("en-US", {
    weekday: style === "short" ? "short" : "long",
    month: "short",
    day: "numeric",
    timeZone,
  }).format(ms);
}

/** "Thu, Oct 8 · 10:00 AM" */
export function formatWhen(ms: number, timeZone?: string) {
  return `${formatDay(ms, timeZone)} · ${formatTime(ms, timeZone)}`;
}

/** "3 days ago", "in 2 hours" */
export function relativeTime(ms: number, now = Date.now()) {
  const diff = ms - now;
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["day", 86_400_000],
    ["hour", 3_600_000],
    ["minute", 60_000],
  ];
  for (const [unit, size] of units) {
    if (abs >= size || unit === "minute") return rtf.format(Math.round(diff / size), unit);
  }
  return "just now";
}

/** Local wall-clock time for a member, e.g. "4:12 PM in London". */
export function localTimeFor(timeZone: string, now = Date.now()) {
  return formatTime(now, timeZone);
}

export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** "09:00" → "9:00 AM" */
export function formatHHMM(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

/**
 * A believable demo calendar for the viewer, so the scheduler visibly avoids
 * double-booking even without Google connected: lunch every weekday and a
 * couple of afternoon meetings.
 */
export function demoBusy(timeZone: string, now = Date.now(), daysAhead = 14): Interval[] {
  const busy: Interval[] = [];
  for (let i = 0; i < daysAhead; i++) {
    const p = partsIn(now + i * 86_400_000, timeZone);
    if (p.weekday === 0 || p.weekday === 6) continue;
    const at = (hhmm: string) => zonedToEpoch(p.year, p.month, p.day, hhmm, timeZone);
    busy.push({ start: at("12:00"), end: at("13:00") });
    if (p.weekday === 2 || p.weekday === 4) busy.push({ start: at("09:30"), end: at("10:30") });
    if (p.weekday === 3) busy.push({ start: at("15:00"), end: at("16:30") });
  }
  return busy;
}
