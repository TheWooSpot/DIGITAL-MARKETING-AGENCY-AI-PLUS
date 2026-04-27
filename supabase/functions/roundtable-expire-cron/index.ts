import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function authorizeCron(req: Request): boolean {
  const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  return (
    Boolean(token && (token === anon || token === serviceKey))
  );
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST" && req.method !== "GET") {
    return json({ error: "Method not allowed" }, 405);
  }

  if (!authorizeCron(req)) {
    return json({ error: "Unauthorized" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const resendFrom = Deno.env.get("RESEND_FROM_EMAIL");
  const alertTo = Deno.env.get("ROUNDTABLE_EXPIRE_ALERT_EMAIL");

  if (!supabaseUrl || !serviceKey) {
    return json({ error: "Missing configuration." }, 503);
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const nowIso = new Date().toISOString();

  const { data: stale, error } = await supabase
    .from("roundtable_sessions")
    .select("id, total_partners_invited, organizer_id")
    .eq("status", "open")
    .lt("expires_at", nowIso);

  if (error) {
    return json({ error: "Query failed." }, 500);
  }

  let processed = 0;

  for (const row of stale ?? []) {
    const sid = row.id as string;

    const { count: engagedCount } = await supabase
      .from("roundtable_partners")
      .select("*", { count: "exact", head: true })
      .eq("session_id", sid)
      .eq("invite_status", "engaged");

    await supabase
      .from("roundtable_sessions")
      .update({ status: "expired" })
      .eq("id", sid)
      .eq("status", "open");

    const total = Number(row.total_partners_invited ?? 0);
    const n = engagedCount ?? 0;

    if (alertTo && resendKey && resendFrom) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: resendFrom.includes("<") ? resendFrom : `AI Readiness Labs <${resendFrom}>`,
          to: [alertTo],
          subject: "Roundtable session expired — internal",
          text:
            `Roundtable session expired without consensus. ${n} of ${total} partners engaged. Manual escalation needed. Session id: ${sid}`,
        }),
      });
    }

    await supabase.from("voice_events").insert({
      call_id: `roundtable-expire-${sid}-${crypto.randomUUID()}`,
      agent_name: "Roundtable",
      vapi_assistant_id: "n/a",
      event_type: "roundtable_session_expired",
      prospect_identifier: sid,
      raw_payload: {
        session_id: sid,
        engaged_approx: n,
        total_partners: total,
      },
    });

    processed += 1;
  }

  return json({ ok: true, expired_count: processed });
});
