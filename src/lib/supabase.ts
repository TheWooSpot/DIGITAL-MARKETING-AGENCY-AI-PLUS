import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

function createSupabaseClient(): SupabaseClient | null {
  const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, "");
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!url || !anonKey) {
    console.warn("[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.");
    return null;
  }
  return createClient(url, anonKey);
}

export const supabase: SupabaseClient | null = (() => {
  if (!cached) cached = createSupabaseClient();
  return cached;
})();
