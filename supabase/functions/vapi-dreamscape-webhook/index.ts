/**
 * Socialutely — Vapi server URL for DreamScape™ Door 13 (Amelia)
 * =================================================================
 * Configure on the Vapi assistant: server.url → this function URL,
 * serverMessages: ["end-of-call-report"].
 *
 * On end-of-call:
 * - Builds dream_profile from analysis / transcript / assistant variableValues
 * - Inserts or updates layer5_prospects (match by email or metadata.prospect_id)
 * - POSTs to generate-vision-report with service role (sends Vision Report™ email)
 *
 * Secrets:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *   VAPI_DREAMSCAPE_ASSISTANT_ID (optional filter; default DreamScape assistant UUID),
 *   VAPI_WEBHOOK_SECRET (optional — if set, require header x-vapi-secret match)
 */
const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-vapi-secret",
};

const DEFAULT_ASSISTANT_ID = "0693b0d9-6e89-436f-bdbd-9fe25cc1bf3c";

function jsonResponse(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

async function fetchProspectByEmail(
  supabaseUrl: string,
  serviceKey: string,
  email: string
): Promise<{ id: string } | null> {
  const res = await fetch(
    `${supabaseUrl}/rest/v1/layer5_prospects?email=eq.${encodeURIComponent(email)}&select=id&limit=1`,
    {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    }
  );
  if (!res.ok) return null;
  const rows = (await res.json()) as unknown;
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const id = (rows[0] as { id?: string }).id;
  return id ? { id: String(id) } : null;
}

async function insertProspect(
  supabaseUrl: string,
  serviceKey: string,
  row: Record<string, unknown>
): Promise<string | null> {
  const res = await fetch(`${supabaseUrl}/rest/v1/layer5_prospects`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(row),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error("vapi-dreamscape-webhook: insert failed", res.status, text);
    return null;
  }
  try {
    const data = JSON.parse(text) as unknown;
    const first = Array.isArray(data) ? data[0] : data;
    const id = (first as { id?: string })?.id;
    return id != null ? String(id) : null;
  } catch {
    return null;
  }
}

async function patchProspect(
  supabaseUrl: string,
  serviceKey: string,
  prospectId: string,
  patch: Record<string, unknown>
): Promise<boolean> {
  const res = await fetch(`${supabaseUrl}/rest/v1/layer5_prospects?id=eq.${encodeURIComponent(prospectId)}`, {
    method: "PATCH",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(patch),
  });
  return res.ok;
}

async function invokeGenerateVisionReport(supabaseUrl: string, serviceKey: string, prospectId: string): Promise<Response> {
  const url = `${supabaseUrl.replace(/\/$/, "")}/functions/v1/generate-vision-report`;
  return await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prospect_id: prospectId }),
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const WEBHOOK_SECRET = Deno.env.get("VAPI_WEBHOOK_SECRET") ?? "";
  if (WEBHOOK_SECRET) {
    const got = req.headers.get("x-vapi-secret") ?? "";
    if (got !== WEBHOOK_SECRET) {
      return jsonResponse({ error: "Forbidden" }, 403);
    }
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const EXPECTED_ASSISTANT = (
    Deno.env.get("VAPI_DREAMSCAPE_ASSISTANT_ID") ?? DEFAULT_ASSISTANT_ID
  ).trim();

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return jsonResponse({ error: "Missing Supabase configuration" }, 500);
  }

  let payload: Record<string, unknown>;
  try {
    payload = (await req.json()) as Record<string, unknown>;
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const message = (payload.message ?? payload) as Record<string, unknown>;
  const msgType =
    typeof message.type === "string"
      ? message.type
      : typeof payload.type === "string"
      ? payload.type
      : "";

  if (msgType !== "end-of-call-report") {
    console.log("vapi-dreamscape-webhook: ignoring message type", msgType);
    return new Response(null, { status: 200, headers: CORS_HEADERS });
  }

  const call = (message.call ?? payload.call) as Record<string, unknown> | undefined;
  const assistantId = call && typeof call === "object"
    ? String((call as { assistantId?: string }).assistantId ?? (call as { assistant?: { id?: string } }).assistant?.id ?? "")
    : "";

  if (EXPECTED_ASSISTANT && assistantId && assistantId !== EXPECTED_ASSISTANT) {
    console.log("vapi-dreamscape-webhook: different assistant, skip", assistantId);
    return new Response(null, { status: 200, headers: CORS_HEADERS });
  }

  const customer = call && typeof call === "object" ? ((call as { customer?: Record<string, unknown> }).customer ?? {}) : {};
  const transcript =
    typeof (message as { transcript?: string }).transcript === "string"
      ? (message as { transcript?: string }).transcript
      : typeof (message.artifact as Record<string, unknown> | undefined)?.transcript === "string"
      ? String((message.artifact as Record<string, unknown>).transcript)
      : "";

  const analysis = message.analysis as Record<string, unknown> | undefined;
  const analysisSummary =
    typeof analysis?.summary === "string"
      ? analysis.summary
      : typeof message.summary === "string"
      ? message.summary
      : "";

  const callRecord = call && typeof call === "object" ? (call as Record<string, unknown>) : {};
  let vv: Record<string, unknown> = {};
  const ao = callRecord.assistantOverrides;
  if (ao && typeof ao === "object" && !Array.isArray(ao)) {
    const vars = (ao as Record<string, unknown>).variableValues;
    if (vars && typeof vars === "object" && !Array.isArray(vars)) vv = { ...vv, ...(vars as Record<string, unknown>) };
  }
  if (callRecord.metadata && typeof callRecord.metadata === "object" && !Array.isArray(callRecord.metadata)) {
    vv = { ...vv, ...(callRecord.metadata as Record<string, unknown>) };
  }
  const msgVars = message.variableValues;
  if (msgVars && typeof msgVars === "object" && !Array.isArray(msgVars)) {
    vv = { ...vv, ...(msgVars as Record<string, unknown>) };
  }

  const email =
    (typeof vv.email === "string" && vv.email.trim()) ||
    (typeof customer.email === "string" && customer.email.trim()) ||
    (typeof vv.contact_email === "string" && vv.contact_email.trim()) ||
    "";

  const prospectIdMeta = typeof vv.prospect_id === "string" ? vv.prospect_id.trim() : "";
  const firstName = typeof vv.first_name === "string" ? vv.first_name.trim() : "";
  const businessName =
    (typeof vv.business_name === "string" && vv.business_name.trim()) ||
    (typeof customer.name === "string" && customer.name.trim()) ||
    "DreamScape guest";

  const readinessRaw = vv.readiness_score ?? vv.readiness ?? null;
  const readinessScore =
    readinessRaw != null && String(readinessRaw).length > 0 ? Number(readinessRaw) : null;

  const dream_profile = {
    source: "vapi-dreamscape-webhook",
    call_id: typeof call?.id === "string" ? call.id : null,
    assistant_id: assistantId || EXPECTED_ASSISTANT,
    collected_at: new Date().toISOString(),
    analysis_summary: analysisSummary.slice(0, 8000),
    transcript: transcript.slice(0, 12000),
    readiness_score: Number.isFinite(readinessScore) ? readinessScore : null,
    first_name: firstName || null,
    variable_values_snapshot: vv,
  };

  if (!email) {
    console.warn("vapi-dreamscape-webhook: no email in payload — cannot send Vision Report", {
      callId: call?.id,
    });
    return jsonResponse({ ok: false, error: "missing_email" }, 200);
  }

  let prospectId = prospectIdMeta;
  if (!prospectId) {
    const found = await fetchProspectByEmail(SUPABASE_URL, SERVICE_KEY, email);
    prospectId = found?.id ?? "";
  }

  if (prospectId) {
    await patchProspect(SUPABASE_URL, SERVICE_KEY, prospectId, {
      dream_profile,
      email,
      business_name: businessName,
    });
  } else {
    const share_token = crypto.randomUUID();
    const newId = await insertProspect(SUPABASE_URL, SERVICE_KEY, {
      url: "https://dreamscape.socialutely/session",
      email,
      share_token,
      business_name: businessName,
      industry: typeof vv.industry === "string" ? String(vv.industry) : "Unknown",
      overall_score: 0,
      visibility_score: 0,
      engagement_score: 0,
      conversion_score: 0,
      recommended_tier: typeof vv.recommended_tier === "string" ? vv.recommended_tier : "Signature",
      recommended_services: Array.isArray(vv.recommended_services) ? vv.recommended_services : [],
      detected_gaps: Array.isArray(vv.detected_gaps) ? vv.detected_gaps : [],
      estimated_value: 0,
      prospect_summary: typeof vv.prospect_summary === "string" ? vv.prospect_summary : "",
      source: "dreamscape-door13",
      dream_profile,
      raw_result: { dreamscape: true, dream_profile },
    });
    prospectId = newId ?? "";
  }

  if (!prospectId) {
    console.error("vapi-dreamscape-webhook: failed to persist prospect");
    return jsonResponse({ ok: false, error: "persist_failed" }, 500);
  }

  console.log("vapi-dreamscape-webhook: invoking generate-vision-report", prospectId);
  const genRes = await invokeGenerateVisionReport(SUPABASE_URL, SERVICE_KEY, prospectId);
  const genText = await genRes.text();
  let genJson: unknown;
  try {
    genJson = JSON.parse(genText);
  } catch {
    genJson = genText;
  }
  console.log("vapi-dreamscape-webhook: generate-vision-report", genRes.status, genText.slice(0, 400));

  return jsonResponse(
    {
      ok: true,
      prospect_id: prospectId,
      vision_report_status: genRes.status,
      vision_report: genJson,
    },
    genRes.ok ? 200 : 207
  );
});
