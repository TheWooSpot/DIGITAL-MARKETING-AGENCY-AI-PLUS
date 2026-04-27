import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

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
  const lockedStart = session.locked_slot_start
    ? new Date(String(session.locked_slot_start))
    : null;

  const templateUrl = new URL("./roundtable-lock.html", import.meta.url);
  let templateHtml: string;
  try {
    templateHtml = await fetch(templateUrl).then((r) => r.text());
  } catch {
    return json({ error: "Template missing." }, 500);
  }

  const totalInvited = Number(session.total_partners_invited ?? 0);
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

    const localTime = lockedStart
      ? new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZone: tz,
        timeZoneName: "short",
      }).format(lockedStart)
      : "";

    const others = Math.max(0, totalInvited - 1);
    const partnerList =
      others === 0
        ? "You'll join the working session hosted by the team."
        : others === 1
        ? "One other partner from this group will join you."
        : `${others} other partners from this group will join you.`;

    const html = replaceVars(templateHtml, {
      partner_first_name: firstName(String(p.partner_name ?? "")),
      brief_topic: "AI Readiness Labs",
      meeting_date_long: localLong,
      meeting_time_local: localTime,
      meeting_duration_min: String(session.duration_minutes ?? 60),
      partner_list: partnerList,
      meeting_link: meetingLink,
      organizer_name: "the team",
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
        subject: "Working session set — AI Readiness Labs",
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
