/**
 * Door 3 — Generate 7 discovery questions (Claude).
 * POST { name, email, url? }
 * Returns { questions: Array<{ id, question, placeholder, domain }>, context, intro }
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

interface IntroContent {
  address: string;
  nuggets: string[];
  frame: string;
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

For each domain, apply this emotional depth:

situation: Ask about the CURRENT REALITY in a way that invites honest reflection, not a status report.
Bad: 'How do you currently attract customers?'
Good: 'Walk me through what happens the moment a potential customer first hears about you — what is that experience actually like right now?'

problem: Surface the gap between what they have and what they need — in their words, not yours.
Bad: 'What is your biggest challenge?'
Good: 'What part of growing this business keeps you up at night, even when everything else is going well?'

consequence: This is the most important question. Make them feel the weight of the unsolved problem.
Bad: 'How does this affect your business?'
Good: 'If nothing changes in the next 12 months — not dramatically worse, just the same — what does that mean for the future of this business?'

goal: Pull the vision out of them — specific and felt, not abstract.
Bad: 'Where do you want to be in 18 months?'
Good: 'If things went remarkably well from this point forward, what would you be doing differently 18 months from now that you are not doing today?'

solution_awareness: Help them articulate the unlock, not the solution.
Bad: 'What would change if this was solved?'
Good: 'What becomes possible for you personally — not just the business — when this finally works the way it should?'

priority: Create clarity on urgency without pressure.
Bad: 'What is most important right now?'
Good: 'If you could only solve one thing in the next 90 days — and solving it would make everything else easier — what would it be?'

context: Surface what they have already tried — this tells us everything.
Bad: 'What have you tried?'
Good: 'What approaches have you already taken to address this — and what got in the way of them working?'

Heavier NEPQ weight is required for consequence, solution_awareness, and priority domains. These should feel emotionally resonant, precise, and reflective.

Format: Return JSON with:
{
  "questions": [ ... 7 items ... ],
  "intro": {
    "address": "single sentence addressing them by name",
    "nuggets": ["nugget 1", "nugget 2", "nugget 3 (optional)"],
    "frame": "single closing line framing the 7 questions"
  }
}

Also generate a personalized welcome intro for this prospect.
The intro has three parts:
1. A warm address using their name (1 sentence)
2. Two or three nuggets — short, specific observations that feel true for someone in their business situation.
   These are NOT generic motivational quotes.
3. A single closing line that frames what the 7 questions do.

Rules for nuggets:
- Must feel specific to their industry or business model
- Should be the kind of thing a smart advisor would say in the first 60 seconds of a meeting — not a TED talk opener
- Never use the word 'journey', 'game-changer', 'leverage', or 'synergy'
- Should be a little bit unexpected — something that makes them think 'yes, exactly' not 'I've heard that before'
- No statistics that could be made up — only observations that feel true because of lived experience, not data

Example of WRONG nugget (generic):
'Building a business is one of the most rewarding things you can do, but it comes with real challenges.'

Example of RIGHT nugget (for a marketplace business):
'Most marketplace founders spend 80% of their energy acquiring supply. The harder problem — and the one that actually determines growth — is making demand feel inevitable.'

Each question has:
- id: 'Q1' through 'Q7'
- question: the question text (max 20 words)
- placeholder: a conversational prompt (max 12 words)
- domain: one of 'situation' | 'problem' | 'consequence' | 'goal' | 'solution' | 'priority' | 'context'

Return ONLY valid JSON. No markdown. No explanation.`;

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
  let payload: Record<string, unknown>;
  try {
    payload = extractJsonObject(text);
  } catch (e) {
    return jsonResponse({ error: "Failed to parse questions payload JSON", detail: String(e) }, 502);
  }

  const questions = payload.questions;
  if (!Array.isArray(questions) || questions.length !== 7) {
    return jsonResponse({ error: "Expected exactly 7 questions", got: Array.isArray(questions) ? questions.length : 0 }, 502);
  }

  const rawIntro = (payload.intro ?? {}) as Record<string, unknown>;
  const intro: IntroContent = {
    address: String(rawIntro.address ?? `${name} — thanks for being here.`).trim(),
    nuggets: Array.isArray(rawIntro.nuggets)
      ? rawIntro.nuggets.map((n) => String(n ?? "").trim()).filter(Boolean).slice(0, 3)
      : [],
    frame: String(rawIntro.frame ?? "Seven questions. Honest answers. We'll reflect back exactly what we hear.").trim(),
  };
  if (intro.nuggets.length < 2) {
    intro.nuggets = [
      "Most businesses don't have a marketing problem first — they have a clarity problem that makes every tactic feel harder.",
      "What feels like inconsistent demand is often inconsistent positioning; the right message makes the right buyers self-identify faster.",
    ];
  }

  return jsonResponse({
    questions,
    context: {
      industry,
      business_descriptor,
      name: business_name,
    },
    intro,
    // Backward-compatible duplicates for existing consumers.
    industry,
    business_descriptor,
    business_name,
    url: url || null,
  });
});
