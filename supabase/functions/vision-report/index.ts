/**
 * DreamScape™ Door 7 — Vision Report™ (ElevenLabs transcript + Claude)
 * POST JSON:
 *   name, email (required)
 *   business_name?, organization_type?, industry?, conversation_id?, conversation_summary?
 *
 * - Optional: fetch full transcript from ElevenLabs when conversation_id is set
 * - Claude (claude-sonnet-4-20250514) → structured JSON → branded HTML
 * - Inserts public.dream_profiles (service role)
 *
 * Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY, ELEVENLABS_API_KEY (for transcript),
 *          SUPABASE_ANON_KEY (optional; validates browser Bearer)
 */
const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

const MODEL = "claude-sonnet-4-20250514";
const SOURCE = "door7-dreamscape";

const NO_TRANSCRIPT_FALLBACK =
  "No transcript available — generate a thoughtful general Vision Report for someone who completed a DreamScape session but whose transcript could not be retrieved.";

function jsonResponse(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

function errorResponse(message: string, status: number) {
  return jsonResponse({ success: false, error: message }, status);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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

function authorizeBearer(req: Request, anonKey: string, serviceKey: string): boolean {
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!token) return false;
  if (serviceKey && token === serviceKey) return true;
  if (anonKey && token === anonKey) return true;
  return false;
}

async function fetchTranscriptWithRetry(
  conversationId: string,
  apiKey: string,
): Promise<string | null> {
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, 15000));
    }

    const res = await fetch(`https://api.elevenlabs.io/v1/convai/conversations/${conversationId}`, {
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) continue;

    const data = (await res.json()) as Record<string, unknown>;

    const rawT =
      data?.transcript ??
      data?.messages ??
      (data?.conversation as Record<string, unknown> | undefined)?.messages ??
      (data?.conversation as Record<string, unknown> | undefined)?.transcript;

    if (typeof rawT === "string" && rawT.trim().length > 100) {
      return rawT.trim();
    }

    const messages = rawT ?? [];
    const arr = Array.isArray(messages) ? messages : [];

    if (arr.length > 0) {
      const transcript = arr
        .map((msg: Record<string, unknown>) => {
          const role =
            msg.role === "agent" || msg.speaker === "agent" || msg.role === "assistant"
              ? "Amelia"
              : "Client";
          const text = String(msg.message ?? msg.content ?? msg.text ?? "");
          return `${role}: ${text}`;
        })
        .filter((line: string) => line.length > 10)
        .join("\n");

      if (transcript.length > 100) return transcript;
    }
  }
  return null;
}

const SYSTEM_PROMPT = `You are generating a personalized Vision Report™ for a business leader who just completed a DreamScape™ vision conversation with Amelia, Socialutely's AI Vision Specialist.

You will receive either a full conversation transcript or a session summary. Use every detail available — specific words the client used, emotions they expressed, the exact vision they described, and the gaps they named.

The report must feel like it was written specifically for this person — not a template. Use their language. Reference what they actually said. Surface insights they may not have fully articulated themselves.

Return ONLY valid JSON — no markdown, no explanation:
{
  "vision_summary": "string (2-3 sentences capturing the essence)",
  "dream_state": "string (their 18-month vision in vivid detail)",
  "core_gap": "string (single most important obstacle named)",
  "readiness_score": 7,
  "first_focus": "string (what they said they'd tackle first)",
  "recommended_services": [
    {
      "name": "string (Socialutely service name)",
      "what": "string (one sentence — what it does)",
      "why": "string (one sentence — why it matters for THIS person)"
    }
  ],
  "report_sections": {
    "what_we_heard": "string (2-3 sentences reflecting their words back)",
    "eighteen_month_vision": "string (vivid, specific, uses their words)",
    "core_tension": "string (one direct sentence naming the gap)",
    "where_wed_start": "string (2-3 sentences intro to the services)",
    "next_step": "string (warm direct closing paragraph)"
  }
}

Use readiness_score as an integer 1–10 reflecting how clear and actionable their stated vision is based on the input.`;

