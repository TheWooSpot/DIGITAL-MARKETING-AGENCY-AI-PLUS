import type { DiagnosticResult } from "../components/DiagnosticForm";

/** Server-side: fetch one prospect row by public share_token (RPC must exist in Supabase). */
export async function getProspectByShareToken(token: string): Promise<Record<string, unknown> | null> {
  const trimmed = token.trim();
  if (!trimmed) return null;

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!base || !key) {
    console.warn("getProspectByShareToken: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY");
    return null;
  }

  const res = await fetch(`${base}/rest/v1/rpc/get_prospect_by_share_token`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_token: trimmed }),
    next: { revalidate: 120 },
  });

  if (!res.ok) return null;
  const rows = (await res.json()) as unknown;
  if (!Array.isArray(rows) || rows.length === 0) return null;
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
  };
}
