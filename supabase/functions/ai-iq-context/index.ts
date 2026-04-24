const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
};

const DEFAULT_WEIGHTS = {
  deployment_depth: 15,
  integration_maturity: 15,
  revenue_alignment: 20,
  automation_orchestration: 15,
  oversight_awareness: 10,
  team_human_readiness: 15,
  strategic_leadership: 10,
  data_foundation: 0,
  customer_intelligence: 0,
  investment_posture: 0,
};

const DEFAULT_RESPONSE = {
  success: true,
  fallback: true,
  url_scanned: '',
  business_context: {
    industry: 'unknown',
    industry_label: 'General Business',
    industry_confidence: 'low',
    business_type: 'unknown',
    size_signal: 'unknown',
    tech_maturity: 'basic',
    ai_signals: [],
    primary_value_proposition: '',
    likely_pain_points: [],
    synopsis: 'We were unable to gather enough information from your website to personalize your assessment. Please confirm your industry below.',
    industry_options: [
      { id: 'professional_services', label: 'Professional Services', primary: true },
      { id: 'retail_consumer', label: 'Retail / Consumer Services' },
      { id: 'technology', label: 'Technology / SaaS' },
      { id: 'healthcare', label: 'Healthcare / Wellness' },
      { id: 'nonprofit', label: 'Nonprofit / Mission-Driven' },
      { id: 'other', label: 'Other' },
    ],
    domain_max_adjustments: DEFAULT_WEIGHTS,
    domain_weight_recommendations: DEFAULT_WEIGHTS,
  },
};

function normalizeWeights(weights: Record<string, number>): Record<string, number> {
  const normalized = {
    ...DEFAULT_WEIGHTS,
    ...weights,
  };
  const weightKeys = [
    'deployment_depth',
    'integration_maturity',
    'revenue_alignment',
    'automation_orchestration',
    'oversight_awareness',
    'team_human_readiness',
    'strategic_leadership',
  ];
  const total = weightKeys.reduce((sum, key) => sum + (normalized[key] ?? 0), 0);
  if (total === 100) return normalized;
  const diff = 100 - total;
  const largest = weightKeys.reduce((a, b) => (normalized[a] > normalized[b] ? a : b));
  normalized[largest] += diff;
  return normalized;
}

function ensureWeightAliases(parsed: Record<string, unknown>) {
  const maxAdjustments = normalizeWeights(
    (parsed.domain_max_adjustments as Record<string, number>) ??
    (parsed.domain_weight_recommendations as Record<string, number>) ??
    DEFAULT_WEIGHTS
  );
  parsed.domain_max_adjustments = maxAdjustments;
  parsed.domain_weight_recommendations = maxAdjustments;
}

