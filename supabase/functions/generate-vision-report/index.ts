/**
 * Socialutely — Vision Report™ email (DreamScape™ Door 13)
 * =========================================================
 * POST { "prospect_id": "<uuid>", "force"?: boolean }
 *
 * Reads layer5_prospects (dream_profile, business_name, email, tier, services, gaps),
 * generates 5 narrative sections via Claude, sends HTML email via Resend,
 * sets dream_report_sent / dream_report_sent_at.
 *
 * Secrets (Supabase Dashboard → Edge Functions):
 *   ANTHROPIC_API_KEY, RESEND_API_KEY, RESEND_FROM_EMAIL,
 *   VISION_REPORT_CTA_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Auth: Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY> (same as REST service role)
 */
const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const CLAUDE_MODEL = "claude-sonnet-4-20250514";

/** Service id → display name (aligned with app catalog). */
const SERVICE_NAMES: Record<number, string> = {
  101: "SearchLift™ SBO Engine",
  102: "SpotLight Direct™ Media Engine",
  103: "Authority Amplifier™ PR System",
  104: "Signal Surge™ Paid Traffic Lab",
  105: "NearRank™ Local Discovery Engine",
  106: "AutoRank™ Search Box Optimizer",
  201: "VoiceBridge™ AI ChatLabs",
  202: "InboxIgnite™ Smart Email Engine",
  203: "TextPulse™ SMS Automation",
  503: "Adaptation™ AI Readiness Rung 2",
  301: "BookStream™ Smart Scheduling Hub",
  302: "CloseCraft™ Funnel Builder",
  303: "DealDrive™ Proposal Automation",
  304: "PayNamic™ Dynamic Checkout Engine",
  401: "HubAI™ CRM Architecture",
  402: "FlowForge™ Automation Lab",
  403: "CommandDesk™ Client Portal System",
  501: "SkillSprint™ Workshop Academy",
  502: "Onboardly™ Client Activation System",
  601: "Voice & Vibe™ Production Engine",
  602: "StoryFrame™ Brand Narrative Suite",
  701: "InsightLoop™ Analytics Dashboard",
  801: "TrustGuard™ Governance Layer",
  802: "ReputationStack™ Reviews Engine",
  901: "AllianceOS™ Growth Partnerships Engine",
  1001: "Socialutely Circle™",
  1002: "Momentum Vault™",
  1003: "Concierge Access™",
  1004: "AI Maturity Diagnostic & Blueprint™",
};

interface VisionSections {
  section1_your_vision: string;
  section2_what_we_heard: string[];
  section3_what_we_build: Array<{ service: string; connection: string }>;
  section4_where_to_start: string;
  section5_next_step: string;
}