async function callClaude(apiKey: string, userMessage: string): Promise<Record<string, unknown>> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 8192,
      temperature: 0.65,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!res.ok) throw new Error(`Anthropic error: ${res.status} ${await res.text()}`);

  const data = (await res.json()) as { content: Array<{ type: string; text?: string }> };
  let text = data.content?.[0]?.text ?? "";
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
  return extractJsonObject(text);
}

function buildVisionReportHtml(parsed: Record<string, unknown>, clientName: string): string {
  const sections = (parsed.report_sections as Record<string, unknown>) || {};
  const services = Array.isArray(parsed.recommended_services)
    ? (parsed.recommended_services as Array<{ name?: string; what?: string; why?: string }>)
    : [];

  const what = String(sections.what_we_heard ?? "");
  const vision18 = String(sections.eighteen_month_vision ?? "");
  const tension = String(sections.core_tension ?? "");
  const whereStart = String(sections.where_wed_start ?? "");
  const nextStep = String(sections.next_step ?? "");

  const dateStr = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const serviceCards = services
    .slice(0, 3)
    .map(
      (s) => `
    <div class="vr-card">
      <p class="vr-card-name">${escapeHtml(String(s.name ?? "Service"))}</p>
      <p class="vr-card-line">${escapeHtml(String(s.what ?? ""))}</p>
      <p class="vr-card-why">${escapeHtml(String(s.why ?? ""))}</p>
    </div>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&family=DM+Serif+Display:ital@0;1&display=swap" rel="stylesheet"/>
  <style>
    body { margin: 0; background: #07090f; }
    .vr-page { position: relative; font-family: "DM Sans", system-ui, sans-serif; background: #07090f; color: #e8eef5; min-height: 100vh; }
    .vr-page::before {
      content: "";
      position: fixed;
      inset: 0;
      background-image: linear-gradient(rgba(201,153,58,0.07) 1px, transparent 1px),
        linear-gradient(90deg, rgba(201,153,58,0.07) 1px, transparent 1px);
      background-size: 48px 48px;
      pointer-events: none;
      z-index: 0;
    }
    .vr-inner { position: relative; z-index: 1; padding: 40px 24px 56px; max-width: 820px; margin: 0 auto; }
    .vr-eyebrow { font-size: 11px; letter-spacing: 0.28em; text-transform: uppercase; color: #c9993a; margin: 0 0 16px; font-weight: 500; }
    .vr-client-name { font-family: "DM Serif Display", Georgia, serif; font-size: 42px; font-weight: 400; color: #ffffff; line-height: 1.1; margin: 0 0 12px; }
    .vr-meta { font-size: 12px; color: rgba(232,238,245,0.45); margin: 0 0 28px; }
    .vr-rule { height: 1px; background: linear-gradient(90deg, transparent, rgba(201,153,58,0.55), transparent); margin: 0 0 32px; }
    .vr-sec-label { font-size: 11px; letter-spacing: 0.22em; text-transform: uppercase; color: #c9993a; margin: 36px 0 14px; font-weight: 600; }
    .vr-what { font-family: "DM Serif Display", Georgia, serif; font-size: 17px; font-style: italic; line-height: 1.65; color: rgba(232,238,245,0.92); margin: 0 0 20px; }
    .vr-vision-wrap { margin: 0 0 24px; padding-left: 18px; border-left: 3px solid rgba(201,153,58,0.85); }
    .vr-vision { font-family: "DM Serif Display", Georgia, serif; font-size: 22px; font-style: italic; line-height: 1.45; color: #e8eef5; margin: 0; }
    .vr-tension { font-size: 17px; font-weight: 700; color: #07090f; background: linear-gradient(135deg, rgba(201,153,58,0.95), rgba(201,153,58,0.75)); padding: 16px 18px; border-radius: 8px; line-height: 1.5; margin: 0 0 20px; }
    .vr-where-intro { font-size: 15px; line-height: 1.65; color: rgba(232,238,245,0.88); margin: 0 0 20px; }
    .vr-card { border: 1px solid rgba(201,153,58,0.22); border-left: 4px solid #c9993a; border-radius: 10px; padding: 18px; margin-bottom: 14px; background: rgba(10,12,18,0.95); }
    .vr-card-name { font-weight: 700; color: #c9993a; margin: 0 0 10px; font-size: 16px; }
    .vr-card-line { font-size: 14px; color: rgba(232,238,245,0.85); margin: 0 0 8px; line-height: 1.55; }
    .vr-card-why { font-size: 14px; color: rgba(232,238,245,0.65); margin: 0; line-height: 1.55; font-style: italic; }
    .vr-next-box { border: 1px solid rgba(201,153,58,0.35); border-radius: 12px; padding: 24px; background: rgba(201,153,58,0.06); margin-top: 8px; }
    .vr-next-text { font-size: 15px; line-height: 1.7; color: rgba(232,238,245,0.9); margin: 0 0 20px; }
    .vr-cta {
      display: inline-block;
      background: linear-gradient(180deg, #d4a84a, #c9993a);
      color: #07090f !important;
      font-family: "DM Sans", sans-serif;
      font-size: 15px;
      font-weight: 700;
      padding: 14px 28px;
      border-radius: 999px;
      text-decoration: none;
      text-align: center;
      box-shadow: 0 4px 24px rgba(201,153,58,0.25);
    }
    .vr-cta:hover { filter: brightness(1.05); }
    .vr-footer { margin-top: 44px; padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.08); font-size: 12px; color: #6a7d9a; text-align: center; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="vr-page">
    <article class="vr-inner">
      <p class="vr-eyebrow">Vision Report™</p>
      <h1 class="vr-client-name">${escapeHtml(clientName)}</h1>
      <p class="vr-meta">${escapeHtml(dateStr)}</p>
      <div class="vr-rule" role="presentation"></div>

      <p class="vr-sec-label">What We Heard</p>
      <p class="vr-what">${escapeHtml(what).replace(/\n/g, "<br/>")}</p>

      <p class="vr-sec-label">Your 18-Month Vision</p>
      <div class="vr-vision-wrap">
        <p class="vr-vision">${escapeHtml(vision18).replace(/\n/g, "<br/>")}</p>
      </div>

      <p class="vr-sec-label">The Core Tension</p>
      <p class="vr-tension">${escapeHtml(tension)}</p>

      <p class="vr-sec-label">Where We&apos;d Start</p>
      ${whereStart.trim() ? `<p class="vr-where-intro">${escapeHtml(whereStart).replace(/\n/g, "<br/>")}</p>` : ""}
      ${serviceCards}

      <p class="vr-sec-label">Your Next Step</p>
      <div class="vr-next-box">
        <p class="vr-next-text">${escapeHtml(nextStep).replace(/\n/g, "<br/>")}</p>
        <a class="vr-cta" href="https://socialutely.com" target="_blank" rel="noopener noreferrer">Continue the Conversation</a>
      </div>

      <footer class="vr-footer">Socialutely · AI Readiness Labs™ · DreamScape™</footer>
    </article>
  </div>
</body>
</html>`;
}

async function insertDreamProfile(
  supabaseUrl: string,
  serviceKey: string,
  row: Record<string, unknown>,
): Promise<{ id: string } | null> {
  const res = await fetch(`${supabaseUrl}/rest/v1/dream_profiles`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(row),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error("vision-report: insert dream_profiles failed", res.status, text);
    return null;
  }
  try {
    const data = JSON.parse(text) as unknown;
    const first = Array.isArray(data) ? data[0] : data;
    const id = (first as { id?: string })?.id;
    return id ? { id: String(id) } : null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return errorResponse("Method not allowed", 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
  const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY") ?? "";

  if (!SUPABASE_URL || !SERVICE_KEY) return errorResponse("Missing Supabase configuration", 500);
  if (!ANTHROPIC_API_KEY) return errorResponse("Missing ANTHROPIC_API_KEY", 500);

  if (!authorizeBearer(req, ANON_KEY, SERVICE_KEY)) {
    return errorResponse("Unauthorized — set Authorization: Bearer anon or service role", 401);
  }

  let body: {
    name?: string;
    email?: string;
    business_name?: string;
    organization_type?: string;
    industry?: string;
    conversation_summary?: string;
    conversation_id?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return errorResponse("Invalid JSON", 400);
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const conversation_id = typeof body.conversation_id === "string" ? body.conversation_id.trim() : "";
  let conversation_summary = typeof body.conversation_summary === "string" ? body.conversation_summary.trim() : "";

  if (!name) return errorResponse("Missing name", 400);
  if (!email || !email.includes("@")) return errorResponse("Missing or invalid email", 400);

  const business_name = typeof body.business_name === "string" ? body.business_name.trim() : null;
  const organization_type = typeof body.organization_type === "string" ? body.organization_type.trim() : null;
  const industry = typeof body.industry === "string" ? body.industry.trim() : null;

  let conversationContext: string | null = null;
  let contextLabel = "Session summary";

  if (conversation_id) {
    if (ELEVENLABS_API_KEY) {
      try {
        conversationContext = await fetchTranscriptWithRetry(conversation_id, ELEVENLABS_API_KEY);
      } catch (e) {
        console.error("vision-report: ElevenLabs fetch error", e);
      }
    }
    if (conversationContext) {
      contextLabel = "Full conversation transcript";
    } else {
      contextLabel = "Session summary";
      conversationContext = conversation_summary || null;
    }
  } else {
    conversationContext = conversation_summary || null;
  }

  if (!conversationContext?.trim()) {
    conversationContext = NO_TRANSCRIPT_FALLBACK;
  }

  const preamble = [organization_type && `Organization type: ${organization_type}`, industry && `Industry: ${industry}`]
    .filter(Boolean)
    .join(". ");

  const userMessage = `${preamble ? `${preamble}\n\n` : ""}${contextLabel} for ${name} (${business_name || "organization not specified"}):

${conversationContext}`;

  let parsed: Record<string, unknown>;
  try {
    parsed = await callClaude(ANTHROPIC_API_KEY, userMessage);
  } catch (e) {
    console.error("vision-report: Claude failed", e);
    return errorResponse(e instanceof Error ? e.message : "Generation failed", 500);
  }

  const vision_summary = String(parsed.vision_summary ?? "");
  const dream_state = String(parsed.dream_state ?? "");
  const core_gap = String(parsed.core_gap ?? "");
  const first_focus = String(parsed.first_focus ?? "");
  const readiness_raw = parsed.readiness_score;
  const readiness_score =
    typeof readiness_raw === "number" && Number.isFinite(readiness_raw)
      ? Math.min(10, Math.max(1, Math.round(readiness_raw)))
      : null;

  let recommended_services: unknown = parsed.recommended_services;
  if (!Array.isArray(recommended_services)) recommended_services = [];

  const vision_report_html = buildVisionReportHtml(parsed, name);

  const now = new Date().toISOString();

  const insertRow: Record<string, unknown> = {
    name,
    email,
    business_name: business_name || null,
    organization_type: organization_type || null,
    industry: industry || null,
    vision_summary: vision_summary || null,
    dream_state: dream_state || null,
    core_gap: core_gap || null,
    readiness_score,
    first_focus: first_focus || null,
    recommended_services,
    vision_report_html,
    vision_report_sent: true,
    vision_report_sent_at: now,
    conversation_id: conversation_id || null,
    source: SOURCE,
    updated_at: now,
  };

  const inserted = await insertDreamProfile(SUPABASE_URL, SERVICE_KEY, insertRow);
  if (!inserted) return errorResponse("Failed to save Vision Report", 500);

  return jsonResponse({
    success: true,
    profile_id: inserted.id,
    report_html: vision_report_html,
  });
});
