import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseConfig } from "./config";

let client: SupabaseClient | null = null;

/** The browser's Supabase client (row-level security applies), or null in demo mode. */
export function browserClient(): SupabaseClient | null {
  if (!supabaseConfig) return null;
  client ??= createBrowserClient(supabaseConfig.url, supabaseConfig.key);
  return client;
}
