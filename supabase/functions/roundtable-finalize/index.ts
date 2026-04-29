import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { ROUNDTABLE_LOCK_HTML } from "./roundtable-lock-template.ts";

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

function firstName(full: string): string {
  const t = full.trim();
  if (!t) return "there";
  return t.split(/\s+/)[0] ?? t;
}

/** Time + short generic zone label (e.g. "2:00 PM PT") for the partner's timezone. */
function formatMeetingTimeLocal(lockedStart: Date, timeZone: string): string {
  const time = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(lockedStart);
  const tzPart = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "shortGeneric",
  })
    .formatToParts(lockedStart)
    .find((p) => p.type === "timeZoneName")?.value;
  return tzPart ? `${time} ${tzPart}` : time;
}

function replaceVars(
  html: string,
  vars: Record<string, string>,
): string {
  let out = html;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{{${k}}}`).join(v);
  }
  return out;
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

  let session_id: string | undefined;
  try {
    const body = (await req.json()) as { session_id?: string };
    session_id = typeof body?.session_id === "string" ? body.session_id.trim() : undefined;
  } catch {
    return json({ error: "Invalid request." }, 400);
  }

  if (!session_id) {
    return json({ error: "Invalid request." }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const resendFrom = Deno.env.get("RESEND_FROM_EMAIL");

  if (!supabaseUrl || !serviceKey || !resendKey || !resendFrom) {
    return json({ error: "Missing configuration." }, 503);
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: session, error: se } = await supabase
    .from("roundtable_sessions")
    .select("*")
    .eq("id", session_id)
    .maybeSingle();

  if (se || !session) {
    return json({ error: "Not found." }, 404);
  }

  const { data: partners } = await supabase
    .from("roundtable_partners")
    .select("partner_name, partner_email, partner_timezone")
    .eq("session_id", session_id);

  const meetingLink = String(session.calcom_meeting_link ?? "").trim() || "#";
  const calcomBookingUid = String(session.calcom_booking_uid ?? "").trim();
  const lockedStart = session.locked_slot_start
    ? new Date(String(session.locked_slot_start))
    : null;

  const templateHtml: string = ROUNDTABLE_LOCK_HTML;

  const fromHeader = formatResendFrom(resendFrom);

  for (const p of partners ?? []) {
    const tz = (p.partner_timezone as string) || "America/Los_Angeles";
    const localLong = lockedStart
      ? new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: tz,
      }).format(lockedStart)
      : "";

    const localTime = lockedStart ? formatMeetingTimeLocal(lockedStart, tz) : "";

    const html = replaceVars(templateHtml, {
      partner_first_name: firstName(String(p.partner_name ?? "")),
      brief_topic: "AI Readiness Labs",
      meeting_date_long: localLong,
      meeting_time_local: localTime,
      meeting_duration_min: String(session.duration_minutes ?? 60),
      meeting_link: meetingLink,
      calcom_booking_uid: calcomBookingUid,
    });

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromHeader,
        to: [String(p.partner_email)],
        subject: "The Roundtable — working session set",
        html,
      }),
    });
  }

  await supabase
    .from("roundtable_partners")
    .update({ invite_status: "completed" })
    .eq("session_id", session_id);

  return json({ ok: true });
});
