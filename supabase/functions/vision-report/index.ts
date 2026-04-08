/**
 * Socialutely — Vision Report™ generator (DreamScape™ follow-up)
 * ==============================================================
 * POST JSON:
 *   { "prospect_id": "<uuid>", "dream_profile": "<raw transcript or notes>",
 *     "business_name": "<name>", "email": "<email>" }
 *
 * - Generates warm HTML Vision Report via Claude (sonnet)
 * - Merges result into layer5_prospects.dream_profile (JSONB)
 * - Sends email via Resend (skips if RESEND_API_KEY missing)
 *
 * Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY,
 *           RESEND_API_KEY (optional), RESEND_FROM_EMAIL (optional)
 *
 * Auth: Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
 */
const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const MODEL = "claude-sonnet-4-20250514";

function jsonResponse(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

function authorize(req: Request, serviceKey: string): boolean {
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  return token === serviceKey && token.length > 0;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function fetchProspect(
  supabaseUrl: string,
  serviceKey: string,
  id: string
): Promise<Record<string, unknown> | null> {
  const res = await fetch(
    `${supabaseUrl}/rest/v1/layer5_prospects?id=eq.${encodeURIComponent(id)}&select=*`,
    {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    }
  );
  if (!res.ok) return null;
  const rows = (await res.json()) as unknown;
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return rows[0] as Record<string, unknown>;
}

async function patchProspectDreamProfile(
  supabaseUrl: string,
  serviceKey: string,
  prospectId: string,
  dreamProfile: Record<string, unknown>
): Promise<boolean> {
  const res = await fetch(`${supabaseUrl}/rest/v1/layer5_prospects?id=eq.${encodeURIComponent(prospectId)}`, {
    method: "PATCH",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ dream_profile: dreamProfile }),
  });
  return res.ok;
}

async function generateVisionHtml(
  apiKey: string,
  dreamNotes: string,
  businessName: string
): Promise<string> {
  const system = `You write Vision Report™ HTML for Socialutely (premium digital marketing + AI growth partner).
Output ONLY valid HTML fragments (no <!DOCTYPE>, no <html>/<body> wrapper).
Use: a single <article> with class "vision-report", containing exactly three <p> paragraphs.
Tone: warm, strategic, forward-looking — NOT a diagnostic checklist.
Extract and reflect: stated vision, primary obstacle, emotional driver, single most desired outcome — woven naturally, not as labels.
Style inline sparingly: color #e8eef5 for text, #c9973a for subtle emphasis in <strong> where appropriate.
Do not use markdown. Do not use stage directions or bracketed asides.`;

  const user = `Business: ${businessName}

Session notes / transcript material:

${dreamNotes}

Write the three-paragraph Vision Report HTML as specified.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4096,
      temperature: 0.65,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });

  if (!res.ok) throw new Error(`Anthropic error: ${res.status} ${await res.text()}`);

  const data = (await res.json()) as { content: Array<{ type: string; text?: string }> };
  let text = data.content?.[0]?.text ?? "";
  text = text.replace(/^```(?:html)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
  return text;
}

async function sendResendEmail(
  apiKey: string,
  from: string,
  to: string,
  subject: string,
  html: string
): Promise<boolean> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html: `<div style="font-family:Georgia,serif;background:#07080d;color:#e8eef5;padding:24px;">${html}</div>`,
    }),
  });
  if (!res.ok) {
    console.error("vision-report: Resend error", res.status, await res.text());
    return false;
  }
  return true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
  const RESEND_FROM = Deno.env.get("RESEND_FROM_EMAIL") ?? "Socialutely <onboarding@resend.dev>";

  if (!authorize(req, SERVICE_KEY)) {
    return jsonResponse({ error: "Unauthorized — use Bearer SUPABASE_SERVICE_ROLE_KEY" }, 401);
  }
  if (!SUPABASE_URL || !SERVICE_KEY) return jsonResponse({ error: "Missing Supabase env" }, 500);
  if (!ANTHROPIC_API_KEY) return jsonResponse({ error: "Missing ANTHROPIC_API_KEY" }, 500);

  let body: {
    prospect_id?: string;
    dream_profile?: string;
    business_name?: string;
    email?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const prospectId = typeof body.prospect_id === "string" ? body.prospect_id.trim() : "";
  const dreamRaw = typeof body.dream_profile === "string" ? body.dream_profile.trim() : "";
  const businessName = typeof body.business_name === "string" ? body.business_name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";

  if (!prospectId) return jsonResponse({ error: "Missing prospect_id" }, 400);
  if (!dreamRaw) return jsonResponse({ error: "Missing dream_profile" }, 400);
  if (!businessName) return jsonResponse({ error: "Missing business_name" }, 400);
  if (!email) return jsonResponse({ error: "Missing email" }, 400);

  const row = await fetchProspect(SUPABASE_URL, SERVICE_KEY, prospectId);
  if (!row) return jsonResponse({ error: "Prospect not found" }, 404);

  let existing: Record<string, unknown> = {};
  if (row.dream_profile && typeof row.dream_profile === "object" && !Array.isArray(row.dream_profile)) {
    existing = { ...(row.dream_profile as Record<string, unknown>) };
  }

  let reportHtml: string;
  try {
    reportHtml = await generateVisionHtml(ANTHROPIC_API_KEY, dreamRaw, businessName);
  } catch (e) {
    console.error("vision-report: Claude failed", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Generation failed" }, 500);
  }

  const merged: Record<string, unknown> = {
    ...existing,
    vision_report_html: reportHtml,
    vision_report_raw_input: dreamRaw,
    vision_report_generated_at: new Date().toISOString(),
    vision_report_business_name: businessName,
  };

  const ok = await patchProspectDreamProfile(SUPABASE_URL, SERVICE_KEY, prospectId, merged);
  if (!ok) return jsonResponse({ error: "Failed to update prospect" }, 500);

  if (RESEND_API_KEY) {
    const subject = `Your Socialutely Vision Report — ${businessName}`;
    const emailed = await sendResendEmail(RESEND_API_KEY, RESEND_FROM, email, subject, reportHtml);
    if (!emailed) console.warn("vision-report: email send failed (non-fatal)");
  } else {
    console.warn("vision-report: RESEND_API_KEY missing — skipping email");
  }

  return jsonResponse({ success: true, report: reportHtml }, 200);
});
