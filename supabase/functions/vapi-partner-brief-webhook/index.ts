/**
 * Socialutely — Vapi webhook for Partner Brief (Spuds) + Diagnostic (Jordan)
 * ============================================================================
 * Receives end-of-call-report from Vapi for Spuds and Jordan assistants.
 *
 * On end-of-call for Spuds:
 *   1. Sends operator summary email to thewoospot@gmail.com
 *   2. Sends partner follow-up email to the contact email confirmed during the call
 *
 * Secrets required (set in Supabase dashboard → Edge Functions → Secrets):
 *   RESEND_API_KEY
 *   VAPI_WEBHOOK_SECRET  (optional — if set, validates x-vapi-secret header)
 *
 * Assistant IDs:
 *   Spuds:  afec7622-84c3-418d-b4c6-9d35653d6bc5
 *   Jordan: e48ee900-bfb0-4ee6-a645-e89a08233365
 */

const SPUDS_ID  = "afec7622-84c3-418d-b4c6-9d35653d6bc5";
const JORDAN_ID = "e48ee900-bfb0-4ee6-a645-e89a08233365";

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

// ─── Email helpers ────────────────────────────────────────────────────────────

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

// ─── Operator email ───────────────────────────────────────────────────────────

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

      <!-- Header -->
      <div style="border-bottom:1px solid #1e2030;padding-bottom:24px;margin-bottom:32px;">
        <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#c9993a;margin-bottom:8px;">AI READINESS LABS</div>
        <h1 style="margin:0;font-size:22px;font-weight:600;color:#f0ead8;">Spuds Call Summary</h1>
        <div style="margin-top:8px;font-size:14px;color:#888;">${formatDate()}</div>
      </div>

      <!-- Partner details -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #1e2030;">
            <span style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#c9993a;">Partner</span><br>
            <span style="font-size:16px;font-weight:500;color:#f0ead8;">${partnerName || "Unknown"}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #1e2030;">
            <span style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#c9993a;">Duration</span><br>
            <span style="font-size:16px;font-weight:500;color:#f0ead8;">${duration}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #1e2030;">
            <span style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#c9993a;">Contact Email Collected</span><br>
            <span style="font-size:16px;font-weight:500;color:#f0ead8;">${contactEmail || "—"}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #1e2030;">
            <span style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#c9993a;">Call ID</span><br>
            <span style="font-size:13px;color:#888;font-family:monospace;">${callId || "—"}</span>
          </td>
        </tr>
      </table>

      <!-- Key insights -->
      <div style="margin-bottom:32px;">
        <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#c9993a;margin-bottom:12px;">KEY INSIGHTS</div>
        <div style="background:#0d1017;border:1px solid #1e2030;border-radius:6px;padding:20px;font-size:14px;line-height:1.7;color:#c8bfa8;">
          ${summaryHtml}
        </div>
      </div>

      <!-- Transcript -->
      <div style="margin-bottom:40px;">
        <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#c9993a;margin-bottom:12px;">FULL TRANSCRIPT</div>
        <div style="background:#0d1017;border:1px solid #1e2030;border-radius:6px;padding:20px;font-size:13px;line-height:1.8;color:#a09880;max-height:600px;overflow-y:auto;">
          ${transcriptHtml}
        </div>
      </div>

      <!-- Footer -->
      <div style="border-top:1px solid #1e2030;padding-top:20px;text-align:center;font-size:11px;color:#555;letter-spacing:1px;">
        SOCIALUTELY · AI READINESS LABS · POST-CALL REPORT
      </div>

    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Partner email ────────────────────────────────────────────────────────────

