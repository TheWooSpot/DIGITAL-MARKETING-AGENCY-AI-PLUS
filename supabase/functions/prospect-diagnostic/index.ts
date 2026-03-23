/**
 * Socialutely — Prospect Diagnostic Edge Function
 * ===============================================
 * Analyzes a business by URL (using Claude's knowledge), scores it, maps gaps
 * to Socialutely services, and writes the result to layer5_prospects.
 *
 * POST body: { "url": "businessdomain.com", "email": "optional@example.com" }
 * Env: ANTHROPIC_API_KEY, SUPABASE_URL (auto), SUPABASE_SERVICE_ROLE_KEY (auto)
 *
 * Deploy version: confirm in Supabase Dashboard → Edge Functions → prospect-diagnostic
 * matches the project expectation (Phase 2 target: **v16**). Bump dashboard label on each deploy.
 */
export const PROSPECT_DIAGNOSTIC_DEPLOY_VERSION = 16;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Expose-Headers": "x-socialutely-diagnostic-version",
};

const FN_VERSION_HEADERS = {
  "x-socialutely-diagnostic-version": String(PROSPECT_DIAGNOSTIC_DEPLOY_VERSION),
} as const;

/** All catalog service IDs — aligned with docs/Service-Tiers.csv (28 services). */
const ALLOWED_SERVICE_IDS = [
  101, 102, 103, 104, 105, 201, 202, 203, 204, 301, 302, 303, 304, 401, 402, 403, 501, 502, 601, 602,
  701, 801, 802, 901, 1001, 1002, 1003, 1004,
];

const ANTHROPIC_MODEL = "claude-haiku-4-5-20251001";

interface RecommendedServiceEntry {
  service_id: number;
  tier_summary: string;
}

interface DiagnosticResult {
  business_name: string;
  industry: string;
  estimated_size: string;
  scores: { visibility: number; engagement: number; conversion: number; overall: number };
  detected_gaps: Array<{ service_id: number; gap_description: string; priority: string }>;
  recommended_services: RecommendedServiceEntry[];
  recommended_tier: string;
  prospect_summary: string;
  estimated_monthly_value: number;
}

function jsonResponse(data: object, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS, ...FN_VERSION_HEADERS },
  });
}

async function callAnthropic(url: string, apiKey: string): Promise<DiagnosticResult> {
  const systemPrompt = `You are a prospect analyst for Socialutely, a digital marketing agency. Given a business URL (domain only, no fetch), use your knowledge about that business or similar businesses at that domain to produce a structured diagnostic.

Score the business on four dimensions from 0-100:
- visibility: search presence, local visibility, brand discoverability
- engagement: social/email/chat engagement, content effectiveness
- conversion: booking, checkout, lead capture, revenue conversion
- overall: weighted combination; use (visibility + engagement + conversion) / 3 rounded to integer

Map detected gaps to Socialutely service IDs. Only use these IDs: ${ALLOWED_SERVICE_IDS.join(", ")}.
Each gap: service_id (from list), gap_description (short), priority ("high" | "medium" | "low").

Recommend exactly 5 entries from the allowed service IDs. For each, include a concise tier_summary (1-2 sentences) explaining why that service fits this business at the recommended tier.
Recommend one tier: "Essentials" | "Momentum" | "Signature" | "Vanguard" | "Sovereign".

Output valid JSON only, no markdown, with these exact keys:
business_name, industry, estimated_size (e.g. "1-10", "11-50", "51-200", "201+"), scores (object with visibility, engagement, conversion, overall), detected_gaps (array of { service_id, gap_description, priority }), recommended_services (array of exactly 5 objects { service_id, tier_summary } using allowed IDs only), recommended_tier, prospect_summary (2-4 sentences), estimated_monthly_value (number, USD).`;

  const userMessage = `Analyze the business at this URL/domain and return the diagnostic JSON: ${url}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API error: ${res.status} ${err}`);
  }

  const data = (await res.json()) as { content: Array<{ type: string; text?: string }> };
  const text = data.content?.[0]?.text ?? "";
  const parsed = JSON.parse(text) as DiagnosticResult & {
    recommended_services?: unknown;
  };

  const rawRecs = parsed.recommended_services ?? [];
  const normalizedRecs: RecommendedServiceEntry[] = [];
  const seen = new Set<number>();
  for (const item of rawRecs) {
    let sid: number;
    let tier_summary = "";
    if (typeof item === "number") {
      sid = item;
    } else if (item && typeof item === "object" && "service_id" in item) {
      const o = item as { service_id?: number; tier_summary?: string };
      sid = Number(o.service_id);
      tier_summary = typeof o.tier_summary === "string" ? o.tier_summary.trim() : "";
    } else continue;
    if (!ALLOWED_SERVICE_IDS.includes(sid) || seen.has(sid)) continue;
    seen.add(sid);
    normalizedRecs.push({ service_id: sid, tier_summary });
  }
  while (normalizedRecs.length < 5 && ALLOWED_SERVICE_IDS.length > 0) {
    const next = ALLOWED_SERVICE_IDS.find((id) => !seen.has(id));
    if (next == null) break;
    seen.add(next);
    normalizedRecs.push({ service_id: next, tier_summary: "" });
  }
  parsed.recommended_services = normalizedRecs.slice(0, 5);

  const tier = parsed.recommended_tier ?? "Essentials";
  if (!["Essentials", "Momentum", "Signature", "Vanguard", "Sovereign"].includes(tier)) {
    parsed.recommended_tier = "Essentials";
  }

  return parsed;
}

