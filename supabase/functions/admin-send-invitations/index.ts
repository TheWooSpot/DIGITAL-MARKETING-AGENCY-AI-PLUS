import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { buildBriefInvitationHtml } from "../_shared/build-brief-invitation-html.ts";
import { corsHeaders } from "../_shared/cors.ts";

const LOG_PREFIX = "[admin-send-invitations]";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function checkPhrase(body: Record<string, unknown>): boolean {
  const phrase = typeof body.admin_phrase === "string" ? body.admin_phrase.trim() : "";
  const expected = (Deno.env.get("ADMIN_ACCESS_PHRASE") ?? "").trim();
  return Boolean(expected && phrase === expected);
}

type InvitationPayload = {
  partner_email: string;
  partner_first_name: string;
  brief_token: string;
  brief_topic: string;
  surfaces?: string[];
  email_subject?: string;
  custom_intro?: string;
  consideration_hours?: number;
};

function parseInvitation(raw: unknown): InvitationPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const partner_email = typeof o.partner_email === "string" ? o.partner_email.trim() : "";
  const partner_first_name =
    typeof o.partner_first_name === "string" ? o.partner_first_name.trim() : "";
  const brief_token = typeof o.brief_token === "string" ? o.brief_token.trim() : "";
  const brief_topic = typeof o.brief_topic === "string" ? o.brief_topic.trim() : "";
  if (!partner_email || !partner_first_name || !brief_token || !brief_topic) return null;

  let surfaces: string[] | undefined;
  if (Array.isArray(o.surfaces)) {
    surfaces = o.surfaces
      .filter((s): s is string => typeof s === "string")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  const email_subject =
    typeof o.email_subject === "string" && o.email_subject.trim()
      ? o.email_subject.trim()
      : undefined;
  const custom_intro =
    typeof o.custom_intro === "string" && o.custom_intro.trim() ? o.custom_intro : undefined;

  let consideration_hours = 96;
  if (typeof o.consideration_hours === "number" && Number.isFinite(o.consideration_hours)) {
    consideration_hours = Math.max(1, Math.floor(o.consideration_hours));
  }

  return {
    partner_email,
    partner_first_name,
    brief_token,
    brief_topic,
    surfaces,
    email_subject,
    custom_intro,
    consideration_hours,
  };
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
    return json({ error: "Invalid JSON body." }, 400);
  }

  if (!checkPhrase(body)) {
    return json({ error: "Unauthorized" }, 401);
  }

  const action = typeof body.action === "string" ? body.action.trim() : "";

  if (action === "preview") {
    const inv = parseInvitation(body.invitation ?? body);
    if (!inv) {
      return json(
        { error: "Invalid preview payload: need partner_email, partner_first_name, brief_token, brief_topic." },
        400,
      );
    }
    const include_roundtable =
      inv.surfaces !== undefined && inv.surfaces.length > 0
        ? inv.surfaces.includes("roundtable_calendar")
        : true;
    const html = buildBriefInvitationHtml({
      partner_first_name: inv.partner_first_name,
      brief_topic: inv.brief_topic,
      brief_token: inv.brief_token,
      consideration_hours: inv.consideration_hours ?? 96,
      include_roundtable_mention: include_roundtable,
      custom_intro: inv.custom_intro,
      surfaces: inv.surfaces,
    });
    return json({ html });
  }

  if (action !== "send_invitations") {
    return json({ error: "Unknown action. Use preview or send_invitations." }, 400);
  }

  const rawList = body.invitations;
  if (!Array.isArray(rawList) || rawList.length === 0) {
    return json({ error: "invitations must be a non-empty array." }, 400);
  }

  const supabaseUrl = (Deno.env.get("SUPABASE_URL") ?? "").replace(/\/$/, "");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceKey) {
    console.log(LOG_PREFIX, "missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return json({ error: "Server configuration error." }, 500);
  }

  const results: Array<{
    brief_token_suffix: string;
    success: boolean;
    resend_id?: string;
    error?: string;
    http_status?: number;
  }> = [];

  for (const raw of rawList) {
    const inv = parseInvitation(raw);
    if (!inv) {
      results.push({
        brief_token_suffix: "?",
        success: false,
        error: "Invalid invitation object.",
      });
      continue;
    }

    const surfaces = inv.surfaces ?? [];
    const include_roundtable_mention =
      surfaces.length > 0 ? surfaces.includes("roundtable_calendar") : true;

    const sendBody: Record<string, unknown> = {
      partner_email: inv.partner_email,
      partner_first_name: inv.partner_first_name,
      brief_token: inv.brief_token,
      brief_topic: inv.brief_topic,
      consideration_hours: inv.consideration_hours ?? 96,
      include_roundtable_mention,
      surfaces,
    };
    if (inv.email_subject) sendBody.email_subject = inv.email_subject;
    if (inv.custom_intro) sendBody.custom_intro = inv.custom_intro;

    const url = `${supabaseUrl}/functions/v1/send-brief-invitation`;
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(sendBody),
      });
    } catch (e) {
      console.log(LOG_PREFIX, "fetch error", String(e));
      results.push({
        brief_token_suffix: inv.brief_token.slice(-8),
        success: false,
        error: "Failed to reach send-brief-invitation.",
      });
      continue;
    }

    const resText = await res.text();
    let parsed: { success?: boolean; resend_id?: string; error?: string } = {};
    try {
      parsed = resText ? (JSON.parse(resText) as typeof parsed) : {};
    } catch {
      parsed = {};
    }

    if (res.ok && parsed.success) {
      results.push({
        brief_token_suffix: inv.brief_token.slice(-8),
        success: true,
        resend_id: parsed.resend_id,
      });
    } else {
      results.push({
        brief_token_suffix: inv.brief_token.slice(-8),
        success: false,
        http_status: res.status,
        error: parsed.error ?? resText.slice(0, 200) ?? `HTTP ${res.status}`,
      });
    }
  }

  return json({ results });
});
