import "server-only";

/**
 * Fixed-window rate limiting, kept in memory.
 *
 * A stopgap until the database lands: on a serverless host each instance
 * keeps its own counts, so this slows abuse down rather than stopping a
 * determined attacker. With Supabase in place, swap the body of `take` for a
 * call to `public.take_rate_limit(...)` (see supabase/migrations), which
 * shares one count across every instance. Callers don't change.
 */

interface Window {
  start: number;
  count: number;
}

const windows = new Map<string, Window>();

export interface Limit {
  /** Requests allowed per window. */
  max: number;
  /** Window length in seconds. */
  windowSeconds: number;
}

export const LIMITS = {
  invite: { max: 10, windowSeconds: 60 * 60 },
  meeting: { max: 30, windowSeconds: 60 * 60 },
} satisfies Record<string, Limit>;

/** Counts one use of `action` by `subject`; false once the limit is reached. */
export function take(subject: string, action: keyof typeof LIMITS, now = Date.now()): boolean {
  const { max, windowSeconds } = LIMITS[action];
  const span = windowSeconds * 1000;
  const start = Math.floor(now / span) * span;
  const key = `${action}:${subject}`;
  const current = windows.get(key);
  const w = current && current.start === start ? current : { start, count: 0 };
  w.count += 1;
  windows.set(key, w);
  if (windows.size > 10_000) prune(now);
  return w.count <= max;
}

function prune(now: number) {
  for (const [key, w] of windows) {
    const action = key.slice(0, key.indexOf(":")) as keyof typeof LIMITS;
    const span = (LIMITS[action]?.windowSeconds ?? 3600) * 1000;
    if (w.start + span <= now) windows.delete(key);
  }
}

/** Test hook. */
export function resetRateLimits() {
  windows.clear();
}
