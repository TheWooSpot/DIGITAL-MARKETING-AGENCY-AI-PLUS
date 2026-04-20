import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ========== AGENT-SPECIFIC CONSTANTS ==========
const AGENT_NAME = "mackleberry";
// Reads VAPI_PARTNER_BRIEF_SECRET first; falls back to legacy VAPI_WEBHOOK_SECRET
const SECRET_ENV_VAR = "VAPI_PARTNER_BRIEF_SECRET";
const LEGACY_SECRET_ENV_VAR = "VAPI_WEBHOOK_SECRET";
// ===============================================

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const webhookSecret =
  Deno.env.get(SECRET_ENV_VAR) || Deno.env.get(LEGACY_SECRET_ENV_VAR);

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-vapi-secret",
};

function json(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

// ─── Email helpers (preserved from original) ──────────────────────────────────

async function sendEmail(
  apiKey: string,
  to: string[],
  subject: string,
  html: string
): Promise<void> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Socialutely AI Readiness Labs <hello@socialutely.com>",
      to,
      subject,
      html,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error("Resend error:", res.status, text);
  } else {
    console.log("Email sent to:", to.join(", "));
  }
}

function formatDate(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds < 1) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function extractEmailFromTranscript(transcript: string): string {
  if (!transcript) return "";
  const match = transcript.match(/\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/);
  return match ? match[0].toLowerCase() : "";
}

