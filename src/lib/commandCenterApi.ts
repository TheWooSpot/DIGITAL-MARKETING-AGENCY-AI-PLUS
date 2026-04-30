import { getAdminSessionToken } from "@/lib/adminSession";

export type CommandCenterQueryType =
  | "hub_metrics"
  | "door_detail"
  | "timeline_page"
  | "timeline_filter"
  | "cc_log_page_view";

export async function postCommandCenter<T>(body: Record<string, unknown>): Promise<{
  data?: T;
  error?: string;
  status: number;
}> {
  const sessionToken = getAdminSessionToken();
  if (!sessionToken) {
    return { error: "Not signed in.", status: 401 };
  }
  const url = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, "");
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return { error: "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.", status: 0 };
  }
  const res = await fetch(`${url}/functions/v1/admin-command-center-data`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: key,
      Authorization: `Bearer ${key}`,
      "X-Admin-Session": sessionToken,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data: T | undefined;
  try {
    data = text ? (JSON.parse(text) as T) : undefined;
  } catch {
    data = undefined;
  }
  if (!res.ok) {
    const err = (data as { error?: string } | undefined)?.error ?? text.slice(0, 240);
    return { error: err, status: res.status, data };
  }
  return { data, status: res.status };
}
