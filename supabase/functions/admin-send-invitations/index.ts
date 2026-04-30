import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { buildBriefInvitationHtml } from "../_shared/build-brief-invitation-html.ts";
import { corsHeaders } from "../_shared/cors.ts";

const LOG_PREFIX = "[admin-send-invitations]";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function getServiceSupabase(): SupabaseClient | null {
  const supabaseUrl = (Deno.env.get("SUPABASE_URL") ?? "").replace(/\/$/, "");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceKey) return null;
  return createClient(supabaseUrl, serviceKey);
}

async function validateAdminSession(
  supabase: SupabaseClient,
  sessionToken: string,
): Promise<boolean> {
  const trimmed = sessionToken.trim();
  if (!trimmed) return false;
  const { data, error } = await supabase.rpc("admin_validate_session", {
    p_token: trimmed,
  });
  if (error) {
    console.log(LOG_PREFIX, "admin_validate_session", error.message);
    return false;
  }
  return data === true;
}

async function logAdminAction(
  supabase: SupabaseClient,
  sessionToken: string,
  action: string,
  details: Record<string, unknown>,
  result: string = "success",
  errorMessage: string | null = null,
): Promise<void> {
  const { error } = await supabase.rpc("admin_log_action", {
    p_token: sessionToken.trim(),
    p_action: action,
    p_details: details,
    p_result: result,
    p_error_message: errorMessage,
    p_ip_hint: null,
  });
  if (error) {
    console.log(LOG_PREFIX, "admin_log_action", error.message);
  }
}

function readAdminSessionHeader(req: Request): string {
  return (
    req.headers.get("X-Admin-Session") ??
    req.headers.get("x-admin-session") ??
    ""
  ).trim();
}

function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 0) return "***";
  return `***${email.slice(at)}`;
}

function randomHex(bytes: number): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return [...buf].map((b) => b.toString(16).padStart(2, "0")).join("");
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

type SendResult = {
  brief_token_suffix: string;
  success: boolean;
  resend_id?: string;
  error?: string;
  http_status?: number;
  surfaces_granted: string[];
  surfaces_failed: Array<{ surface: string; reason: string }>;
};

function wantsEmailSurfaces(surfaces: string[]): boolean {
  return surfaces.includes("partner_brief_labs") || surfaces.includes("roundtable_calendar");
}

async function validateSurfaceName(
  supabase: SupabaseClient,
  surface: string,
): Promise<{ valid: boolean; reason: string }> {
  const { data, error } = await supabase.rpc("validate_surface_name", {
    p_surface: surface,
  });
  if (error) {
    console.log(LOG_PREFIX, "validate_surface_name rpc", error.message);
    return { valid: false, reason: error.message };
  }
  const row = (Array.isArray(data) ? data[0] : data) as {
    valid?: boolean;
    reason?: string | null;
  } | null;
  if (!row || typeof row.valid !== "boolean") {
    return { valid: false, reason: "invalid_rpc_response" };
  }
  return { valid: row.valid, reason: row.reason?.trim() ?? "" };
}

