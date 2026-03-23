import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser-only Supabase client using the **anon** (`VITE_SUPABASE_ANON_KEY`) key.
 * Never instantiate the service role key in the frontend.
 */
let cached: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): SupabaseClient | null {
  const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, "");
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!url || !anonKey) {
    console.warn(
      "[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — shared reports cannot load."
    );
    return null;
  }
  if (!cached) {
    cached = createClient(url, anonKey);
  }
  return cached;
}
