/**
 * Calls Supabase Edge Function `vision-report` (DreamScape™ Vision Report™).
 * Uses the public anon key — Edge Function uses service role to insert into `dream_profiles`.
 */
export type VisionReportRequest = {
  name: string;
  email: string;
  business_name?: string;
  organization_type?: string;
  industry?: string;
  /** ElevenLabs conversation id — server fetches full transcript when set */
  conversation_id?: string;
  /** Used when no conversation_id, or as fallback if transcript fetch fails */
  conversation_summary?: string;
};

export type VisionReportResponse =
  | { success: true; profile_id: string; report_html: string }
  | { success: false; error: string };

export function getVisionReportFunctionUrl(): string {
  const base = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, "").trim() ?? "";
  if (!base) return "";
  return `${base}/functions/v1/vision-report`;
}

export async function invokeVisionReport(payload: VisionReportRequest): Promise<VisionReportResponse> {
  const url = getVisionReportFunctionUrl();
  const key = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? "";
  if (!url || !key) {
    return { success: false, error: "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY." };
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  let data: unknown;
  try {
    data = JSON.parse(text) as unknown;
  } catch {
    return { success: false, error: text.slice(0, 200) || `Request failed (${res.status})` };
  }

  const obj = data as Record<string, unknown>;

  if (obj.success === false && typeof obj.error === "string") {
    return { success: false, error: obj.error };
  }

  if (!res.ok) {
    const err = typeof obj.error === "string" ? obj.error : `Request failed (${res.status})`;
    return { success: false, error: err };
  }

  if (obj.success === true && typeof obj.profile_id === "string" && typeof obj.report_html === "string") {
    return { success: true, profile_id: obj.profile_id, report_html: obj.report_html };
  }

  return { success: false, error: "Unexpected response from vision-report" };
}
