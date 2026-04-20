import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ========== AGENT-SPECIFIC CONSTANTS ==========
const AGENT_NAME = "aria";
const SECRET_ENV_VAR = "VAPI_RECEPTION_SECRET";
// ===============================================

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const webhookSecret = Deno.env.get(SECRET_ENV_VAR);

const supabase = createClient(supabaseUrl, supabaseServiceKey);

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  if (!webhookSecret) {
    console.error(`${SECRET_ENV_VAR} not configured`);
    return new Response("Server misconfigured", { status: 500 });
  }

  const received = req.headers.get("x-vapi-secret");
  if (!received || received !== webhookSecret) {
    console.warn(`[${AGENT_NAME}] Rejected webhook — bad or missing secret`);
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const payload = await req.json();
    const message = payload.message || payload;

    const callId = message.call?.id || message.callId;
    const assistantId = message.call?.assistantId || message.assistantId || "unknown";
    const eventType = message.type || "unknown";

    if (!callId) {
      console.warn(`[${AGENT_NAME}] Missing callId in payload — skipping insert`);
      return new Response(JSON.stringify({ ok: true, skipped: "no_call_id" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { error } = await supabase.from("voice_events").upsert({
      call_id: callId,
      agent_name: AGENT_NAME,
      vapi_assistant_id: assistantId,
      event_type: eventType,
      prospect_identifier:
        message.assistantOverrides?.variableValues?.partner_name ||
        message.call?.customer?.number ||
        message.call?.customer?.name ||
        null,
      started_at: message.startedAt ? new Date(message.startedAt).toISOString() : null,
      ended_at: message.endedAt ? new Date(message.endedAt).toISOString() : null,
      duration_seconds: message.durationSeconds ?? null,
      transcript: message.transcript ?? null,
      summary: message.summary ?? null,
      outcome: message.endedReason ?? null,
      raw_payload: payload,
    }, { onConflict: "call_id" });

    if (error) {
      console.error(`[${AGENT_NAME}] Insert failed:`, error);
      return new Response(JSON.stringify({ ok: false, error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, agent: AGENT_NAME }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(`[${AGENT_NAME}] Processing error:`, err);
    return new Response("Processing error", { status: 500 });
  }
});
