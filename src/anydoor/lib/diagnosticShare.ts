/** URL-safe share token for layer5_prospects.share_token (client-generated). */
export function generateShareToken(): string {
  const raw = btoa(`${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`);
  let s = raw.replace(/[^a-zA-Z0-9]/g, "");
  while (s.length < 16) {
    s += Math.random().toString(36).slice(2);
    s = s.replace(/[^a-zA-Z0-9]/g, "");
  }
  return s.slice(0, 16);
}

export function getReportShareBaseUrl(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  const fromEnv = import.meta.env.VITE_SITE_URL as string | undefined;
  return fromEnv?.replace(/\/$/, "") ?? "https://socialutely-any-door-engine.vercel.app";
}
