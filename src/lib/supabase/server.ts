import "server-only";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { supabaseConfig } from "./config";

/**
 * Supabase on the server, acting as the signed-in person (their session
 * cookie; row-level security applies). Null in demo mode.
 */
export async function serverClient(): Promise<SupabaseClient | null> {
  if (!supabaseConfig) return null;
  const store = await cookies();
  return createServerClient(supabaseConfig.url, supabaseConfig.key, {
    cookies: {
      getAll() {
        return store.getAll();
      },
      setAll(list: Array<{ name: string; value: string; options: CookieOptions }>) {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // Called from a Server Component, where cookies are read-only. The
          // proxy refreshes the session instead.
        }
      },
    },
  });
}

/**
 * Supabase with the secret key: bypasses row-level security. Server code
 * only, for things members can't do themselves (creating calls and intros,
 * approvals, launch). Null until SUPABASE_SECRET_KEY is set.
 */
export function adminClient(): SupabaseClient | null {
  const secret = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!supabaseConfig || !secret) return null;
  return createClient(supabaseConfig.url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
