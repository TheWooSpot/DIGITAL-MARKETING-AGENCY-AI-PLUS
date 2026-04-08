/**
 * Door 3 — Analyze discovery responses (Claude), persist to door3_submissions + layer5_prospects.
 */
const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
};

const MODEL = "claude-haiku-4-5-20251001";

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

interface AnalysisResult {
  discovery_narrative: string;
  primary_gap: string;
  recommended_services: Array<{ service_id: number; reason: string }>;
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

  const qaBlock = responses
    .map((r, i) => {
      const q = typeof r.question === "string" ? r.question : "";
      const a = typeof r.answer === "string" ? r.answer : "";
      const d = typeof r.domain === "string" ? r.domain : "";
      return `Q${i + 1} [${d}]: ${q}\nAnswer: ${a}`;
    })
    .join("\n\n");

  const prompt = `You are a senior business strategist at Socialutely.
A prospect named ${name} from ${industry}${business_descriptor ? ` (${business_descriptor})` : ""} just completed a 7-question discovery session.

Their exact responses:

${qaBlock}

Based ONLY on what they said — not on assumptions — write:

1. discovery_narrative (180-220 words):
   
   This is the most important output. It must feel like someone who was truly listening, not summarizing.
   
   Rules:
   - Start with: 'Here's what I heard you say...'
   - Use their EXACT words and phrases wherever possible.
     If they said 'buy-in to our platform' — use that phrase.
     If they said 'greater and more measurable marketing' — mirror that language back exactly.
   - Reflect the EMOTION behind what they shared, not just the content.
     If they expressed frustration, name it.
     If they expressed excitement, honor it.
   - Name what they want as if you can see it clearly — even if they only half-articulated it.
   - Do NOT use business jargon. Use their language.
   - Do NOT summarize each answer sequentially.
     Weave the responses into a single coherent reflection.
   - Skip entirely any question they said 'does not apply' to.
   - End with ONE sentence that names the core tension or opportunity with precision.
     This sentence should feel like a moment of recognition — the kind where someone
     thinks 'that's exactly it, I've never said it that clearly.'
   
   Example of wrong approach:
   'You mentioned that your current situation involves X.
   You also said that your goal is Y. This suggests Z.'
   
   Example of right approach:
   'Here's what I heard you say: You're not building a
   store — you're building a home for people who've
   outgrown where they've been selling. The platform
   exists. The products exist. What's missing is the
   moment when enough of the right people discover it
   and think — finally, this is where I belong. That
   moment hasn't happened yet. Making it happen is
   everything.'

2. primary_gap (1 sentence):
   The single most important thing standing between where they are and where they want to be, based on their answers.

3. recommended_services (array of 2-3):
   Each service has:
   - service_id (from this list only):
     101 SearchLift™, 105 NearRank™, 106 AutoRank™,
     201 VoiceBridge™, 202 InboxIgnite™, 203 TextPulse™,
     301 BookStream™, 302 CloseCraft™, 303 DealDrive™,
     401 HubAI™, 402 FlowForge™, 502 Onboardly™,
     601 Voice & Vibe™, 701 InsightLoop™,
     801 TrustGuard™, 901 AllianceOS™
   - reason (1 sentence, using their language from responses)

4. recommended_tier:
   One of: Essentials | Momentum | Signature | Vanguard
   Based on the complexity and scale implied in their answers.
   Never choose Sovereign.

5. next_step:
   One of: 'diagnostic' | 'ai-iq' | 'calculator' | 'dream'
   Which door should they go through next based on what they revealed?

6. next_step_reason (1 sentence):
   Why that next step specifically for this person.

Return ONLY valid JSON with keys: discovery_narrative, primary_gap, recommended_services, recommended_tier, next_step, next_step_reason.`;

  const ar = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2048,
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

  const analysis: AnalysisResult = {
    discovery_narrative: String(raw.discovery_narrative ?? "").trim(),
    primary_gap: String(raw.primary_gap ?? "").trim(),
    recommended_services: Array.isArray(raw.recommended_services)
      ? (raw.recommended_services as Array<{ service_id?: number; reason?: string }>)
          .filter((x) => x && typeof x.service_id === "number")
          .map((x) => ({ service_id: x.service_id as number, reason: String(x.reason ?? "").trim() }))
          .slice(0, 3)
      : [],
    recommended_tier: String(raw.recommended_tier ?? "Essentials").trim(),
    next_step: String(raw.next_step ?? "diagnostic").trim(),
    next_step_reason: String(raw.next_step_reason ?? "").trim(),
  };

  const allowedTier = ["Essentials", "Momentum", "Signature", "Vanguard"];
  if (!allowedTier.includes(analysis.recommended_tier)) analysis.recommended_tier = "Essentials";

  const allowedNext = ["diagnostic", "ai-iq", "calculator", "dream"];
  if (!allowedNext.includes(analysis.next_step)) analysis.next_step = "diagnostic";

  const questionsJson = body.questions ?? [];
  const notesPayload = {
    primary_gap: analysis.primary_gap,
    next_step: analysis.next_step,
    next_step_reason: analysis.next_step_reason,
    discovery_narrative: analysis.discovery_narrative.slice(0, 200),
    responses: responses.map((r) => ({
      question: r.question,
      answer: r.answer,
      domain: r.domain,
    })),
  };

  const serviceIds = analysis.recommended_services.map((s) => s.service_id);

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
      responses,
      discovery_narrative: analysis.discovery_narrative,
      primary_gap: analysis.primary_gap,
      recommended_services: analysis.recommended_services,
      recommended_tier: analysis.recommended_tier,
      next_step: analysis.next_step,
      next_step_reason: analysis.next_step_reason,
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
    recommended_tier: analysis.recommended_tier,
    recommended_services: serviceIds,
    notes: JSON.stringify(notesPayload),
    prospect_summary: `Door 3 Self-Discovery — ${analysis.primary_gap.slice(0, 200)}`,
    overall_score: 0,
    visibility_score: 0,
    engagement_score: 0,
    conversion_score: 0,
    estimated_value: 0,
    detected_gaps: [],
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
        recommended_tier: analysis.recommended_tier,
        recommended_services: serviceIds,
        notes: JSON.stringify(notesPayload),
        prospect_summary: prospectRow.prospect_summary,
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
    ...analysis,
    industry,
    business_descriptor: business_descriptor || null,
  });
});
