/**
 * Socialutely — ai-iq-context Edge Function
 * ==========================================
 * Lightweight business context extractor for AI IQ™ adaptive assessment.
 * NOT the full prospect-diagnostic — fast, focused, and always returns usable output.
 *
 * POST { url: string }
 * Returns { success: true, business_context: {...}, url_scanned: string, fallback: boolean }
 *
 * Secrets: ANTHROPIC_API_KEY
 * JWT: none required
 */

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const DEFAULT_DOMAIN_MAX = {
  deployment_depth: 15,
  integration_maturity: 15,
  revenue_alignment: 20,
  automation_orchestration: 15,
  oversight_awareness: 10,
  team_human_readiness: 15,
  strategic_leadership: 10,
};

const FALLBACK_CONTEXT = {
  industry: "unknown",
  business_type: "b2b",
  size_signal: "small",
  tech_maturity: "basic",
  ai_signals: [],
  primary_value_proposition: "Unknown",
  likely_pain_points: [],
  domain_max_adjustments: { ...DEFAULT_DOMAIN_MAX },
};

function jsonResponse(body: object, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

/** Fetch a URL with a 6-second timeout. Returns null on any failure. */
async function fetchWithTimeout(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Socialutely-AIIQBot/1.0" },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Extract useful text from raw HTML — title, meta description, OG tags, first 2000 chars of body text. */
function extractPageContent(html: string): string {
  const clean = (s: string) => s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? clean(titleMatch[1]) : "";

  const metaDescMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);
  const metaDesc = metaDescMatch ? metaDescMatch[1].trim() : "";

  const ogTitleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  const ogDescMatch = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
  const ogTitle = ogTitleMatch ? ogTitleMatch[1].trim() : "";
  const ogDesc = ogDescMatch ? ogDescMatch[1].trim() : "";

  // Strip scripts, styles, nav, footer before extracting body text
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ");

  const bodyMatch = stripped.match(/<body[\s\S]*?<\/body>/i);
  const bodyText = bodyMatch ? clean(bodyMatch[0]).slice(0, 2000) : clean(stripped).slice(0, 2000);

  const parts = [
    title && `Title: ${title}`,
    metaDesc && `Meta description: ${metaDesc}`,
    ogTitle && `OG title: ${ogTitle}`,
    ogDesc && `OG description: ${ogDesc}`,
    bodyText && `Body text: ${bodyText}`,
  ].filter(Boolean);

  return parts.join("\n");
}

const CLAUDE_SYSTEM_PROMPT = `You are extracting business context from a website to calibrate an AI readiness assessment. The assessment uses 7 scored domains plus qualitative organizational context. Return ONLY valid JSON — no markdown:
{
  "industry": "healthcare|retail|saas|nonprofit|education|finance|legal|real_estate|hospitality|construction|media|professional_services|other",
  "business_type": "b2b|b2c|nonprofit|government|hybrid",
  "size_signal": "solo|small|mid|enterprise",
  "tech_maturity": "basic|moderate|advanced",
  "ai_signals": ["array of observed AI/automation signals"],
  "primary_value_proposition": "one sentence",
  "likely_pain_points": ["up to 3 strings"],
  "domain_max_adjustments": {
    "deployment_depth": 15,
    "integration_maturity": 15,
    "revenue_alignment": 20,
    "automation_orchestration": 15,
    "oversight_awareness": 10,
    "team_human_readiness": 15,
    "strategic_leadership": 10
  }
}
Adjust domain_max_adjustments based on industry context. All 7 values must sum to exactly 100.
For nonprofits: increase oversight_awareness to 15, decrease revenue_alignment to 15.
For SaaS/tech: increase integration_maturity to 20, increase automation_orchestration to 20, decrease team_human_readiness to 10, decrease strategic_leadership to 5.
For healthcare: increase oversight_awareness to 15, increase strategic_leadership to 15, decrease deployment_depth to 10.
For solo/micro: increase team_human_readiness to 20, decrease strategic_leadership to 5, decrease deployment_depth to 10.`;

/** Call Claude to extract business context from page content. Returns null on any failure. */
async function callClaude(
  apiKey: string,
  pageContent: string,
  url: string,
): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        temperature: 0,
        system: CLAUDE_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Extract business context from this website (${url}):\n\n${pageContent || "(No page content available — use URL domain clues only.)"}`,
          },
        ],
      }),
    });

    if (!res.ok) return null;

    const data = await res.json() as {
      content?: Array<{ type: string; text?: string }>;
    };

    const text = data.content?.find((b) => b.type === "text")?.text ?? "";
    if (!text) return null;

    // Strip any accidental markdown fences
    const cleaned = text.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "").trim();
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;

    // Validate domain_max_adjustments sums to 100
    const adj = parsed.domain_max_adjustments as Record<string, number> | undefined;
    if (adj && typeof adj === "object") {
      const sum = Object.values(adj).reduce((a, v) => a + (Number(v) || 0), 0);
      if (Math.round(sum) !== 100) {
        // Normalise to 100 by adjusting the largest domain
        const keys = Object.keys(adj) as string[];
        const diff = 100 - sum;
        const largest = keys.reduce((a, b) => (adj[a] >= adj[b] ? a : b));
        adj[largest] = Math.round((adj[largest] + diff) * 10) / 10;
      }
    }

    return parsed;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  let url = "";
  try {
    const body = await req.json() as { url?: unknown };
    url = typeof body.url === "string" ? body.url.trim() : "";
  } catch {
    // fall through — url stays empty, will use fallback
  }

  if (!url) {
    return jsonResponse({
      success: true,
      business_context: { ...FALLBACK_CONTEXT },
      url_scanned: "",
      fallback: true,
    });
  }

  // Normalise URL
  const normalised = url.startsWith("http") ? url : `https://${url}`;

  // STEP 1 — Fetch page
  const html = await fetchWithTimeout(normalised);
  const pageContent = html ? extractPageContent(html) : "";

  // STEP 2 — Claude extraction
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
  let business_context: Record<string, unknown> | null = null;
  let fallback = false;

  if (apiKey) {
    business_context = await callClaude(apiKey, pageContent, normalised);
  }

  if (!business_context) {
    business_context = { ...FALLBACK_CONTEXT };
    fallback = true;
  }

  // STEP 3 — Return
  return jsonResponse({
    success: true,
    business_context,
    url_scanned: normalised,
    fallback,
  });
});
