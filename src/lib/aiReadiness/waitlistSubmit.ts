import { getSupabaseBrowserClient } from "@/anydoor/lib/supabaseBrowserClient";

export type WaitlistPayload = {
  name: string;
  email: string;
  url: string | null;
  rung: 2 | 3 | 4;
  package_preference: string | null;
  source: "rung2-landing" | "rung3-landing" | "rung4-landing";
};

export async function submitAiReadinessWaitlist(payload: WaitlistPayload): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    return { ok: false, message: "Supabase is not configured (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)." };
  }

  // created_at uses DB default (now()); do not send from the client.
  const { error } = await supabase.from("ai_readiness_waitlist").insert({
    name: payload.name.trim() || null,
    email: payload.email.trim(),
    url: payload.url?.trim() || null,
    rung: payload.rung,
    package_preference: payload.package_preference?.trim() || null,
    source: payload.source,
  });

  if (error) {
    return { ok: false, message: error.message };
  }
  return { ok: true };
}
