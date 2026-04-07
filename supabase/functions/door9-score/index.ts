/**
 * Socialutely — Door 9 AI IQ™ scoring (Edge Function)
 * ==================================================
 * AI IQ v3: 22 question IDs (AIQ1–AIQ22), 7 scored domains (max 100 total).
 * AIQ22 = Organizational Context — unscored; pass-through for report framing only.
 *
 * Rung routing (total scored 0–100):
 *   0–40  → Rung 2 (Adaptation™)
 *   41–70 → Rung 3 (Optimization™)
 *   71–100 → Rung 4 (Stewardship™)
 *
 * POST body (any of):
 *   - { "tally_submission_id": "<id>", "AIQ1": 5, "AIQ2": 3, ... "AIQ22": "optional text or number" }
 *   - { "tally_submission_id": "<id>", "scores": { "AIQ1": 5, ... } }
 *
 * Optional: "persist": true (default) — PATCH `door9_submissions` where tally_submission_id matches.
 *
 * Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Optional: DOOR9_SCORE_SECRET — if set, require Authorization: Bearer <secret> or x-door9-secret header.
 */
export const DOOR9_SCORE_VERSION = 3;

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-door9-secret",
  "Access-Control-Expose-Headers": "x-door9-score-version",
};

const FN_HEADERS = {
  "x-door9-score-version": String(DOOR9_SCORE_VERSION),
} as const;

/** Per-domain max points (sum = 100). */
const DOMAIN_MAX = {
  deployment_depth: 15,
  integration_maturity: 15,
  revenue_alignment: 20,
  automation_orchestration: 15,
  oversight_awareness: 10,
  team_human_readiness: 15,
  strategic_leadership: 10,
} as const;

type DomainKey = keyof typeof DOMAIN_MAX;

/** AIQ1–AIQ21 → domain. AIQ22 = context only (excluded). */
const QUESTION_DOMAIN = (n: number): DomainKey | "organizational_context" | null => {
  if (n >= 1 && n <= 3) return "deployment_depth";
  if (n >= 4 && n <= 6) return "integration_maturity";
  if (n >= 7 && n <= 9) return "revenue_alignment";
  if (n >= 10 && n <= 12) return "automation_orchestration";
  if (n >= 13 && n <= 15) return "oversight_awareness";
  if (n >= 16 && n <= 18) return "team_human_readiness";
  if (n >= 19 && n <= 21) return "strategic_leadership";
  if (n === 22) return "organizational_context";
  return null;
};

function jsonResponse(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS, ...FN_HEADERS },
  });
}

function parseNumeric(val: unknown): number {
  if (val === null || val === undefined || val === "") return 0;
  const num = typeof val === "number" ? val : parseFloat(String(val).trim());
  return Number.isFinite(num) ? num : 0;
}

/** Extract AIQn → value from flat object or nested `scores`. Later keys win (scores overrides flat). */
function collectQuestionEntries(body: Record<string, unknown>): Array<{ q: number; raw: unknown }> {
  const map = new Map<number, unknown>();
  const scores = body.scores;
  const flat: Record<string, unknown> = { ...body };
  delete flat.scores;
  delete flat.tally_submission_id;
  delete flat.persist;

  const absorb = (obj: Record<string, unknown>) => {
    for (const [k, v] of Object.entries(obj)) {
      const m = /^AIQ(\d+)$/i.exec(String(k).trim());
      if (!m) continue;
      const n = parseInt(m[1], 10);
      if (n < 1 || n > 22) continue;
      map.set(n, v);
    }
  };
  absorb(flat);
  if (scores && typeof scores === "object" && scores !== null) {
    absorb(scores as Record<string, unknown>);
  }
  return Array.from(map.entries()).map(([q, raw]) => ({ q, raw }));
}

export interface AiIqV3ScoreResult {
  schema: "ai_iq_v3";
  ai_iq_score: number;
  ai_iq_band: string;
  domain_scores: Record<DomainKey, number>;
  organizational_context: unknown | null;
  recommended_rung: 2 | 3 | 4;
  recommended_rung_label: string;
  recommended_rung_price: string;
  recommended_rung_type: string;
  /** Raw sums before domain clamp (for debugging). */
  _raw_domain_sums?: Record<DomainKey, number>;
}

function bandFromScore(score: number): string {
  const s = Math.min(100, Math.max(0, Math.round(score)));
  if (s <= 20) return "AI Absent";
  if (s <= 40) return "Experimental";
  if (s <= 60) return "Emerging";
  if (s <= 80) return "Integrated";
  return "Intelligent Infrastructure";
}

function rungFromScore(score: number): Pick<
  AiIqV3ScoreResult,
  "recommended_rung" | "recommended_rung_label" | "recommended_rung_price" | "recommended_rung_type"
> {
  const s = Math.min(100, Math.max(0, score));
  if (s <= 40) {
    return {
      recommended_rung: 2,
      recommended_rung_label: "Adaptation",
      recommended_rung_price: "$297 one-time",
      recommended_rung_type: "one_time",
    };
  }
  if (s <= 70) {
    return {
      recommended_rung: 3,
      recommended_rung_label: "Optimization",
      recommended_rung_price: "From $797",
      recommended_rung_type: "workshop_tiered",
    };
  }
  return {
    recommended_rung: 4,
    recommended_rung_label: "Stewardship",
    recommended_rung_price: "$4,997/quarter",
    recommended_rung_type: "quarterly_contract",
  };
}