function jsonResponse(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function serviceLabel(id: unknown): string {
  const n = typeof id === "number" ? id : Number(id);
  if (!Number.isFinite(n)) return "Service";
  return SERVICE_NAMES[n] ?? `Service #${n}`;
}

function normalizeRecommended(raw: unknown): { id: number; summary?: string }[] {
  if (!Array.isArray(raw)) return [];
  const out: { id: number; summary?: string }[] = [];
  for (const item of raw) {
    if (typeof item === "number") {
      out.push({ id: item });
    } else if (item && typeof item === "object" && "service_id" in item) {
      const o = item as { service_id?: number; tier_summary?: string; reason?: string };
      const id = Number(o.service_id);
      if (!Number.isFinite(id)) continue;
      const summary = typeof o.tier_summary === "string" ? o.tier_summary : typeof o.reason === "string" ? o.reason : undefined;
      out.push({ id, summary });
    }
  }
  return out;
}

async function fetchProspect(
  supabaseUrl: string,
  serviceKey: string,
  prospectId: string
): Promise<Record<string, unknown> | null> {
  const res = await fetch(
    `${supabaseUrl}/rest/v1/layer5_prospects?id=eq.${encodeURIComponent(prospectId)}&select=*`,
    {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    }
  );
  if (!res.ok) {
    console.error("generate-vision-report: fetch prospect failed", res.status, await res.text());
    return null;
  }
  const rows = (await res.json()) as unknown;
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return rows[0] as Record<string, unknown>;
}

async function patchProspect(
  supabaseUrl: string,
  serviceKey: string,
  prospectId: string,
  patch: Record<string, unknown>
): Promise<boolean> {
  const res = await fetch(`${supabaseUrl}/rest/v1/layer5_prospects?id=eq.${encodeURIComponent(prospectId)}`, {
    method: "PATCH",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    console.error("generate-vision-report: patch failed", res.status, await res.text());
    return false;
  }
  return true;
}

async function callClaudeVisionReport(
  apiKey: string,
  context: string
): Promise<VisionSections> {
  const system = `You write the Vision Report™ for Socialutely — a premium digital marketing and AI growth partner.
Output valid JSON only. No markdown fences. Keys must match exactly:
section1_your_vision (string, 2-3 warm sentences mirroring their dream, present tense where natural)
section2_what_we_heard (array of 2-3 short strings — gaps/opportunities from Act 3 tone; never harsh or "problem" framing)
section3_what_we_build (array of 3-5 objects { "service": "<exact service name from input list>", "connection": "<one line tying service to their vision>" })
section4_where_to_start (string, 2-3 sentences: recommended tier + first service cluster to sequence)
section5_next_step (string, one short warm CTA paragraph — inviting, not salesy)`;

  const user = `Generate the Vision Report JSON from this prospect context:\n\n${context}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 4096,
      temperature: 0.7,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });

  if (!res.ok) throw new Error(`Anthropic error: ${res.status} ${await res.text()}`);

  const data = (await res.json()) as { content: Array<{ type: string; text?: string }> };
  let text = data.content?.[0]?.text ?? "";
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
  const parsed = JSON.parse(text) as VisionSections;
  return parsed;
}

function buildEmailHtml(sections: VisionSections, ctaUrl: string): string {
  const s2 = sections.section2_what_we_heard.map((l) => `<p style="margin:0 0 12px 0;color:#e8eef5;">${escapeHtml(l)}</p>`).join("");
  const s3 = sections.section3_what_we_build
    .map(
      (row) =>
        `<p style="margin:0 0 16px 0;"><strong style="color:#c9973a;">${escapeHtml(row.service)}</strong><br/><span style="color:#b8c2d0;">${escapeHtml(row.connection)}</span></p>`
    )
    .join("");

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width"/></head>
<body style="margin:0;background:#07080d;font-family:Georgia,'Times New Roman',serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#07080d;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;background:#0d0f16;border:1px solid rgba(201,151,58,0.25);border-radius:12px;overflow:hidden;">
<tr><td style="padding:28px 32px 8px 32px;text-align:center;">
<p style="margin:0;font-size:11px;letter-spacing:0.35em;text-transform:uppercase;color:#c9973a;font-family:ui-monospace,monospace;">Vision Report™</p>
<p style="margin:12px 0 0 0;font-size:22px;color:#f4f6f9;line-height:1.3;">Socialutely</p>
</td></tr>
<tr><td style="padding:16px 32px 24px 32px;">
<p style="margin:0 0 20px 0;font-size:15px;line-height:1.65;color:#e8eef5;">
You shared something with us today that most people never say out loud. Here's what we heard.
</p>
<h2 style="margin:28px 0 10px 0;font-size:13px;letter-spacing:0.2em;text-transform:uppercase;color:#c9973a;font-family:ui-monospace,monospace;">Your vision</h2>
<p style="margin:0 0 24px 0;font-size:15px;line-height:1.7;color:#e8eef5;">${escapeHtml(sections.section1_your_vision)}</p>
<h2 style="margin:28px 0 10px 0;font-size:13px;letter-spacing:0.2em;text-transform:uppercase;color:#c9973a;font-family:ui-monospace,monospace;">What we heard</h2>
<div style="margin:0 0 24px 0;">${s2}</div>
<h2 style="margin:28px 0 10px 0;font-size:13px;letter-spacing:0.2em;text-transform:uppercase;color:#c9973a;font-family:ui-monospace,monospace;">What we'd build</h2>
<div style="margin:0 0 24px 0;">${s3}</div>
<h2 style="margin:28px 0 10px 0;font-size:13px;letter-spacing:0.2em;text-transform:uppercase;color:#c9973a;font-family:ui-monospace,monospace;">Where to start</h2>
<p style="margin:0 0 24px 0;font-size:15px;line-height:1.7;color:#e8eef5;">${escapeHtml(sections.section4_where_to_start)}</p>
<h2 style="margin:28px 0 10px 0;font-size:13px;letter-spacing:0.2em;text-transform:uppercase;color:#c9973a;font-family:ui-monospace,monospace;">Your next step</h2>
<p style="margin:0 0 28px 0;font-size:15px;line-height:1.7;color:#e8eef5;">${escapeHtml(sections.section5_next_step)}</p>
<div style="text-align:center;margin:32px 0 24px 0;">
<a href="${escapeHtml(ctaUrl)}" style="display:inline-block;padding:14px 28px;background:#c9973a;color:#07080d;text-decoration:none;font-weight:700;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;border-radius:6px;font-family:system-ui,sans-serif;">Let's build this together</a>
</div>
<p style="margin:24px 0 0 0;font-size:13px;line-height:1.6;color:#8b95a8;text-align:center;">
With care,<br/>Amelia &amp; the Socialutely team
</p>
</td></tr>
</table>
<p style="margin:20px 0 0 0;font-size:11px;color:#5c6478;text-align:center;">DreamScape™ · Socialutely</p>
</td></tr>
</table>
</body></html>`;
}

function extractFirstName(row: Record<string, unknown>, dreamProfile: Record<string, unknown>): string {
  const fromDream = dreamProfile.first_name;
  if (typeof fromDream === "string" && fromDream.trim()) return fromDream.trim().split(/\s+/)[0] ?? "there";
  const bn = typeof row.business_name === "string" ? row.business_name.trim() : "";
  if (bn) return bn.split(/\s+/)[0] ?? "there";
  return "there";
}

function authorize(req: Request, serviceKey: string): boolean {
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  return token === serviceKey && token.length > 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
  const RESEND_FROM = Deno.env.get("RESEND_FROM_EMAIL") ?? "Socialutely <onboarding@resend.dev>";
  const CTA_URL = Deno.env.get("VISION_REPORT_CTA_URL") ?? "https://socialutely-any-door-engine.vercel.app/doors/url-diagnostic";

  try {
    if (!authorize(req, SERVICE_KEY)) {
      return jsonResponse({ error: "Unauthorized — use Bearer SUPABASE_SERVICE_ROLE_KEY" }, 401);
    }
    if (!SUPABASE_URL || !SERVICE_KEY) return jsonResponse({ error: "Missing Supabase env" }, 500);
    if (!ANTHROPIC_API_KEY) return jsonResponse({ error: "Missing ANTHROPIC_API_KEY" }, 500);
    if (!RESEND_API_KEY) return jsonResponse({ error: "Missing RESEND_API_KEY" }, 500);

    let body: { prospect_id?: string; force?: boolean };
    try {
      body = (await req.json()) as { prospect_id?: string; force?: boolean };
    } catch {
      return jsonResponse({ error: "Invalid JSON" }, 400);
    }

    const prospectId = typeof body.prospect_id === "string" ? body.prospect_id.trim() : "";
    if (!prospectId) return jsonResponse({ error: "Missing prospect_id" }, 400);

    const row = await fetchProspect(SUPABASE_URL, SERVICE_KEY, prospectId);
    if (!row) return jsonResponse({ error: "Prospect not found" }, 404);

    const email = typeof row.email === "string" ? row.email.trim() : "";
    if (!email) return jsonResponse({ error: "Prospect has no email" }, 400);

    const sentAlready = row.dream_report_sent === true;
    if (sentAlready && !body.force) {
      console.log("generate-vision-report: skip — already sent", prospectId);
      return jsonResponse({ ok: true, skipped: true, reason: "dream_report_sent" }, 200);
    }

    const dreamProfile =
      row.dream_profile && typeof row.dream_profile === "object" && !Array.isArray(row.dream_profile)
        ? (row.dream_profile as Record<string, unknown>)
        : {};

    if (Object.keys(dreamProfile).length === 0) {
      return jsonResponse({ error: "Missing dream_profile — run DreamScape session webhook first or set dream_profile on the row" }, 400);
    }

    const businessName = typeof row.business_name === "string" ? row.business_name : "your organization";
    const tier = typeof row.recommended_tier === "string" ? row.recommended_tier : "Signature";
    const recs = normalizeRecommended(row.recommended_services);
    const gaps = Array.isArray(row.detected_gaps) ? row.detected_gaps : [];

    const gapsForPrompt = (gaps as unknown[])
      .slice(0, 8)
      .map((g) => {
        if (g && typeof g === "object" && "gap_description" in g) {
          return String((g as { gap_description?: string }).gap_description ?? "");
        }
        return "";
      })
      .filter(Boolean);

    const servicesForPrompt = recs.map((r) => ({
      id: r.id,
      name: serviceLabel(r.id),
      tier_summary: r.summary ?? "",
    }));

    const context = JSON.stringify(
      {
        business_name: businessName,
        recommended_tier: tier,
        dream_profile: dreamProfile,
        recommended_services: servicesForPrompt,
        detected_gap_descriptions: gapsForPrompt,
        prospect_summary: typeof row.prospect_summary === "string" ? row.prospect_summary : "",
      },
      null,
      2
    );

    console.log("generate-vision-report: calling Claude", { prospectId, email });
    const sections = await callClaudeVisionReport(ANTHROPIC_API_KEY, context);

    const firstName = extractFirstName(row, dreamProfile);
    const subject = `Here's what we'd build for you, ${firstName}`;
    const html = buildEmailHtml(sections, CTA_URL);

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [email],
        subject,
        html,
      }),
    });

    const resendText = await resendRes.text();
    if (!resendRes.ok) {
      console.error("generate-vision-report: Resend failed", resendRes.status, resendText);
      return jsonResponse({ error: "Resend failed", detail: resendText.slice(0, 500) }, 502);
    }

    let resendBody: unknown = resendText;
    try {
      resendBody = JSON.parse(resendText) as unknown;
    } catch {
      /* non-JSON error bodies */
    }

    const patched = await patchProspect(SUPABASE_URL, SERVICE_KEY, prospectId, {
      dream_report_sent: true,
      dream_report_sent_at: new Date().toISOString(),
    });

    if (!patched) return jsonResponse({ error: "Email sent but DB update failed", resend: resendBody }, 207);

    console.log("generate-vision-report: success", { prospectId, email, resend: resendText.slice(0, 200) });
    return jsonResponse({
      ok: true,
      prospect_id: prospectId,
      email,
      subject,
      resend: resendBody,
    });
  } catch (err) {
    console.error("generate-vision-report error:", err);
    return jsonResponse({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
