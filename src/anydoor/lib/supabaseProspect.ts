import type { DiagnosticResult } from "../DiagnosticForm";
import { normalizeReportPathToken } from "./diagnosticShare";

/**
 * Client fetch: one row from layer5_prospects where share_token = p_token.
 * Uses RPC public.get_prospect_by_share_token (SECURITY DEFINER) — see supabase/migrations.
 */
export async function getProspectByShareToken(pathToken: string): Promise<Record<string, unknown> | null> {
  const token = normalizeReportPathToken(pathToken);
  if (!token) return null;

  const base = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, "");
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!base || !key) {
    console.warn(
      "getProspectByShareToken: missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — shared reports cannot load. Set them in .env.local and Vercel."
    );
    return null;
  }

  const res = await fetch(`${base}/rest/v1/rpc/get_prospect_by_share_token`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
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
        recommended_tier: r.recommended_tier ?? "Essentials",
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
    recommended_tier: String(row.recommended_tier ?? "Essentials"),
    prospect_summary: String(row.prospect_summary ?? ""),
    estimated_monthly_value: Number(row.estimated_value ?? 0),
    share_token: row.share_token != null ? String(row.share_token) : undefined,
    share_url:
      typeof row.share_url === "string" && row.share_url.trim() ? row.share_url.trim() : undefined,
  };
}