function buildPartnerEmail(opts: {
  partnerName: string;
  summary: string;
}): string {
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

      <!-- Header -->
      <div style="border-bottom:1px solid #1e2030;padding-bottom:24px;margin-bottom:32px;">
        <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#c9993a;margin-bottom:8px;">SOCIALUTELY · AI READINESS LABS</div>
        <h1 style="margin:0;font-size:22px;font-weight:600;color:#f0ead8;">Great conversation, ${firstName}.</h1>
      </div>

      <!-- Opening -->
      <p style="font-size:15px;line-height:1.8;color:#c8bfa8;margin:0 0 24px;">
        Spuds appreciated you making time. Here's a brief summary of what came up in your conversation — and what happens next.
      </p>

      <!-- Summary -->
      <div style="background:#0d1017;border:1px solid #c9993a;border-radius:6px;padding:24px;margin-bottom:32px;">
        <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#c9993a;margin-bottom:12px;">WHAT SPUDS HEARD</div>
        <div style="font-size:14px;line-height:1.8;color:#c8bfa8;">
          ${summaryHtml}
        </div>
      </div>

      <!-- What's next -->
      <div style="margin-bottom:40px;">
        <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#c9993a;margin-bottom:16px;">WHAT COMES NEXT</div>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="32" valign="top" style="padding-top:2px;">
              <div style="width:20px;height:20px;border-radius:50%;background:#c9993a;color:#07090f;font-size:11px;font-weight:700;text-align:center;line-height:20px;">1</div>
            </td>
            <td style="padding-left:12px;padding-bottom:16px;font-size:14px;color:#c8bfa8;line-height:1.7;">
              The Socialutely team will review this conversation and reach out within a few business days.
            </td>
          </tr>
          <tr>
            <td width="32" valign="top" style="padding-top:2px;">
              <div style="width:20px;height:20px;border-radius:50%;background:#c9993a;color:#07090f;font-size:11px;font-weight:700;text-align:center;line-height:20px;">2</div>
            </td>
            <td style="padding-left:12px;padding-bottom:16px;font-size:14px;color:#c8bfa8;line-height:1.7;">
              If you have any questions in the meantime, reply directly to this email.
            </td>
          </tr>
          <tr>
            <td width="32" valign="top" style="padding-top:2px;">
              <div style="width:20px;height:20px;border-radius:50%;background:#c9993a;color:#07090f;font-size:11px;font-weight:700;text-align:center;line-height:20px;">3</div>
            </td>
            <td style="padding-left:12px;font-size:14px;color:#c8bfa8;line-height:1.7;">
              The four rungs of the Labs — Awareness, Adaptation, Optimization, and Stewardship — are designed to meet you exactly where your business is today.
            </td>
          </tr>
        </table>
      </div>

      <!-- Sign-off -->
      <p style="font-size:14px;line-height:1.8;color:#888;margin:0 0 40px;">
        — Spuds &amp; the Socialutely team
      </p>

      <!-- Footer -->
      <div style="border-top:1px solid #1e2030;padding-top:20px;text-align:center;font-size:11px;color:#555;letter-spacing:1px;">
        SOCIALUTELY · AI READINESS LABS<br>
        <span style="color:#3a3a3a;">hello@socialutely.com</span>
      </div>

    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Extract contact email from transcript ────────────────────────────────────

function extractEmailFromTranscript(transcript: string): string {
  if (!transcript) return "";
  const match = transcript.match(/\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/);
  return match ? match[0].toLowerCase() : "";
}

// ─── Handler: Spuds ───────────────────────────────────────────────────────────

async function handleSpuds(
  message: Record<string, unknown>,
  call: Record<string, unknown>,
  resendKey: string
): Promise<void> {
  const transcript =
    typeof (message as { transcript?: string }).transcript === "string"
      ? (message as { transcript: string }).transcript
      : typeof (message.artifact as Record<string, unknown> | undefined)?.transcript === "string"
      ? String((message.artifact as Record<string, unknown>).transcript)
      : "";

  const analysis = message.analysis as Record<string, unknown> | undefined;
  const summary =
    typeof analysis?.summary === "string"
      ? analysis.summary
      : typeof message.summary === "string"
      ? String(message.summary)
      : "";

  // Extract variable values (partner_name passed at call start)
  let vv: Record<string, unknown> = {};
  const ao = call.assistantOverrides;
  if (ao && typeof ao === "object" && !Array.isArray(ao)) {
    const vars = (ao as Record<string, unknown>).variableValues;
    if (vars && typeof vars === "object") vv = { ...vv, ...(vars as Record<string, unknown>) };
  }
  if (call.metadata && typeof call.metadata === "object") {
    vv = { ...vv, ...(call.metadata as Record<string, unknown>) };
  }

  const partnerName =
    typeof vv.partner_name === "string" && vv.partner_name.trim()
      ? vv.partner_name.trim()
      : "Partner";

  const durationSeconds =
    typeof call.endedAt === "string" && typeof call.startedAt === "string"
      ? Math.round(
          (new Date(call.endedAt).getTime() - new Date(call.startedAt).getTime()) / 1000
        )
      : typeof message.durationSeconds === "number"
      ? message.durationSeconds as number
      : 0;

  const callId = typeof call.id === "string" ? call.id : "";
  const contactEmail = extractEmailFromTranscript(transcript);
  const duration = formatDuration(durationSeconds);
  const dateStr = formatDate();

  // 1. Operator email — always send
  const operatorHtml = buildOperatorEmail({
    partnerName,
    duration,
    contactEmail,
    transcript,
    summary,
    callId,
  });

  await sendEmail(
    resendKey,
    ["thewoospot@gmail.com"],
    `Spuds Call Summary — ${partnerName} · ${dateStr}`,
    operatorHtml
  );

  // 2. Partner email — only if we have a contact email from the transcript
  if (contactEmail) {
    const partnerHtml = buildPartnerEmail({ partnerName, summary });
    await sendEmail(
      resendKey,
      [contactEmail],
      `Great conversation, ${partnerName.split(" ")[0]} — here's what Spuds heard`,
      partnerHtml
    );
  } else {
    console.log("handleSpuds: no contact email found in transcript — skipping partner email");
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const WEBHOOK_SECRET = Deno.env.get("VAPI_WEBHOOK_SECRET") ?? "";
  if (WEBHOOK_SECRET) {
    const got = req.headers.get("x-vapi-secret") ?? "";
    if (got !== WEBHOOK_SECRET) return json({ error: "Forbidden" }, 403);
  }

  const RESEND_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
  if (!RESEND_KEY) {
    console.error("vapi-partner-brief-webhook: RESEND_API_KEY not set");
    return json({ error: "Email service not configured" }, 500);
  }

  let payload: Record<string, unknown>;
  try {
    payload = (await req.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const message = (payload.message ?? payload) as Record<string, unknown>;
  const msgType =
    typeof message.type === "string" ? message.type :
    typeof payload.type === "string" ? payload.type : "";

  // Only process end-of-call reports
  if (msgType !== "end-of-call-report") {
    console.log("vapi-partner-brief-webhook: ignoring message type", msgType);
    return new Response(null, { status: 200, headers: CORS_HEADERS });
  }

  const call = (message.call ?? payload.call ?? {}) as Record<string, unknown>;
  const assistantId = String(
    (call as { assistantId?: string }).assistantId ??
    (call as { assistant?: { id?: string } }).assistant?.id ??
    ""
  );

  console.log("vapi-partner-brief-webhook: end-of-call for assistant", assistantId);

  if (assistantId === SPUDS_ID) {
    await handleSpuds(message, call, RESEND_KEY);
    return json({ ok: true, handled: "spuds" });
  }

  if (assistantId === JORDAN_ID) {
    // Jordan (diagnostic) — operator notification only
    const transcript =
      typeof (message as { transcript?: string }).transcript === "string"
        ? (message as { transcript: string }).transcript
        : "";
    const analysis = message.analysis as Record<string, unknown> | undefined;
    const summary = typeof analysis?.summary === "string" ? analysis.summary : "";
    const callId = typeof call.id === "string" ? call.id : "";
    const durationSeconds =
      typeof call.endedAt === "string" && typeof call.startedAt === "string"
        ? Math.round(
            (new Date(call.endedAt).getTime() - new Date(call.startedAt).getTime()) / 1000
          )
        : 0;
    const operatorHtml = buildOperatorEmail({
      partnerName: "Diagnostic caller",
      duration: formatDuration(durationSeconds),
      contactEmail: extractEmailFromTranscript(transcript),
      transcript,
      summary,
      callId,
    });
    await sendEmail(
      RESEND_KEY,
      ["thewoospot@gmail.com"],
      `Jordan (Diagnostic) Call Summary · ${formatDate()}`,
      operatorHtml
    );
    return json({ ok: true, handled: "jordan" });
  }

  // Other assistants — log and ignore
  console.log("vapi-partner-brief-webhook: unhandled assistant", assistantId);
  return json({ ok: true, handled: "ignored" });
});