function buildOperatorEmail(opts: {
  partnerName: string;
  duration: string;
  contactEmail: string;
  transcript: string;
  summary: string;
  callId: string;
}): string {
  const { partnerName, duration, contactEmail, transcript, summary, callId } = opts;
  const transcriptHtml = transcript
    ? transcript.replace(/\n/g, "<br>")
    : "<em style='color:#888'>No transcript available.</em>";
  const summaryHtml = summary
    ? summary.replace(/\n/g, "<br>")
    : "<em style='color:#888'>No summary available.</em>";

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#07090f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#e8e0d0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:680px;margin:0 auto;padding:40px 24px;">
    <tr><td>
      <div style="border-bottom:1px solid #1e2030;padding-bottom:24px;margin-bottom:32px;">
        <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#c9993a;margin-bottom:8px;">AI READINESS LABS</div>
        <h1 style="margin:0;font-size:22px;font-weight:600;color:#f0ead8;">Mackleberry Call Summary</h1>
        <div style="margin-top:8px;font-size:14px;color:#888;">${formatDate()}</div>
      </div>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
        <tr><td style="padding:12px 0;border-bottom:1px solid #1e2030;">
          <span style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#c9993a;">Partner</span><br>
          <span style="font-size:16px;font-weight:500;color:#f0ead8;">${partnerName || "Unknown"}</span>
        </td></tr>
        <tr><td style="padding:12px 0;border-bottom:1px solid #1e2030;">
          <span style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#c9993a;">Duration</span><br>
          <span style="font-size:16px;font-weight:500;color:#f0ead8;">${duration}</span>
        </td></tr>
        <tr><td style="padding:12px 0;border-bottom:1px solid #1e2030;">
          <span style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#c9993a;">Contact Email Collected</span><br>
          <span style="font-size:16px;font-weight:500;color:#f0ead8;">${contactEmail || "—"}</span>
        </td></tr>
        <tr><td style="padding:12px 0;border-bottom:1px solid #1e2030;">
          <span style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#c9993a;">Call ID</span><br>
          <span style="font-size:13px;color:#888;font-family:monospace;">${callId || "—"}</span>
        </td></tr>
      </table>
      <div style="margin-bottom:32px;">
        <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#c9993a;margin-bottom:12px;">KEY INSIGHTS</div>
        <div style="background:#0d1017;border:1px solid #1e2030;border-radius:6px;padding:20px;font-size:14px;line-height:1.7;color:#c8bfa8;">${summaryHtml}</div>
      </div>
      <div style="margin-bottom:40px;">
        <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#c9993a;margin-bottom:12px;">FULL TRANSCRIPT</div>
        <div style="background:#0d1017;border:1px solid #1e2030;border-radius:6px;padding:20px;font-size:13px;line-height:1.8;color:#a09880;max-height:600px;overflow-y:auto;">${transcriptHtml}</div>
      </div>
      <div style="border-top:1px solid #1e2030;padding-top:20px;text-align:center;font-size:11px;color:#555;letter-spacing:1px;">
        SOCIALUTELY · AI READINESS LABS · POST-CALL REPORT
      </div>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildPartnerEmail(opts: { partnerName: string; summary: string }): string {
  const { partnerName, summary } = opts;
  const firstName = partnerName ? partnerName.split(" ")[0] : "there";
  const summaryHtml = summary
    ? summary.replace(/\n/g, "<br>")
    : "It was a great conversation — the team will be reviewing shortly.";

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#07090f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#e8e0d0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;margin:0 auto;padding:40px 24px;">
    <tr><td>
      <div style="border-bottom:1px solid #1e2030;padding-bottom:24px;margin-bottom:32px;">
        <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#c9993a;margin-bottom:8px;">SOCIALUTELY · AI READINESS LABS</div>
        <h1 style="margin:0;font-size:22px;font-weight:600;color:#f0ead8;">Great conversation, ${firstName}.</h1>
      </div>
      <p style="font-size:15px;line-height:1.8;color:#c8bfa8;margin:0 0 24px;">
        Mr. Mackleberry appreciated you making time. Here's a brief summary of what came up in your conversation — and what happens next.
      </p>
      <div style="background:#0d1017;border:1px solid #c9993a;border-radius:6px;padding:24px;margin-bottom:32px;">
        <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#c9993a;margin-bottom:12px;">WHAT MR. MACKLEBERRY HEARD</div>
        <div style="font-size:14px;line-height:1.8;color:#c8bfa8;">${summaryHtml}</div>
      </div>
      <p style="font-size:14px;line-height:1.8;color:#888;margin:0 0 40px;">— Mr. Mackleberry &amp; the Socialutely team</p>
      <div style="border-top:1px solid #1e2030;padding-top:20px;text-align:center;font-size:11px;color:#555;letter-spacing:1px;">
        SOCIALUTELY · AI READINESS LABS<br><span style="color:#3a3a3a;">hello@socialutely.com</span>
      </div>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // Secret validation
  if (!webhookSecret) {
    console.error(`Neither ${SECRET_ENV_VAR} nor ${LEGACY_SECRET_ENV_VAR} is configured`);
    return json({ error: "Server misconfigured" }, 500);
  }

  const received = req.headers.get("x-vapi-secret") ?? "";
  if (!received || received !== webhookSecret) {
    console.warn(`[${AGENT_NAME}] Rejected webhook — bad or missing secret`);
    return json({ error: "Unauthorized" }, 401);
  }

  let payload: Record<string, unknown>;
  try {
    payload = (await req.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const message = (payload.message ?? payload) as Record<string, unknown>;
  const call = (message.call ?? payload.call ?? {}) as Record<string, unknown>;
  const callId = String(call.id ?? message.callId ?? "");
  const assistantId = String(
    (call as Record<string, string>).assistantId ??
    (call as { assistant?: { id?: string } }).assistant?.id ??
    "unknown"
  );
  const eventType = typeof message.type === "string" ? message.type : "unknown";

  // ─── voice_events logging ────────────────────────────────────────────────
  if (callId) {
    const transcript =
      typeof (message as { transcript?: string }).transcript === "string"
        ? (message as { transcript: string }).transcript
        : typeof (message.artifact as Record<string, unknown> | undefined)?.transcript === "string"
        ? String((message.artifact as Record<string, unknown>).transcript)
        : null;

    const analysis = message.analysis as Record<string, unknown> | undefined;
    const summary = typeof analysis?.summary === "string" ? analysis.summary
      : typeof message.summary === "string" ? String(message.summary) : null;

    let vv: Record<string, unknown> = {};
    const ao = call.assistantOverrides;
    if (ao && typeof ao === "object") vv = { ...vv, ...(ao as Record<string, unknown>).variableValues as Record<string, unknown> };
    if (call.metadata && typeof call.metadata === "object") vv = { ...vv, ...(call.metadata as Record<string, unknown>) };

    const { error: dbError } = await supabase.from("voice_events").upsert({
      call_id: callId,
      agent_name: AGENT_NAME,
      vapi_assistant_id: assistantId,
      event_type: eventType,
      prospect_identifier:
        (typeof vv.partner_name === "string" ? vv.partner_name : null) ||
        (call as Record<string, unknown>).customer?.toString() || null,
      started_at: typeof call.startedAt === "string" ? new Date(call.startedAt).toISOString() : null,
      ended_at: typeof call.endedAt === "string" ? new Date(call.endedAt).toISOString() : null,
      duration_seconds: typeof message.durationSeconds === "number" ? message.durationSeconds : null,
      transcript,
      summary,
      outcome: typeof message.endedReason === "string" ? message.endedReason : null,
      raw_payload: payload,
    }, { onConflict: "call_id" });

    if (dbError) console.error(`[${AGENT_NAME}] voice_events insert failed:`, dbError);
    else console.log(`[${AGENT_NAME}] voice_events logged for call ${callId}`);
  }

  // ─── Email logic (only on end-of-call-report) ────────────────────────────
  if (eventType !== "end-of-call-report") {
    console.log(`[${AGENT_NAME}] ignoring event type: ${eventType}`);
    return json({ ok: true, agent: AGENT_NAME, logged: !!callId });
  }

  const RESEND_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
  if (!RESEND_KEY) {
    console.error("RESEND_API_KEY not set — skipping email");
    return json({ ok: true, agent: AGENT_NAME, warning: "email_skipped_no_key" });
  }

  const transcript =
    typeof (message as { transcript?: string }).transcript === "string"
      ? (message as { transcript: string }).transcript
      : "";

  const analysis = message.analysis as Record<string, unknown> | undefined;
  const summary = typeof analysis?.summary === "string" ? analysis.summary
    : typeof message.summary === "string" ? String(message.summary) : "";

  let vv: Record<string, unknown> = {};
  const ao = call.assistantOverrides;
  if (ao && typeof ao === "object") vv = { ...vv, ...(ao as Record<string, unknown>).variableValues as Record<string, unknown> };
  if (call.metadata && typeof call.metadata === "object") vv = { ...vv, ...(call.metadata as Record<string, unknown>) };

  const partnerName = typeof vv.partner_name === "string" && vv.partner_name.trim()
    ? vv.partner_name.trim() : "Partner";

  const durationSeconds =
    typeof call.endedAt === "string" && typeof call.startedAt === "string"
      ? Math.round((new Date(call.endedAt).getTime() - new Date(call.startedAt).getTime()) / 1000)
      : typeof message.durationSeconds === "number" ? (message.durationSeconds as number) : 0;

  const contactEmail = extractEmailFromTranscript(transcript);

  await sendEmail(
    RESEND_KEY,
    ["thewoospot@gmail.com"],
    `Mackleberry Call Summary — ${partnerName} · ${formatDate()}`,
    buildOperatorEmail({ partnerName, duration: formatDuration(durationSeconds), contactEmail, transcript, summary, callId })
  );

  if (contactEmail) {
    await sendEmail(
      RESEND_KEY,
      [contactEmail],
      `Great conversation, ${partnerName.split(" ")[0]} — here's what Mr. Mackleberry heard`,
      buildPartnerEmail({ partnerName, summary })
    );
  }

  return json({ ok: true, agent: AGENT_NAME });
});