async function fetchPageContent(url: string): Promise<string | null> {
  try {
    const normalized = url.startsWith('http') ? url : `https://${url}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(normalized, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Socialutely/1.0)' }
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const html = await res.text();
    const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() || '';
    const desc = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1]?.trim() || '';
    const og = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)?.[1]?.trim() || '';
    const body = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 2000);
    return `Title: ${title}\nDescription: ${desc || og}\nContent: ${body}`;
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: CORS });

  const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';
  if (!ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ ...DEFAULT_RESPONSE, error: 'Missing API key' }), {
      status: 200, headers: { 'Content-Type': 'application/json', ...CORS }
    });
  }

  let body: { url?: string };
  try { body = await req.json(); }
  catch { body = {}; }

  const url = (body.url || '').trim();
  const pageContent = url ? await fetchPageContent(url) : null;

  if (!pageContent) {
    return new Response(JSON.stringify({ ...DEFAULT_RESPONSE, url_scanned: url }), {
      status: 200, headers: { 'Content-Type': 'application/json', ...CORS }
    });
  }

  const domainPool = `1. Deployment Depth
2. Integration Maturity
3. Revenue Alignment
4. Automation Orchestration
5. Oversight Awareness
6. Team & Human Readiness
7. Strategic Leadership
8. Organizational Context (unscored segmentation — always included)
9. Data Foundation
10. Customer Intelligence
11. Investment Posture`;

  const systemPrompt = `You are analyzing a business website to calibrate an AI readiness assessment. Extract business context and generate industry confirmation options for the user.

The available domain pool is exactly:
${domainPool}

Return ONLY valid JSON with this exact structure:
{
  "industry": "one of: healthcare|retail|saas|nonprofit|education|finance|legal|real_estate|hospitality|construction|media|professional_services|food_beverage|pet_services|beauty_wellness|automotive|manufacturing|logistics|other",
  "industry_label": "Human-readable label for the detected industry",
  "industry_confidence": "high|medium|low",
  "business_type": "b2b|b2c|nonprofit|government|hybrid",
  "size_signal": "solo|small|mid|enterprise",
  "tech_maturity": "basic|moderate|advanced",
  "ai_signals": ["array of observed AI/automation signals, empty if none"],
  "primary_value_proposition": "one sentence describing what this business does",
  "likely_pain_points": ["up to 3 likely business challenges"],
  "synopsis": "2-3 conversational sentences describing what the system found: what the business does, who it serves, and what the assessment will focus on. Warm, direct, plain language. Start with: Based on your website...",
  "industry_options": [
    { "id": "detected_industry_id", "label": "Primary detected industry label", "primary": true },
    { "id": "adjacent_1", "label": "Adjacent industry 1" },
    { "id": "adjacent_2", "label": "Adjacent industry 2" },
    { "id": "adjacent_3", "label": "Adjacent industry 3" },
    { "id": "other", "label": "Other" }
  ],
  "domain_max_adjustments": {
    "deployment_depth": 15,
    "integration_maturity": 15,
    "revenue_alignment": 20,
    "automation_orchestration": 15,
    "oversight_awareness": 10,
    "team_human_readiness": 15,
    "strategic_leadership": 10,
    "data_foundation": 0,
    "customer_intelligence": 0,
    "investment_posture": 0
  },
  "domain_weight_recommendations": {
    "deployment_depth": 15,
    "integration_maturity": 15,
    "revenue_alignment": 20,
    "automation_orchestration": 15,
    "oversight_awareness": 10,
    "team_human_readiness": 15,
    "strategic_leadership": 10,
    "data_foundation": 0,
    "customer_intelligence": 0,
    "investment_posture": 0
  }
}

Rules for industry_options:
- First option is always the primary detected industry with primary: true
- Include 3 contextually adjacent/related industries (not random)
- Always include Other as last option
- Labels should be human-friendly (e.g. Pet Grooming / Animal Care not pet_services)

Rules for domain_max_adjustments:
- All 7 values must sum to exactly 100
- Adjust based on industry context:
  - nonprofits: oversight_awareness +5, revenue_alignment -5
  - saas/tech: integration_maturity +5, automation_orchestration +5, team_human_readiness -5, strategic_leadership -5
  - healthcare: oversight_awareness +5, strategic_leadership +5, deployment_depth -5, team_human_readiness -5
  - solo/micro: team_human_readiness +5, strategic_leadership -5
  - service businesses (pet, beauty, food): revenue_alignment +5, integration_maturity -5
- education: team_human_readiness +5, strategic_leadership +5, automation_orchestration -5, deployment_depth -5

Rules for domain_weight_recommendations:
- Mirror the same values from domain_max_adjustments
- Keep data_foundation, customer_intelligence, and investment_posture present for compatibility`;

  try {
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1200,
        temperature: 0,
        system: systemPrompt,
        messages: [{ role: 'user', content: `Website content for ${url}:\n\n${pageContent}` }],
      }),
    });

    if (!claudeRes.ok) throw new Error(`Claude error: ${claudeRes.status}`);

    const claudeData = await claudeRes.json() as { content: Array<{ type: string; text?: string }> };
    let text = claudeData.content?.[0]?.text ?? '';
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();

    const objStart = text.indexOf('{');
    const objEnd = text.lastIndexOf('}');
    const parsed = JSON.parse(text.slice(objStart, objEnd + 1));

    // Validate and normalize weights, then ensure both response keys are present.
    ensureWeightAliases(parsed);

    // Ensure industry_options exists and has Other
    if (!Array.isArray(parsed.industry_options) || parsed.industry_options.length === 0) {
      parsed.industry_options = [
        { id: parsed.industry || 'other', label: parsed.industry_label || 'General Business', primary: true },
        { id: 'other', label: 'Other' },
      ];
    }
    const hasOther = parsed.industry_options.some((o: { id: string }) => o.id === 'other');
    if (!hasOther) {
      parsed.industry_options.push({ id: 'other', label: 'Other' });
    }

    return new Response(JSON.stringify({
      success: true,
      fallback: false,
      url_scanned: url,
      business_context: parsed,
    }), { status: 200, headers: { 'Content-Type': 'application/json', ...CORS } });

  } catch (err) {
    console.error('[ai-iq-context] Claude error:', err);
    return new Response(JSON.stringify({ ...DEFAULT_RESPONSE, url_scanned: url }), {
      status: 200, headers: { 'Content-Type': 'application/json', ...CORS }
    });
  }
});