async function grantSurfaceIfNeeded(
  supabase: SupabaseClient,
  partnerToken: string,
  surface: string,
): Promise<{ ok: true; state: "inserted" | "already_active" } | { ok: false; error: string }> {
  const { data: existing, error: selErr } = await supabase
    .from("share_grants")
    .select("id")
    .eq("partner_token", partnerToken)
    .eq("surface", surface)
    .is("revoked_at", null)
    .maybeSingle();

  if (selErr) {
    return { ok: false, error: selErr.message };
  }
  if (existing) {
    return { ok: true, state: "already_active" };
  }

  const { error: insErr } = await supabase.from("share_grants").insert({
    partner_token: partnerToken,
    surface,
    granted_by: "admin_send_invitations",
  });
  if (insErr) {
    return { ok: false, error: insErr.message };
  }
  return { ok: true, state: "inserted" };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const sessionToken = readAdminSessionHeader(req);
  if (!sessionToken) {
    return json({ ok: false, error: "No session token" }, 401);
  }

  const supabase = getServiceSupabase();
  if (!supabase) {
    console.log(LOG_PREFIX, "missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return json({ error: "Server configuration error." }, 500);
  }

  const sessionOk = await validateAdminSession(supabase, sessionToken);
  if (!sessionOk) {
    return json({ ok: false, error: "Session expired or invalid" }, 401);
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  const action = typeof body.action === "string" ? body.action.trim() : "";

  if (action === "create_partner") {
    const partner_first_name =
      typeof body.partner_first_name === "string" ? body.partner_first_name.trim() : "";
    const partner_last_name =
      typeof body.partner_last_name === "string" ? body.partner_last_name.trim() : "";
    const partner_email_raw =
      typeof body.partner_email === "string" ? body.partner_email.trim().toLowerCase() : "";
    let max_calls = 5;
    if (typeof body.max_calls === "number" && Number.isFinite(body.max_calls)) {
      max_calls = Math.max(0, Math.floor(body.max_calls));
    }
    const notes =
      typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : undefined;

    if (!partner_first_name || !partner_last_name || !partner_email_raw) {
      return json({ error: "partner_first_name, partner_last_name, and partner_email are required." }, 400);
    }
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(partner_email_raw);
    if (!emailOk) {
      return json({ error: "Invalid email address." }, 400);
    }

    const { data: dupRow } = await supabase
      .from("partner_brief_tokens")
      .select("token")
      .eq("partner_email", partner_email_raw)
      .limit(1)
      .maybeSingle();

    if (dupRow?.token) {
      return json({ error: "A partner with this email already exists." }, 400);
    }

    const token = randomHex(8);
    const expires_at = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    const partner_name = `${partner_first_name} ${partner_last_name}`.trim();

    const insertPayload: Record<string, unknown> = {
      token,
      partner_first_name,
      partner_last_name,
      partner_name,
      partner_email: partner_email_raw,
      max_calls,
      call_count: 0,
      is_active: true,
      expires_at,
    };
    if (notes) insertPayload.notes = notes;

    const { data: created, error: insErr } = await supabase
      .from("partner_brief_tokens")
      .insert(insertPayload)
      .select("token, partner_first_name, partner_last_name, partner_name, partner_email")
      .maybeSingle();

    if (insErr) {
      console.log(LOG_PREFIX, "create_partner insert", insErr.message);
      return json({ error: insErr.message || "Could not create partner row." }, 500);
    }

    await logAdminAction(supabase, sessionToken, "create_partner", {
      brief_token_suffix: token.slice(-8),
      partner_email_masked: maskEmail(partner_email_raw),
    });

    return json({ partner: created });
  }

  if (action === "preview") {
    const inv = parseInvitation(body.invitation ?? body);
    if (!inv) {
      return json(
        {
          error:
            "Invalid preview payload: need partner_email, partner_first_name, brief_token, brief_topic.",
        },
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

    await logAdminAction(supabase, sessionToken, "preview", {
      brief_token_suffix: inv.brief_token.slice(-8),
      partner_email_masked: maskEmail(inv.partner_email),
      surfaces: inv.surfaces ?? [],
      consideration_hours: inv.consideration_hours ?? 96,
      brief_topic: inv.brief_topic,
    });

    return json({ html });
  }

  if (action !== "send_invitations") {
    return json({ error: "Unknown action. Use preview, send_invitations, or create_partner." }, 400);
  }

  const rawList = body.invitations;
  if (!Array.isArray(rawList) || rawList.length === 0) {
    return json({ error: "invitations must be a non-empty array." }, 400);
  }

  const supabaseUrl = (Deno.env.get("SUPABASE_URL") ?? "").replace(/\/$/, "");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceKey) {
    console.log(LOG_PREFIX, "missing env for send-brief-invitation fetch");
    return json({ error: "Server configuration error." }, 500);
  }

  const results: SendResult[] = [];

  for (const raw of rawList) {
    const inv = parseInvitation(raw);
    if (!inv) {
      results.push({
        brief_token_suffix: "?",
        success: false,
        error: "Invalid invitation object.",
        surfaces_granted: [],
        surfaces_failed: [],
      });
      continue;
    }

    const attempted = inv.surfaces ?? [];
    const surfaces_granted: string[] = [];
    const surfaces_failed: Array<{ surface: string; reason: string }> = [];

    for (const surface of attempted) {
      const validation = await validateSurfaceName(supabase, surface);
      if (!validation.valid) {
        surfaces_failed.push({
          surface,
          reason: validation.reason || "invalid_surface_name",
        });
        await logAdminAction(
          supabase,
          sessionToken,
          "grant_failure",
          {
            brief_token_suffix: inv.brief_token.slice(-8),
            partner_email_masked: maskEmail(inv.partner_email),
            surface,
            reason: "invalid_surface_name",
          },
          "failure",
          validation.reason || null,
        );
        continue;
      }

      try {
        const grant = await grantSurfaceIfNeeded(supabase, inv.brief_token, surface);
        if (!grant.ok) {
          surfaces_failed.push({ surface, reason: grant.error });
          await logAdminAction(
            supabase,
            sessionToken,
            "grant_failure",
            {
              brief_token_suffix: inv.brief_token.slice(-8),
              partner_email_masked: maskEmail(inv.partner_email),
              surface,
              reason: "share_grants_insert_failed",
            },
            "failure",
            grant.error,
          );
          continue;
        }
        surfaces_granted.push(surface);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        surfaces_failed.push({ surface, reason: msg });
        await logAdminAction(
          supabase,
          sessionToken,
          "grant_failure",
          {
            brief_token_suffix: inv.brief_token.slice(-8),
            partner_email_masked: maskEmail(inv.partner_email),
            surface,
            reason: "unexpected_error",
          },
          "failure",
          msg,
        );
      }
    }

    const hadEmailAttempt = wantsEmailSurfaces(attempted);
    const hasEmailGranted = wantsEmailSurfaces(surfaces_granted);

    if (attempted.length > 0 && surfaces_granted.length === 0) {
      results.push({
        brief_token_suffix: inv.brief_token.slice(-8),
        success: false,
        error: "Could not grant any surfaces. Email not sent.",
        surfaces_granted,
        surfaces_failed,
      });
      continue;
    }

    if (hadEmailAttempt && !hasEmailGranted) {
      results.push({
        brief_token_suffix: inv.brief_token.slice(-8),
        success: false,
        error: "Could not grant Partner Brief or Roundtable access. Email not sent.",
        surfaces_granted,
        surfaces_failed,
      });
      continue;
    }

    if (!hasEmailGranted) {
      results.push({
        brief_token_suffix: inv.brief_token.slice(-8),
        success: true,
        surfaces_granted,
        surfaces_failed,
      });
      continue;
    }

    const include_roundtable_mention = surfaces_granted.includes("roundtable_calendar");

    const sendBody: Record<string, unknown> = {
      partner_email: inv.partner_email,
      partner_first_name: inv.partner_first_name,
      brief_token: inv.brief_token,
      brief_topic: inv.brief_topic,
      consideration_hours: inv.consideration_hours ?? 96,
      include_roundtable_mention,
      surfaces: surfaces_granted,
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
        surfaces_granted,
        surfaces_failed,
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
        surfaces_granted,
        surfaces_failed,
      });
    } else {
      results.push({
        brief_token_suffix: inv.brief_token.slice(-8),
        success: false,
        http_status: res.status,
        error: parsed.error ?? resText.slice(0, 200) ?? `HTTP ${res.status}`,
        surfaces_granted,
        surfaces_failed,
      });
    }
  }

  const okCount = results.filter((r) => r.success).length;
  const failCount = results.length - okCount;

  const surfacesGrantedUnion = new Set<string>();
  const surfacesFailedAgg: Array<{ surface: string; reason: string; brief_token_suffix: string }> =
    [];
  for (const r of results) {
    for (const s of r.surfaces_granted) surfacesGrantedUnion.add(s);
    for (const f of r.surfaces_failed) {
      surfacesFailedAgg.push({ ...f, brief_token_suffix: r.brief_token_suffix });
    }
  }

  await logAdminAction(supabase, sessionToken, "send_invitations", {
    invitation_count: rawList.length,
    results_summary: { success: okCount, failed: failCount },
    surfaces_granted: Array.from(surfacesGrantedUnion),
    surfaces_failed: surfacesFailedAgg,
    invitations: results.map((r) => ({
      brief_token_suffix: r.brief_token_suffix,
      success: r.success,
      surfaces_granted: r.surfaces_granted,
      surfaces_failed: r.surfaces_failed,
      resend_id: r.resend_id,
      error: r.error,
    })),
    recipients_masked: results.map((r) => ({
      brief_token_suffix: r.brief_token_suffix,
      success: r.success,
    })),
  });

  return json({ results });
});