/** Insert and return created row. */
async function insertProspect(
  row: Record<string, unknown>,
  supabaseUrl: string,
  serviceKey: string
): Promise<Record<string, unknown> | null> {
  const res = await fetch(`${supabaseUrl}/rest/v1/layer5_prospects`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(row),
  });

  const bodyText = await res.text();
  if (!res.ok) {
    throw new Error(`Supabase insert failed: ${res.status} ${bodyText}`);
  }
  try {
    const data = JSON.parse(bodyText) as unknown;
    const first = Array.isArray(data) ? data[0] : data;
    if (first && typeof first === "object") return first as Record<string, unknown>;
  } catch {
    /* ignore */
  }
  return null;
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const startTime = Date.now();

  try {
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!ANTHROPIC_API_KEY) throw new Error("Missing ANTHROPIC_API_KEY");
    if (!SUPABASE_URL) throw new Error("Missing SUPABASE_URL");
    if (!SERVICE_KEY) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

    let body: { url?: string; email?: string };
    try {
      body = (await req.json()) as { url?: string; email?: string };
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }

    const url = typeof body.url === "string" ? body.url.trim() : "";
    if (!url) return jsonResponse({ error: "Missing required field: url" }, 400);

    const email = typeof body.email === "string" ? body.email.trim() || null : null;

    /** Public site origin for share links (set in Supabase secrets as DIAGNOSTIC_SHARE_BASE_URL if needed). */
    const shareBase = (
      Deno.env.get("DIAGNOSTIC_SHARE_BASE_URL") ?? "https://socialutely-any-door-engine.vercel.app"
    ).replace(/\/$/, "");

    /** Server-issued raw UUID for share_token — public URL is /report/{share_token} with no encoding step on the client. */
    const share_token = crypto.randomUUID();

    const result = await callAnthropic(url, ANTHROPIC_API_KEY);
    const scores = result.scores ?? {
      visibility: 0,
      engagement: 0,
      conversion: 0,
      overall: 0,
    };

    const share_url = `${shareBase}/report/${share_token}`;

    const prospectRow: Record<string, unknown> = {
      url,
      email,
      share_token,
      business_name: result.business_name ?? "Unknown",
      industry: result.industry ?? "Unknown",
      overall_score: scores.overall ?? 0,
      visibility_score: scores.visibility ?? 0,
      engagement_score: scores.engagement ?? 0,
      conversion_score: scores.conversion ?? 0,
      recommended_tier: result.recommended_tier ?? "Essentials",
      recommended_services: result.recommended_services ?? [],
      detected_gaps: result.detected_gaps ?? [],
      estimated_value: result.estimated_monthly_value ?? 0,
      prospect_summary: result.prospect_summary ?? "",
      source: "prospect-diagnostic",
      raw_result: {
        ...(result as unknown as Record<string, unknown>),
        share_token,
        share_url,
      },
    };

    const inserted = await insertProspect(prospectRow, SUPABASE_URL, SERVICE_KEY);
    const prospectId = inserted?.id != null ? String(inserted.id) : null;

    if (inserted && prospectId) {
      const enrichedRaw = {
        ...(prospectRow.raw_result as Record<string, unknown>),
        prospect_id: prospectId,
      };
      const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/layer5_prospects?id=eq.${encodeURIComponent(prospectId)}`, {
        method: "PATCH",
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({ raw_result: enrichedRaw }),
      });
      if (!patchRes.ok) {
        console.warn("prospect-diagnostic: failed to patch raw_result", await patchRes.text());
      }
    }

    const duration = Date.now() - startTime;

    return jsonResponse({
      business_name: result.business_name,
      industry: result.industry,
      estimated_size: result.estimated_size,
      scores: result.scores,
      detected_gaps: result.detected_gaps,
      recommended_services: result.recommended_services,
      recommended_tier: result.recommended_tier,
      prospect_summary: result.prospect_summary,
      estimated_monthly_value: result.estimated_monthly_value,
      share_token,
      ...(prospectId ? { prospect_id: prospectId } : {}),
      share_url,
      _meta: { duration_ms: duration, saved_to: "layer5_prospects" },
    });
  } catch (err) {
    console.error("prospect-diagnostic error:", err);
    return jsonResponse(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      500
    );
  }
});
