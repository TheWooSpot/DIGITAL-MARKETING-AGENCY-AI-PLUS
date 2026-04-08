/**
 * Door 3 — Generate 7 discovery questions (Claude).
 * POST { name, email, url? }
 * Returns { questions: Array<{ id, question, placeholder, domain }>, industry?, business_descriptor? }
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

function extractJsonArray(text: string): unknown {
  const t = text.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(t);
  const inner = fence ? fence[1].trim() : t;
  const arrStart = inner.indexOf("[");
  const arrEnd = inner.lastIndexOf("]");
  if (arrStart >= 0 && arrEnd > arrStart) {
    return JSON.parse(inner.slice(arrStart, arrEnd + 1));
  }
  return JSON.parse(inner);
}

interface UrlContext {
  industry: string;
  business_descriptor: string;
  business_name: string;
}

async function fetchUrlContext(url: string, apiKey: string): Promise<UrlContext | null> {
  const system = `You analyze a business from its website domain/URL only (no live fetch). Return JSON only with keys: business_name, industry, business_descriptor. business_descriptor is 4-8 words on market position. No markdown.`;
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
      temperature: 0.2,
      system,
      messages: [{ role: "user", content: `URL: ${url}\nReturn JSON only.` }],
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { content?: Array<{ text?: string }> };
  const text = data.content?.[0]?.text ?? "";
  try {
    const o = JSON.parse(text) as Record<string, unknown>;
    return {
      business_name: String(o.business_name ?? "").trim() || "Your business",
      industry: String(o.industry ?? "general business").trim(),
      business_descriptor: String(o.business_descriptor ?? "").trim() || "growing business",
    };
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
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

  let industry = "small business";
  let business_descriptor = "a business ready for the next stage";
  let business_name = name;

  if (url) {
    const ctx = await fetchUrlContext(url, ANTHROPIC_API_KEY);
    if (ctx) {
      industry = ctx.industry;
      business_descriptor = ctx.business_descriptor;
      business_name = ctx.business_name || name;
    }
  }

  const prompt = `Generate exactly 7 discovery questions for a business (${business_name}) in the ${industry} space (${business_descriptor}).

These questions follow NEPQ principles:
- Situation → Problem → Consequence → Goal → Solution Awareness → Priority → Context
- Each question surfaces something the prospect already knows but hasn't said out loud
- Never binary yes/no — always open-ended
- Never ask about budget — that comes later
- Never expose URL or scan details directly
- Make each question feel personally crafted

Format: Return exactly 7 questions as a JSON array.
Each question has:
- id: 'Q1' through 'Q7'
- question: the question text (max 20 words)
- placeholder: a conversational prompt (max 12 words)
- domain: one of 'situation' | 'problem' | 'consequence' | 'goal' | 'solution' | 'priority' | 'context'

Return ONLY valid JSON array. No markdown. No explanation.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 800,
      temperature: 0.3,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return jsonResponse({ error: `Anthropic error: ${err}` }, 502);
  }

  const data = (await res.json()) as { content?: Array<{ text?: string }> };
  const text = data.content?.[0]?.text ?? "";
  let questions: unknown;
  try {
    questions = extractJsonArray(text);
  } catch (e) {
    return jsonResponse({ error: "Failed to parse questions JSON", detail: String(e) }, 502);
  }

  if (!Array.isArray(questions) || questions.length !== 7) {
    return jsonResponse({ error: "Expected exactly 7 questions", got: Array.isArray(questions) ? questions.length : 0 }, 502);
  }

  return jsonResponse({
    questions,
    industry,
    business_descriptor,
    business_name,
    url: url || null,
  });
});
