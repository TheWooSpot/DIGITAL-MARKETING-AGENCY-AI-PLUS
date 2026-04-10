/**
 * Door 3 — Generate 7 personalized discovery questions + encouragements + industry opening.
 * POST { name, email, url? }
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

interface UrlContext {
  industry: string;
  business_type: string;
  primary_audience: string;
  detected_gaps: string[];
  business_name: string;
  source: "layer5" | "metadata";
  recommended_tier?: string;
}

function normalizeUrlInput(value: string): { raw: string; host: string; fetchUrl: string } {
  const raw = value.trim();
  if (!raw) return { raw: "", host: "", fetchUrl: "" };
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const u = new URL(withProtocol);
    return {
      raw,
      host: u.hostname.replace(/^www\./, ""),
      fetchUrl: `${u.protocol}//${u.hostname}`,
    };
  } catch {
    const host = raw.replace(/^https?:\/\//i, "").replace(/^www\./, "").split("/")[0] ?? "";
    return { raw, host, fetchUrl: host ? `https://${host}` : "" };
  }
}

function extractJsonValue(text: string): unknown {
  const t = text.trim();
  try {
    return JSON.parse(t);
  } catch {
    const fence = /```(?:json)?\s*([\s\S]*?)\s*```/i.exec(t);
    if (fence?.[1]) return JSON.parse(fence[1]);
    const arrStart = t.indexOf("[");
    const arrEnd = t.lastIndexOf("]");
    if (arrStart >= 0 && arrEnd > arrStart) return JSON.parse(t.slice(arrStart, arrEnd + 1));
    const objStart = t.indexOf("{");
    const objEnd = t.lastIndexOf("}");
    if (objStart >= 0 && objEnd > objStart) return JSON.parse(t.slice(objStart, objEnd + 1));
    throw new Error("No valid JSON payload found.");
  }
}

function parseDetectedGaps(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (item && typeof item === "object" && "gap_description" in item) {
        return String((item as Record<string, unknown>).gap_description ?? "").trim();
      }
      return "";
    })
    .filter(Boolean)
    .slice(0, 8);
}

async function fetchProspectContext(url: string, supabaseUrl: string, serviceKey: string): Promise<UrlContext | null> {
  if (!url || !supabaseUrl || !serviceKey) return null;
  const norm = normalizeUrlInput(url);
  const candidates = Array.from(
    new Set(
      [norm.raw, norm.host, `https://${norm.host}`, `http://${norm.host}`, `${norm.host}/`, `https://www.${norm.host}`]
        .map((x) => x.trim())
        .filter(Boolean)
    )
  );

  for (const candidate of candidates) {
    const query = `${supabaseUrl}/rest/v1/layer5_prospects?select=business_name,industry,business_descriptor,detected_gaps,recommended_tier,url,website_url&or=(url.eq.${encodeURIComponent(
      candidate
    )},website_url.eq.${encodeURIComponent(candidate)})&order=created_at.desc&limit=1`;
    const res = await fetch(query, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    });
    if (!res.ok) continue;
    const rows = (await res.json()) as Array<Record<string, unknown>>;
    const row = rows[0];
    if (!row) continue;
    const industry = String(row.industry ?? "").trim() || "Unknown";
    const businessType = String(row.business_descriptor ?? "").trim() || `${industry} business`;
    return {
      industry,
      business_type: businessType,
      primary_audience: "Unknown",
      detected_gaps: parseDetectedGaps(row.detected_gaps),
      business_name: String(row.business_name ?? "").trim() || "Your business",
      source: "layer5",
      recommended_tier: String(row.recommended_tier ?? "").trim() || undefined,
    };
  }

  return null;
}

async function fetchUrlMetadata(url: string): Promise<{ title: string; description: string }> {
  const norm = normalizeUrlInput(url);
  if (!norm.fetchUrl) return { title: "", description: "" };
  try {
    const res = await fetch(norm.fetchUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (Door3-Self-Discovery-Metadata/1.0)" },
    });
    if (!res.ok) return { title: "", description: "" };
    const html = (await res.text()).slice(0, 200_000);
    const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
    const descMatch =
      /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i.exec(html) ||
      /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["'][^>]*>/i.exec(html);
    return {
      title: (titleMatch?.[1] ?? "").replace(/\s+/g, " ").trim(),
      description: (descMatch?.[1] ?? "").replace(/\s+/g, " ").trim(),
    };
  } catch {
    return { title: "", description: "" };
  }
}

async function detectIndustryFromMetadata(url: string, apiKey: string): Promise<UrlContext | null> {
  const meta = await fetchUrlMetadata(url);
  const system =
    'Detect the business type and primary industry from this URL metadata. Return JSON: { "industry": string, "business_type": string, "primary_audience": string }.';
  const user = `URL: ${url}\nTitle: ${meta.title || "(none)"}\nDescription: ${meta.description || "(none)"}`;
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 400,
      temperature: 0,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { content?: Array<{ text?: string }> };
  const text = data.content?.[0]?.text ?? "";
  try {
    const o = extractJsonValue(text) as Record<string, unknown>;
    const norm = normalizeUrlInput(url);
    return {
      business_name: norm.host || "Your business",
      industry: String(o.industry ?? "general business").trim(),
      business_type: String(o.business_type ?? "growing business").trim(),
      primary_audience: String(o.primary_audience ?? "Unknown").trim(),
      detected_gaps: [],
      source: "metadata",
    };
  } catch {
    return null;
  }
}

interface IntroContent {
  address: string;
  nuggets: string[];
  frame: string;
}

const DOMAINS = ["situation", "problem", "consequence", "goal", "solution", "priority", "context"] as const;
const PLACEHOLDERS = [
  "Start with what feels most true...",
  "Name what feels hardest right now...",
  "Describe the cost of staying here...",
  "Paint the future you're aiming for...",
  "What unlocks when this works?",
  "Choose the one thing that matters most...",
  "Share what's blocked progress so far...",
];

const DEFAULT_ENCOURAGEMENTS = [
  "The clearest picture starts with the simplest truth.",
  "Naming it is the first act of solving it.",
  "The real cost is rarely just money.",
  "Say it out loud — it changes what comes next.",
  "Most answers are already inside the question.",
  "What matters most rarely needs defending.",
  "Everything you've tried has taught you something.",
];

type QItem = {
  id: string;
  question: string;
  placeholder: string;
  domain: string;
  encouragement: string;
};

function normalizeQuestionItems(raw: unknown, name: string, ctx: UrlContext): QItem[] {
  const out: QItem[] = [];
  const arr = Array.isArray(raw) ? raw : [];
  for (let i = 0; i < 7; i++) {
    const item = arr[i];
    const d = DOMAINS[i];
    if (item && typeof item === "object") {
      const o = item as Record<string, unknown>;
      out.push({
        id: `Q${i + 1}`,
        question: String(o.question ?? "").trim() || `What matters most for ${name} right now?`,
        placeholder: String(o.placeholder ?? PLACEHOLDERS[i]).trim(),
        domain: String(o.domain ?? d).toLowerCase(),
        encouragement: String(o.encouragement ?? DEFAULT_ENCOURAGEMENTS[i]).trim(),
      });
    } else {
      out.push({
        id: `Q${i + 1}`,
        question: typeof item === "string" ? item.trim() : `Question ${i + 1} for your ${ctx.industry} business.`,
        placeholder: PLACEHOLDERS[i],
        domain: d,
        encouragement: DEFAULT_ENCOURAGEMENTS[i],
      });
    }
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!ANTHROPIC_API_KEY) return jsonResponse({ error: "Missing ANTHROPIC_API_KEY" }, 500);

  let body: { name?: string; email?: string; url?: string };
  try {
    body = (await req.json()) as { name?: string; email?: string; url?: string };
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const url = typeof body.url === "string" ? body.url.trim() : "";

  if (!name || !email) return jsonResponse({ error: "name and email required" }, 400);

  let context: UrlContext = {
    industry: "small business",
    business_type: "growing business",
    primary_audience: "Unknown",
    detected_gaps: [],
    business_name: name,
    source: "metadata",
  };

  if (url && SUPABASE_URL && SERVICE_KEY) {
    const fromProspect = await fetchProspectContext(url, SUPABASE_URL, SERVICE_KEY);
    if (fromProspect) context = fromProspect;
  }

  if (url && context.source !== "layer5") {
    const fromMetadata = await detectIndustryFromMetadata(url, ANTHROPIC_API_KEY);
    if (fromMetadata) context = { ...context, ...fromMetadata };
  }

  const systemPrompt = `You generate a structured JSON object for a 7-question business self-discovery for ONE specific business. Output ONLY valid JSON (no markdown).

Return this shape:
{
  "industry_opening": ["sentence 1", "sentence 2"],
  "questions": [
    {
      "question": "string (max 20 words, open-ended)",
      "placeholder": "string (max 12 words, nudge)",
      "encouragement": "string (max 12 words) — ONE short unique sentence that sets mindset for THIS question only. NOT generic praise. Specific to what this question asks them to face.",
      "domain": "situation|problem|consequence|goal|solution|priority|context"
    }
  ]
}

Rules:
- Exactly 7 objects in "questions", in order: situation, problem, consequence, goal, solution, priority, context (domains must match this order).
- "industry_opening": exactly 2 sentences, tailored to this industry and business type — NOT generic platitudes. Reference their world (e.g. ${context.industry}).
- Questions must feel written for THIS business type, not generic.
- encouragement examples (tone only — do not copy verbatim): situation → clearest picture; problem → naming it; consequence → real cost; goal → say it out loud; solution → answers inside; priority → what matters; context → what you've tried.`;

  const userPrompt = `Business: ${context.business_name || name}
Industry: ${context.industry}
Business type: ${context.business_type}
Primary audience: ${context.primary_audience}
Detected gaps: ${context.detected_gaps.length > 0 ? context.detected_gaps.join(" | ") : "None"}
URL context: ${url || "(none)"}

Generate industry_opening (2 sentences) and 7 questions with placeholder, encouragement, and domain as specified.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2500,
      temperature: 0.25,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return jsonResponse({ error: `Anthropic error: ${err}` }, 502);
  }

  const data = (await res.json()) as { content?: Array<{ text?: string }> };
  const text = data.content?.[0]?.text ?? "";
  let parsed: Record<string, unknown>;
  try {
    parsed = extractJsonObject(text);
  } catch (e) {
    return jsonResponse({ error: "Failed to parse questions JSON", detail: String(e) }, 502);
  }

  const rawQuestions = parsed.questions;
  const items = normalizeQuestionItems(rawQuestions, name, context);

  const opening = parsed.industry_opening;
  let nuggets: string[] = [
    `In ${context.industry}, growth usually stalls when acquisition and follow-through drift apart.`,
    "Honest answers beat polished answers. Clarity here makes every next step easier.",
  ];
  if (Array.isArray(opening) && opening.length >= 2) {
    nuggets = [String(opening[0] ?? "").trim(), String(opening[1] ?? "").trim()].filter(Boolean);
    if (nuggets.length < 2) {
      nuggets = [
        `In ${context.industry}, growth usually stalls when acquisition and follow-through drift apart.`,
        "Honest answers beat polished answers. Clarity here makes every next step easier.",
      ];
    }
  }

  const intro: IntroContent = {
    address: `${name} — thanks for being here.`,
    nuggets,
    frame: "Seven questions. Honest answers. We'll reflect back exactly what we hear.",
  };

  const questions = items.map(({ id, question, placeholder, domain, encouragement }) => ({
    id,
    question,
    placeholder,
    domain,
    encouragement,
  }));

  return jsonResponse({
    questions,
    questions_generated: items.map((q) => q.question),
    context: {
      industry: context.industry,
      business_type: context.business_type,
      primary_audience: context.primary_audience,
      business_name: context.business_name || name,
      detected_gaps: context.detected_gaps,
      recommended_tier: context.recommended_tier ?? null,
      source: context.source,
    },
    intro,
    industry: context.industry,
    business_descriptor: context.business_type,
    business_name: context.business_name || name,
    url: url || null,
  });
});