/** Sum question scores into domains; clamp each domain to its v3 max. Total = sum of clamped domain scores (max 100). */
export function scoreAiIqV3(entries: Array<{ q: number; raw: unknown }>): AiIqV3ScoreResult {
  const rawSums: Record<DomainKey, number> = {
    deployment_depth: 0,
    integration_maturity: 0,
    revenue_alignment: 0,
    automation_orchestration: 0,
    oversight_awareness: 0,
    team_human_readiness: 0,
    strategic_leadership: 0,
  };
  let organizational_context: unknown | null = null;

  for (const { q, raw } of entries) {
    const domain = QUESTION_DOMAIN(q);
    if (domain === "organizational_context") {
      organizational_context = raw ?? null;
      continue;
    }
    if (domain == null) continue;
    const pts = parseNumeric(raw);
    rawSums[domain] += pts;
  }

  const domain_scores = {} as Record<DomainKey, number>;
  let total = 0;
  for (const key of Object.keys(DOMAIN_MAX) as DomainKey[]) {
    const max = DOMAIN_MAX[key];
    const clamped = Math.min(max, Math.max(0, Math.round(rawSums[key])));
    domain_scores[key] = clamped;
    total += clamped;
  }

  const ai_iq_score = Math.min(100, total);

  return {
    schema: "ai_iq_v3",
    ai_iq_score,
    ai_iq_band: bandFromScore(ai_iq_score),
    domain_scores,
    organizational_context,
    ...rungFromScore(ai_iq_score),
    _raw_domain_sums: rawSums,
  };
}

function buildSupabasePatch(result: AiIqV3ScoreResult): Record<string, unknown> {
  const d = result.domain_scores;
  return {
    ai_iq_score: result.ai_iq_score,
    ai_iq_band: result.ai_iq_band,
    recommended_rung: result.recommended_rung,
    recommended_rung_label: result.recommended_rung_label,
    recommended_rung_price: result.recommended_rung_price,
    recommended_rung_type: result.recommended_rung_type,
    score_deployment_depth: d.deployment_depth,
    score_integration_maturity: d.integration_maturity,
    score_revenue_alignment: d.revenue_alignment,
    score_automation_orchestration: d.automation_orchestration,
    score_oversight_awareness: d.oversight_awareness,
    score_team_human_readiness: d.team_human_readiness,
    score_strategic_leadership: d.strategic_leadership,
    organizational_context: result.organizational_context,
    ai_iq_schema_version: DOOR9_SCORE_VERSION,
  };
}

async function patchDoor9Submission(
  supabaseUrl: string,
  serviceKey: string,
  tallySubmissionId: string,
  patch: Record<string, unknown>
): Promise<{ ok: boolean; status: number; body: string }> {
  const res = await fetch(
    `${supabaseUrl}/rest/v1/door9_submissions?tally_submission_id=eq.${encodeURIComponent(tallySubmissionId)}`,
    {
      method: "PATCH",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(patch),
    }
  );
  const bodyText = await res.text();
  return { ok: res.ok, status: res.status, body: bodyText };
}

function authorize(req: Request, secret: string | undefined): boolean {
  if (!secret) return true;
  const auth = req.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const header = req.headers.get("x-door9-secret")?.trim() ?? "";
  return bearer === secret || header === secret;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: { ...CORS_HEADERS, ...FN_HEADERS } });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const secret = Deno.env.get("DOOR9_SCORE_SECRET") ?? undefined;
  if (!authorize(req, secret)) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const tallySubmissionId =
    typeof body.tally_submission_id === "string" ? body.tally_submission_id.trim() : "";
  if (!tallySubmissionId) {
    return jsonResponse({ error: "Missing tally_submission_id" }, 400);
  }

  const entries = collectQuestionEntries(body);
  if (entries.length === 0) {
    return jsonResponse({ error: "No AIQ1–AIQ22 fields found (use AIQ1, AIQ2, … or scores: { … })" }, 400);
  }

  const result = scoreAiIqV3(entries);
  const persist = body.persist !== false;

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  let persistResult: { ok: boolean; status: number; error?: string } | null = null;
  if (persist) {
    if (!SUPABASE_URL || !SERVICE_KEY) {
      return jsonResponse({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }, 500);
    }
    const patch = buildSupabasePatch(result);
    const pr = await patchDoor9Submission(SUPABASE_URL, SERVICE_KEY, tallySubmissionId, patch);
    persistResult = pr.ok
      ? { ok: true, status: pr.status }
      : { ok: false, status: pr.status, error: pr.body };
  }

  const { _raw_domain_sums, ...rest } = result;
  return jsonResponse({
    success: true,
    tally_submission_id: tallySubmissionId,
    ...rest,
    raw_domain_sums: _raw_domain_sums,
    persist: persistResult,
  });
});
