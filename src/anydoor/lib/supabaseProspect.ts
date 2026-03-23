import type { DiagnosticResult } from "../DiagnosticForm";

const PROSPECT_ROW_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** True when the path segment looks like a UUID (used only with `?k=` legacy permanent links). */
export function isProspectRowUuid(segment: string): boolean {
  return PROSPECT_ROW_UUID_RE.test(segment);
}

function supabaseAnonConfig(): { base: string; key: string } | null {
  const base = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, "");
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!base || !key) {
    console.warn(
      "Supabase prospect fetch: missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — set in .env.local and Vercel."
    );
    return null;
  }
  return { base, key };
}

function mapLegacyTierLabel(t: string): string {
  const k = t.trim().toLowerCase();
  if (k.includes("ai readiness")) return "Sovereign";
  return t;
}

/**
 * Permanent link: /report/{uuid}?k={report_access_key}
 * RPC public.get_prospect_by_public_access — see supabase/migrations.
 */
export async function getProspectByPublicAccess(
  prospectId: string,
  accessKey: string
): Promise<Record<string, unknown> | null> {
  const id = prospectId;
  const key = accessKey;
  if (!id || !key || !isProspectRowUuid(id)) return null;

  const cfg = supabaseAnonConfig();
  if (!cfg) return null;

  const res = await fetch(`${cfg.base}/rest/v1/rpc/get_prospect_by_public_access`, {
    method: "POST",
    headers: {
      apikey: cfg.key,
      Authorization: `Bearer ${cfg.key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_id: id, p_key: key }),
  });

  const bodyText = await res.text();
  if (!res.ok) {
    console.warn("[getProspectByPublicAccess] RPC failed", { status: res.status, body: bodyText.slice(0, 500) });
    return null;
  }

  let rows: unknown;
  try {
    rows = JSON.parse(bodyText) as unknown;
  } catch {
    return null;
  }
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return rows[0] as Record<string, unknown>;
}

type ApiLookupResult =
  | { kind: "row"; row: Record<string, unknown> | null }
  | { kind: "fallback" };

/**
 * Production (Vercel): POST /api/report-by-token — server runs
 * GET .../layer5_prospects?share_token=eq.<token>&limit=1 with service role (see docs/REPORT-LOOKUP.md).
 * Returns "fallback" when the API is missing (local Vite), misconfigured (503), or errors.
 */
async function getProspectByShareTokenViaServerApi(token: string): Promise<ApiLookupResult> {
  try {
    const res = await fetch("/api/report-by-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    if (res.status === 503) {
      console.warn("[getProspectByShareToken] API not configured (503), trying RPC fallback");
      return { kind: "fallback" };
    }
    if (!res.ok) {
      const t = await res.text();
      console.warn("[getProspectByShareToken] API failed", { status: res.status, body: t.slice(0, 500) });
      return { kind: "fallback" };
    }
    let data: { row?: unknown };
    try {
      data = (await res.json()) as { row?: unknown };
    } catch {
      return { kind: "fallback" };
    }
    if (data.row != null && typeof data.row === "object" && !Array.isArray(data.row)) {
      return { kind: "row", row: data.row as Record<string, unknown> };
    }
    return { kind: "row", row: null };
  } catch {
    return { kind: "fallback" };
  }
}

/**
 * Fallback: anon key → RPC public.get_prospect_by_share_token (SECURITY DEFINER).
 */
async function getProspectByShareTokenViaRpc(token: string): Promise<Record<string, unknown> | null> {
  const cfg = supabaseAnonConfig();
  if (!cfg) return null;

  const res = await fetch(`${cfg.base}/rest/v1/rpc/get_prospect_by_share_token`, {
    method: "POST",
    headers: {
      apikey: cfg.key,
      Authorization: `Bearer ${cfg.key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_token: token }),
  });

  const bodyText = await res.text();
  if (!res.ok) {
    console.warn("[getProspectByShareToken] RPC failed", { status: res.status, body: bodyText.slice(0, 500) });
    return null;
  }

  let rows: unknown;
  try {
    rows = JSON.parse(bodyText) as unknown;
  } catch {
    console.warn("[getProspectByShareToken] invalid JSON from RPC");
    return null;
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    return null;
  }
  return rows[0] as Record<string, unknown>;
}

/**
 * Share link: /report/:token
 * 1) Same-origin POST /api/report-by-token (service role on server — exact table filter).
 * 2) If unavailable, anon RPC get_prospect_by_share_token — see docs/REPORT-LOOKUP.md.
 */
export async function getProspectByShareToken(pathToken: string): Promise<Record<string, unknown> | null> {
  /** Exact `:token` from the URL path — must equal DB `share_token` with no client-side decoding or trimming. */
  const token = pathToken;
  if (!token) return null;

  const api = await getProspectByShareTokenViaServerApi(token);
  if (api.kind === "row") {
    return api.row;
  }

  return getProspectByShareTokenViaRpc(token);
}

export function prospectRowToDiagnosticResult(row: Record<string, unknown>): DiagnosticResult | null {
  const raw = row.raw_result;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const r = raw as Partial<DiagnosticResult>;
    if (r.business_name && r.scores) {
      return {
        business_name: r.business_name,
        industry: r.industry ?? "Unknown",
        estimated_size: r.estimated_size,
        business_address: r.business_address,
        business_phone: r.business_phone,
        pages_checked: r.pages_checked,
        scan_date: r.scan_date,
        benchmark_message: r.benchmark_message,
        benchmark_region: r.benchmark_region,
        category_reports: r.category_reports,
        scores: r.scores,
        detected_gaps: r.detected_gaps ?? [],
        recommended_services: r.recommended_services ?? [],
        recommended_tier: mapLegacyTierLabel(String(r.recommended_tier ?? row.recommended_tier ?? "Essentials")),
        prospect_summary: r.prospect_summary ?? "",
        estimated_monthly_value: r.estimated_monthly_value ?? 0,
        _meta: r._meta,
        share_token: row.share_token != null ? String(row.share_token) : r.share_token,
        share_url:
          typeof r.share_url === "string" && r.share_url.trim()
            ? r.share_url.trim()
            : typeof row.share_url === "string" && row.share_url.trim()
              ? row.share_url.trim()
              : undefined,
      };
    }
  }

  const scores = {
    visibility: Number(row.visibility_score ?? 0),
    engagement: Number(row.engagement_score ?? 0),
    conversion: Number(row.conversion_score ?? 0),
    overall: Number(row.overall_score ?? 0),
  };

  return {
    business_name: String(row.business_name ?? "Business"),
    industry: String(row.industry ?? "Unknown"),
    scores,
    detected_gaps: (row.detected_gaps as DiagnosticResult["detected_gaps"]) ?? [],
    recommended_services: (row.recommended_services as DiagnosticResult["recommended_services"]) ?? [],
    recommended_tier: mapLegacyTierLabel(String(row.recommended_tier ?? "Essentials")),
    prospect_summary: String(row.prospect_summary ?? ""),
    estimated_monthly_value: Number(row.estimated_value ?? 0),
    share_token: row.share_token != null ? String(row.share_token) : undefined,
    share_url:
      typeof row.share_url === "string" && row.share_url.trim() ? row.share_url.trim() : undefined,
  };
}
