import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { BRIEF_INVITATION_HTML } from "./brief-invitation-template.ts";

const BRIEF_APP_ORIGIN = "https://socialutely-any-door-engine.vercel.app";
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

function replaceVars(html: string, vars: Record<string, string>): string {
  let out = html;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{{${k}}}`).join(v);
  }
  return out;
}

/** Whole `<tr>...</tr>` for the optional roundtable paragraph, or empty. */
function roundtableSectionHtml(
  include: boolean,
  considerationHours: number,
): string {
  if (!include) return "";
  const hours = String(considerationHours);
  return `<tr>
                  <td style="padding:0 8px 14px 8px;font-family:Arial,Helvetica,Verdana,system-ui,sans-serif;font-size:17px;line-height:1.6;color:#d6dadf;">
                    After the brief, you'll see a calendar of available times for a sixty-minute partner working session. Tap any times that work for you — when the group converges on a single hour, calendar invites go out automatically. You'll have ${hours} hours to tap, so there's no rush.
                  </td>
                </tr>`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
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

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return json({ success: false, error: "Invalid JSON body." }, 400);
  }

  const partner_first_name =
    typeof body.partner_first_name === "string" ? body.partner_first_name.trim() : "";
  const partner_email =
    typeof body.partner_email === "string" ? body.partner_email.trim() : "";
  const brief_token = typeof body.brief_token === "string" ? body.brief_token.trim() : "";
  const brief_topic = typeof body.brief_topic === "string" ? body.brief_topic.trim() : "";

  const include_roundtable_mention =
    typeof body.include_roundtable_mention === "boolean"
      ? body.include_roundtable_mention
      : true;

  let consideration_hours = 96;
  if (typeof body.consideration_hours === "number" && Number.isFinite(body.consideration_hours)) {
    consideration_hours = Math.max(1, Math.floor(body.consideration_hours));
  }

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

  const brief_url =
    `${BRIEF_APP_ORIGIN}/partner-brief?token=${encodeURIComponent(brief_token)}`;
  const window_days = Math.max(1, Math.ceil(consideration_hours / 24));

  const html = replaceVars(BRIEF_INVITATION_HTML, {
    partner_first_name,
    brief_topic,
    brief_url,
    consideration_hours: String(consideration_hours),
    window_days: String(window_days),
    include_roundtable_mention: roundtableSectionHtml(
      include_roundtable_mention,
      consideration_hours,
    ),
  });

  const fromHeader = formatResendFrom(resendFrom);
  const subject = "An invitation: AI Readiness Labs partner brief";

  console.log(LOG_PREFIX, "sending", {
    to: partner_email,
    subject,
    brief_url_suffix: brief_token.slice(-8),
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
        subject,
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
