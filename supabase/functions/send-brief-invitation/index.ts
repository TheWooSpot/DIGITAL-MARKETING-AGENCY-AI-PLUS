import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { buildBriefInvitationHtml } from "../_shared/build-brief-invitation-html.ts";

const LOG_PREFIX = "[send-brief-invitation]";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function authorizeService(req: Request): boolean {
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  return Boolean(serviceKey && token === serviceKey);
}

function formatResendFrom(envFrom: string): string {
  const trimmed = envFrom.trim();
  const m = trimmed.match(/<([^>]+)>/);
  const email = (m?.[1] ?? trimmed).trim();
  return `AI Readiness Labs <${email}>`;
}

function parseSurfaces(body: Record<string, unknown>): string[] | undefined {
  if (!Array.isArray(body.surfaces)) return undefined;
  return body.surfaces
    .filter((s): s is string => typeof s === "string")
    .map((s) => s.trim())
    .filter(Boolean);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return json({ success: false, error: "Invalid JSON body." }, 400);
  }

  if (!authorizeService(req)) {
    return json({ error: "Unauthorized" }, 401);
  }

  const resendKey = Deno.env.get("RESEND_API_KEY");
  const resendFrom = Deno.env.get("RESEND_FROM_EMAIL");
  if (!resendKey || !resendFrom) {
    console.log(LOG_PREFIX, "missing RESEND_API_KEY or RESEND_FROM_EMAIL");
    return json(
      { success: false, error: "Missing email configuration (RESEND_API_KEY / RESEND_FROM_EMAIL)." },
      500,
    );
  }

  const partner_first_name =
    typeof body.partner_first_name === "string" ? body.partner_first_name.trim() : "";
  const partner_email =
    typeof body.partner_email === "string" ? body.partner_email.trim() : "";
  const brief_token = typeof body.brief_token === "string" ? body.brief_token.trim() : "";
  const brief_topic = typeof body.brief_topic === "string" ? body.brief_topic.trim() : "";

  const surfaces = parseSurfaces(body);
  const include_roundtable_mention =
    surfaces !== undefined && surfaces.length > 0
      ? surfaces.includes("roundtable_calendar")
      : typeof body.include_roundtable_mention === "boolean"
        ? body.include_roundtable_mention
        : true;

  let consideration_hours = 96;
  if (typeof body.consideration_hours === "number" && Number.isFinite(body.consideration_hours)) {
    consideration_hours = Math.max(1, Math.floor(body.consideration_hours));
  }

  const email_subject =
    typeof body.email_subject === "string" && body.email_subject.trim()
      ? body.email_subject.trim()
      : "AI Readiness Labs — Partner Brief";

  const custom_intro =
    typeof body.custom_intro === "string" && body.custom_intro.trim()
      ? body.custom_intro
      : undefined;

  if (!partner_first_name || !partner_email || !brief_token || !brief_topic) {
    return json(
      {
        success: false,
        error:
          "Missing required fields: partner_first_name, partner_email, brief_token, brief_topic.",
      },
      400,
    );
  }

  const html = buildBriefInvitationHtml({
    partner_first_name,
    brief_topic,
    brief_token,
    consideration_hours,
    include_roundtable_mention,
    custom_intro,
    surfaces,
  });

  const fromHeader = formatResendFrom(resendFrom);

  console.log(LOG_PREFIX, "sending", {
    to: partner_email,
    subject: email_subject,
    brief_url_suffix: brief_token.slice(-8),
    surfaces_count: surfaces?.length ?? 0,
  });

  let res: Response;
  try {
    res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromHeader,
        to: [partner_email],
        subject: email_subject,
        html,
      }),
    });
  } catch (e) {
    console.log(LOG_PREFIX, "fetch error", String(e));
    return json({ success: false, error: "Failed to reach Resend." }, 500);
  }

  const resText = await res.text();
  let resJson: { id?: string; message?: string } = {};
  try {
    resJson = resText ? (JSON.parse(resText) as { id?: string; message?: string }) : {};
  } catch {
    console.log(LOG_PREFIX, "non-JSON response", res.status, resText.slice(0, 500));
  }

  console.log(LOG_PREFIX, "resend response", {
    http_status: res.status,
    ok: res.ok,
    resend_id: resJson?.id,
    message: resJson?.message,
    body_preview: resText.slice(0, 300),
  });

  if (!res.ok) {
    return json(
      {
        success: false,
        error: resJson?.message ?? resText ?? `Resend error (${res.status})`,
      },
      500,
    );
  }

  const resend_id = resJson?.id ?? "";
  return json({ success: true, resend_id });
});
