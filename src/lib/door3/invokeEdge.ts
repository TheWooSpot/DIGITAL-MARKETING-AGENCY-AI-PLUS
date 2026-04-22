/**
 * Invoke Supabase Edge Functions with the browser anon key (same as supabase.functions.invoke).
 */
export async function invokeSupabaseEdgeFunction(name: string, body: unknown): Promise<Response> {
  const base = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, "");
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!base || !key) {
    return new Response(JSON.stringify({ error: "Supabase not configured" }), { status: 503 });
  }
  return fetch(`${base}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      apikey: key,
    },
    body: JSON.stringify(body),
  });
}
