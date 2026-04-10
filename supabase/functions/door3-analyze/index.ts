/**
 * Door 3 — Analyze discovery responses (Claude), persist to door3_submissions + layer5_prospects.
 */
const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
};

const MODEL = "claude-sonnet-4-20250514";

function jsonResponse(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

function extractJsonObject(text: string): Record<string, unknown> {
  const t = text.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(t);
  const inner = fence ? fence[1].trim() : t;
  const objStart = inner.indexOf("{");
  const objEnd = inner.lastIndexOf("}");
  if (objStart >= 0 && objEnd > objStart) {
    return JSON.parse(inner.slice(objStart, objEnd + 1)) as Record<string, unknown>;
  }
  return JSON.parse(inner) as Record<string, unknown>;
}

interface RichAnalysis {
  per_question_reflections: Array<{ domain: string; question: string; interpretation: string }>;
  core_tension: string;
  grace_note: string;
  top_gaps: string[];
  recommended_services: Array<{
    service_id: number;
    what_it_is: string;
    benefit_for_you: string;
  }>;
  recommended_tier: string;
  next_step: string;
  next_step_reason: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!ANTHROPIC_API_KEY) return jsonResponse({ error: "Missing ANTHROPIC_API_KEY" }, 500);
  if (!SUPABASE_URL || !SERVICE_KEY) return jsonResponse({ error: "Missing Supabase secrets" }, 500);

  let body: {
    name?: string;
    email?: string;
    url?: string | null;
    industry?: string;
    business_descriptor?: string;
    business_context?: Record<string, unknown>;
    questions_generated?: string[];
    questions?: unknown[];
    responses?: Array<{ question?: string; answer?: string; domain?: string; id?: string }>;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!name || !email) return jsonResponse({ error: "name and email required" }, 400);

  const industry = typeof body.industry === "string" ? body.industry : "Unknown";
  const url = typeof body.url === "string" ? body.url.trim() : "";
  const business_descriptor = typeof body.business_descriptor === "string" ? body.business_descriptor : "";
  const responses = Array.isArray(body.responses) ? body.responses : [];
  const business_context = body.business_context && typeof body.business_context === "object" ? body.business_context : {};

  const qaLines = responses
    .map((r, i) => {
      const q = typeof r.question === "string" ? r.question : "";
      const a = typeof r.answer === "string" ? r.answer : "";
      const d = typeof r.domain === "string" ? r.domain : "";
      return `Q${i + 1} [${d}]: ${q}\nAnswer: ${a}`;
    })
    .join("\n\n");

  const prompt = `You are a senior strategist at Socialutely. A business owner named ${name} (${industry}${business_descriptor ? `, ${business_descriptor}` : ""}) answered 7 self-discovery questions.

Their full Q&A:

${qaLines}

Return ONLY valid JSON (no markdown) with this exact structure:
{
  "per_question_reflections": [
    {
      "domain": "situation|problem|consequence|goal|solution|priority|context",
      "question": "the exact question text they saw",
      "interpretation": "1-2 sentences: reflect core insight from their answer — NOT a restatement. Clarifying mirror. Warm, direct, not clinical. Max 30 words each."
    }
  ],
  "core_tension": "One sentence (max 20 words) naming the single central challenge across ALL answers.",
  "grace_note": "One paragraph. Start with: The clearest signal from this conversation is [one short personalized insight woven in]. Then: That's not a gap to be embarrassed about — it's the exact thing that, when addressed, changes the trajectory. Warm, resolving, honest, forward-looking. Not congratulatory.",
  "top_gaps": ["2-3 short theme labels summarizing tension/friction from their answers"],
  "recommended_services": [
    {
      "service_id": <number from list below only>,
      "what_it_is": "one sentence: what this branded service IS",
      "benefit_for_you": "one sentence: how THIS person's business benefits given what they wrote — reference their context"
    }
  ],
  "recommended_tier": "Essentials | Momentum | Signature | Vanguard",
  "next_step": "diagnostic | ai-iq | calculator | dream",
  "next_step_reason": "one sentence why that next step for this person"
}

Rules for per_question_reflections: exactly 7 entries, same order as Q1–Q7 above. Use the user's domain labels from the Q&A.

For each interpretation, follow this mental prompt: "The user answered self-discovery question: '[question]'. Their answer was: '[answer]'. Write 1-2 sentences that reflect back the core insight — not restatement — clarifying mirror. Max 30 words."

Service IDs allowed (use only these numbers):
101 SearchLift™, 105 NearRank™, 106 AutoRank™,
201 VoiceBridge™, 202 InboxIgnite™, 203 TextPulse™,
301 BookStream™, 302 CloseCraft™, 303 DealDrive™,
401 HubAI™, 402 FlowForge™, 502 Onboardly™,
601 Voice & Vibe™, 701 InsightLoop™,
801 TrustGuard™, 901 AllianceOS™

Pick 2-3 services. Never choose Sovereign tier. recommended_tier: Essentials | Momentum | Signature | Vanguard only.`;

  const ar = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4096,
      temperature: 0.35,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!ar.ok) {
    const err = await ar.text();
    return jsonResponse({ error: `Anthropic error: ${err}` }, 502);
  }

  const ad = (await ar.json()) as { content?: Array<{ text?: string }> };
  const text = ad.content?.[0]?.text ?? "";
  let raw: Record<string, unknown>;
  try {
    raw = extractJsonObject(text);
  } catch (e) {
    return jsonResponse({ error: "Failed to parse analysis JSON", detail: String(e) }, 502);
  }

  const reflections = Array.isArray(raw.per_question_reflections)
    ? (raw.per_question_reflections as Array<Record<string, unknown>>)
        .map((x) => ({
          domain: String(x.domain ?? "").trim(),
          question: String(x.question ?? "").trim(),
          interpretation: String(x.interpretation ?? "").trim(),
        }))
        .slice(0, 7)
    : [];

  const core_tension = String(raw.core_tension ?? "").trim();
  const grace_note = String(raw.grace_note ?? "").trim();
  const top_gaps = Array.isArray(raw.top_gaps)
    ? (raw.top_gaps as unknown[]).map((x) => String(x ?? "").trim()).filter(Boolean).slice(0, 3)
    : [];

  const richServices = Array.isArray(raw.recommended_services)
    ? (raw.recommended_services as Array<Record<string, unknown>>)
        .filter((x) => typeof x.service_id === "number")
        .map((x) => ({
          service_id: x.service_id as number,
          what_it_is: String(x.what_it_is ?? "").trim(),
          benefit_for_you: String(x.benefit_for_you ?? "").trim(),
        }))
        .slice(0, 3)
    : [];

  const recommended_tier = String(raw.recommended_tier ?? "Essentials").trim();
  const next_step = String(raw.next_step ?? "diagnostic").trim();
  const next_step_reason = String(raw.next_step_reason ?? "").trim();

  const allowedTier = ["Essentials", "Momentum", "Signature", "Vanguard"];
  const tier = allowedTier.includes(recommended_tier) ? recommended_tier : "Essentials";

  const allowedNext = ["diagnostic", "ai-iq", "calculator", "dream"];
  const next = allowedNext.includes(next_step) ? next_step : "diagnostic";

  const recommended_services_flat = richServices.map((s) => ({
    service_id: s.service_id,
    reason: s.benefit_for_you || s.what_it_is,
    what_it_is: s.what_it_is,
    benefit_for_you: s.benefit_for_you,
  }));

  const primary_gap = core_tension || "Clarity on the next right move.";
  const discovery_narrative = [grace_note, core_tension].filter(Boolean).join("\n\n");

  const analysisRich: RichAnalysis = {
    per_question_reflections: reflections,
    core_tension,
    grace_note,
    top_gaps,
    recommended_services: richServices,
    recommended_tier: tier,
    next_step: next,
    next_step_reason,
  };

  const questionsJson = body.questions ?? [];
  const questions_generated = Array.isArray(body.questions_generated)
    ? body.questions_generated.map((q) => String(q ?? "").trim()).filter(Boolean).slice(0, 7)
    : [];

  const notesPayload = {
    primary_gap,
    core_tension,
    next_step: next,
    next_step_reason,
    grace_note: grace_note.slice(0, 400),
    top_gaps,
    responses: responses.map((r) => ({
      question: r.question,
      answer: r.answer,
      domain: r.domain,
    })),
  };

  const serviceIds = recommended_services_flat.map((s) => s.service_id);

  const insertSubmission = await fetch(`${SUPABASE_URL}/rest/v1/door3_submissions`, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      email,
      name,
      url: url || null,
      industry,
      questions: questionsJson,
      questions_generated,
      business_context,
      responses,
      discovery_narrative,
      primary_gap,
      recommended_services: recommended_services_flat,
      recommended_tier: tier,
      next_step: next,
      next_step_reason,
      analysis_rich: analysisRich,
    }),
  });

  if (!insertSubmission.ok) {
    console.error("door3_submissions insert failed", await insertSubmission.text());
  }

  const findRes = await fetch(
    `${SUPABASE_URL}/rest/v1/layer5_prospects?email=eq.${encodeURIComponent(email)}&select=id&limit=1`,
    {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    }
  );
  const found = findRes.ok ? ((await findRes.json()) as Array<{ id?: string }>) : [];
  const existingId = found[0]?.id;

  const prospectRow: Record<string, unknown> = {
    business_name: name,
    email,
    url: url || null,
    industry,
    source: "door3-self-discovery",
    recommended_tier: tier,
    recommended_services: serviceIds,
    notes: JSON.stringify(notesPayload),
    prospect_summary: `Door 3 Self-Discovery — ${primary_gap.slice(0, 200)}`,
    overall_score: 0,
    visibility_score: 0,
    engagement_score: 0,
    conversion_score: 0,
    estimated_value: 0,
    detected_gaps: top_gaps,
    share_token: crypto.randomUUID(),
  };

  if (existingId) {
    const patch = await fetch(`${SUPABASE_URL}/rest/v1/layer5_prospects?id=eq.${encodeURIComponent(existingId)}`, {
      method: "PATCH",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        business_name: name,
        url: url || null,
        industry,
        source: "door3-self-discovery",
        recommended_tier: tier,
        recommended_services: serviceIds,
        notes: JSON.stringify(notesPayload),
        prospect_summary: prospectRow.prospect_summary,
        detected_gaps: top_gaps,
      }),
    });
    if (!patch.ok) console.error("layer5 patch failed", await patch.text());
  } else {
    const ins = await fetch(`${SUPABASE_URL}/rest/v1/layer5_prospects`, {
      method: "POST",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(prospectRow),
    });
    if (!ins.ok) console.error("layer5 insert failed", await ins.text());
  }

  return jsonResponse({
    discovery_narrative,
    primary_gap,
    core_tension,
    per_question_reflections: reflections,
    grace_note,
    top_gaps,
    recommended_services: recommended_services_flat,
    recommended_tier: tier,
    next_step: next,
    next_step_reason,
    industry,
    business_descriptor: business_descriptor || null,
  });
});
