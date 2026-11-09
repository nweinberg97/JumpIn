/**
 * Is the real backend switched on? Only when both public Supabase values are
 * set. Blank → the app runs entirely in demo mode, exactly as before.
 *
 * Next.js inlines NEXT_PUBLIC_* values at build time, so these are written
 * out literally (not looked up by name).
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

export const supabaseConfig: { url: string; key: string } | null = url && key ? { url, key } : null;

/** True when this deployment talks to the real database. */
export const LIVE = supabaseConfig !== null;

/** Storage bucket for profile photos (see supabase/migrations). */
export const AVATAR_BUCKET = "avatars";
