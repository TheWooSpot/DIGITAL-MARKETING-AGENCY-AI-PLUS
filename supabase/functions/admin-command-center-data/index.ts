import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "./cors.ts";

const LOG_PREFIX = "[admin-command-center-data]";

const MACK_ASSISTANT_ID = "afec7622-84c3-418d-b4c6-9d35653d6bc5";
const ARCHITECT_ASSISTANT_ID = "0693b0d9-6e89-436f-bdbd-9fe25cc1bf3c";

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

async function validateAdminSession(supabase: SupabaseClient, sessionToken: string): Promise<boolean> {
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

function readAdminSessionHeader(req: Request): string {
  return (
    req.headers.get("X-Admin-Session") ??
    req.headers.get("x-admin-session") ??
    ""
  ).trim();
}

async function logAdminAction(
  supabase: SupabaseClient,
  sessionToken: string,
  action: string,
  details: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase.rpc("admin_log_action", {
    p_token: sessionToken.trim(),
    p_action: action,
    p_details: details,
    p_result: "success",
    p_error_message: null,
    p_ip_hint: null,
  });
  if (error) console.log(LOG_PREFIX, "admin_log_action", error.message);
}

/** Start of UTC day for server — MVP (matches dashboard expectations loosely). */
function utcDayStartIso(): string {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString();
}

function maskEmail(email: string | null | undefined): string {
  if (!email || typeof email !== "string") return "";
  const at = email.indexOf("@");
  if (at <= 0) return "***";
  return `***${email.slice(at)}`;
}

function truncateUrl(url: string | null | undefined): string {
  if (!url || typeof url !== "string") return "";
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    const seg = u.hostname + u.pathname.split("/").filter(Boolean)[0];
    return seg.length > 48 ? `${seg.slice(0, 45)}…` : seg;
  } catch {
    return url.length > 48 ? `${url.slice(0, 45)}…` : url;
  }
}

function maskTokenSuffix(tok: string | null | undefined): string {
  if (!tok) return "";
  const t = String(tok).replace(/\s+/g, "");
  return t.length <= 8 ? "••••••••" : `…${t.slice(-8)}`;
}

function scrubPayload(raw: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    const key = k.toLowerCase();
    if (key.includes("email") && typeof v === "string") {
      out[k] = maskEmail(v);
      continue;
    }
    if ((key === "url" || key.endsWith("_url")) && typeof v === "string") {
      out[k] = truncateUrl(v);
      continue;
    }
    if (key.includes("token") && typeof v === "string") {
      out[k] = maskTokenSuffix(v);
      continue;
    }
    if (key === "call_id" && typeof v === "string") {
      out[k] = maskTokenSuffix(v);
      continue;
    }
    if (v && typeof v === "object" && !Array.isArray(v)) {
      out[k] = scrubPayload(v as Record<string, unknown>);
      continue;
    }
    out[k] = v;
  }
  return out;
}

type HubDoor = {
  id: string;
  name: string;
  status: "LIVE" | "BUILDING" | "PLANNED";
  count: number;
  lastAt: string | null;
  avgScore: number | null;
};

async function fetchHubMetrics(supabase: SupabaseClient): Promise<{
  hubValue: number;
  hubKind: "url_scans" | "mack_calls" | "admin_actions";
  hubLabel: string;
  doors: HubDoor[];
}> {
  const dayStart = utcDayStartIso();

  const { count: urlToday } = await supabase
    .from("layer5_prospects")
    .select("id", { count: "exact", head: true })
    .gte("created_at", dayStart);

  const { data: mackRows } = await supabase
    .from("voice_events")
    .select("call_id")
    .eq("vapi_assistant_id", MACK_ASSISTANT_ID)
    .eq("event_type", "end-of-call-report")
    .gte("created_at", dayStart);

  const mackDistinct = new Set((mackRows ?? []).map((r: { call_id: string }) => r.call_id)).size;

  let adminToday = 0;
  const adminTry = await supabase
    .from("admin_action_log")
    .select("id", { count: "exact", head: true })
    .gte("created_at", dayStart);
  if (!adminTry.error && typeof adminTry.count === "number") adminToday = adminTry.count;

  const urlN = urlToday ?? 0;
  const hubValue = Math.max(urlN, mackDistinct, adminToday);
  let hubKind: "url_scans" | "mack_calls" | "admin_actions" = "url_scans";
  let hubLabel = "Today's URL diagnostics";
  if (hubValue === mackDistinct && mackDistinct >= urlN && mackDistinct >= adminToday) {
    hubKind = "mack_calls";
    hubLabel = "Today's Mack calls";
  } else if (hubValue === adminToday && adminToday >= urlN && adminToday >= mackDistinct) {
    hubKind = "admin_actions";
    hubLabel = "Today's admin actions";
  }

  const { count: d2c } = await supabase
    .from("layer5_prospects")
    .select("id", { count: "exact", head: true })
    .eq("source", "prospect-diagnostic");

  const { data: d2last } = await supabase
    .from("layer5_prospects")
    .select("created_at")
    .eq("source", "prospect-diagnostic")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: avgRow } = await supabase
    .from("layer5_prospects")
    .select("overall_score")
    .eq("source", "prospect-diagnostic")
    .not("overall_score", "is", null)
    .limit(5000);
  const scores = (avgRow ?? [])
    .map((r: { overall_score: number | null }) => r.overall_score)
    .filter((n): n is number => typeof n === "number");
  const avgProspect = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;

  const { count: d3c } = await supabase
    .from("door3_submissions")
    .select("id", { count: "exact", head: true });

  const { data: d3last } = await supabase
    .from("door3_submissions")
    .select("created_at")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let d4c = 0;
  let d4avg: number | null = null;
  let d4lastIso: string | null = null;

  const d4n = await supabase.from("door9_submissions").select("id", { count: "exact", head: true });
  if (!d4n.error && typeof d4n.count === "number") {
    d4c = d4n.count;
    const { data: d4avgRow } = await supabase
      .from("door9_submissions")
      .select("total_score")
      .not("total_score", "is", null)
      .limit(2000);
    const d4scores = (d4avgRow ?? [])
      .map((r: { total_score: number | null }) => r.total_score)
      .filter((n): n is number => typeof n === "number");
    d4avg = d4scores.length ? d4scores.reduce((a, b) => a + b, 0) / d4scores.length : null;
    const { data: d4last } = await supabase
      .from("door9_submissions")
      .select("created_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    d4lastIso = (d4last as { created_at?: string } | null)?.created_at ?? null;
  } else {
    const { count: l5d4 } = await supabase
      .from("layer5_prospects")
      .select("id", { count: "exact", head: true })
      .eq("source", "door4-ai-iq");
    d4c = l5d4 ?? 0;
    const { data: scores } = await supabase
      .from("layer5_prospects")
      .select("overall_score")
      .eq("source", "door4-ai-iq")
      .not("overall_score", "is", null)
      .limit(2000);
    const d4scores = (scores ?? [])
      .map((r: { overall_score: number | null }) => r.overall_score)
      .filter((n): n is number => typeof n === "number");
    d4avg = d4scores.length ? d4scores.reduce((a, b) => a + b, 0) / d4scores.length : null;
    const { data: d4last } = await supabase
      .from("layer5_prospects")
      .select("created_at")
      .eq("source", "door4-ai-iq")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    d4lastIso = (d4last as { created_at?: string } | null)?.created_at ?? null;
  }

  const { count: d7c } = await supabase
    .from("voice_events")
    .select("id", { count: "exact", head: true })
    .eq("vapi_assistant_id", ARCHITECT_ASSISTANT_ID)
    .eq("event_type", "end-of-call-report");

  const { data: d7last } = await supabase
    .from("voice_events")
    .select("created_at")
    .eq("vapi_assistant_id", ARCHITECT_ASSISTANT_ID)
    .eq("event_type", "end-of-call-report")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const doors: HubDoor[] = [
    {
      id: "D-1",
      name: "Open Door",
      status: "PLANNED",
      count: 0,
      lastAt: null,
      avgScore: null,
    },
    {
      id: "D-2",
      name: "Lens",
      status: "LIVE",
      count: d2c ?? 0,
      lastAt: (d2last as { created_at?: string } | null)?.created_at ?? null,
      avgScore: avgProspect,
    },
    {
      id: "D-3",
      name: "Mirror",
      status: "LIVE",
      count: d3c ?? 0,
      lastAt: (d3last as { created_at?: string } | null)?.created_at ?? null,
      avgScore: null,
    },
    {
      id: "D-4",
      name: "Compass",
      status: "LIVE",
      count: d4c,
      lastAt: d4lastIso,
      avgScore: d4avg,
    },
    { id: "D-5", name: "Workbench", status: "BUILDING", count: 0, lastAt: null, avgScore: null },
    { id: "D-6", name: "Rival", status: "BUILDING", count: 0, lastAt: null, avgScore: null },
    {
      id: "D-7",
      name: "Architect",
      status: "LIVE",
      count: d7c ?? 0,
      lastAt: (d7last as { created_at?: string } | null)?.created_at ?? null,
      avgScore: null,
    },
    { id: "D-8", name: "Handshake", status: "PLANNED", count: 0, lastAt: null, avgScore: null },
    { id: "D-9", name: "Thread", status: "PLANNED", count: 0, lastAt: null, avgScore: null },
  ];

  return {
    hubValue,
    hubKind,
    hubLabel,
    doors,
  };
}

async function fetchDoorDetail(
  supabase: SupabaseClient,
  doorId: string,
): Promise<{ recent: Record<string, unknown>[]; trend: { day: string; count: number }[] }> {
  const recent: Record<string, unknown>[] = [];
  const trendMap = new Map<string, number>();
  const addTrend = (iso: string | null | undefined) => {
    if (!iso) return;
    const d = iso.slice(0, 10);
    trendMap.set(d, (trendMap.get(d) ?? 0) + 1);
  };

  if (doorId === "D-1" || doorId === "D-5" || doorId === "D-6" || doorId === "D-8" || doorId === "D-9") {
    const days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      days.push(new Date(Date.now() - i * 86400000).toISOString().slice(0, 10));
    }
    return {
      recent: [],
      trend: days.map((day) => ({ day, count: 0 })),
    };
  }

  if (doorId === "D-2") {
    const { data } = await supabase
      .from("layer5_prospects")
      .select("id, created_at, url, overall_score, business_name")
      .eq("source", "prospect-diagnostic")
      .order("created_at", { ascending: false })
      .limit(10);
    for (const row of data ?? []) {
      const r = row as Record<string, unknown>;
      recent.push(scrubPayload(r));
      addTrend(r.created_at as string);
    }
    const { data: week } = await supabase
      .from("layer5_prospects")
      .select("created_at")
      .eq("source", "prospect-diagnostic")
      .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString());
    for (const row of week ?? []) addTrend((row as { created_at: string }).created_at);
  } else if (doorId === "D-3") {
    const { data } = await supabase
      .from("door3_submissions")
      .select("id, created_at, email, name, url")
      .order("created_at", { ascending: false })
      .limit(10);
    for (const row of data ?? []) {
      recent.push(scrubPayload(row as Record<string, unknown>));
      addTrend((row as { created_at: string }).created_at);
    }
    const { data: week } = await supabase
      .from("door3_submissions")
      .select("created_at")
      .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString());
    for (const row of week ?? []) addTrend((row as { created_at: string }).created_at);
  } else if (doorId === "D-4") {
    const tryD9 = await supabase
      .from("door9_submissions")
      .select("id, created_at, name, email, total_score")
      .order("created_at", { ascending: false })
      .limit(10);
    if (!tryD9.error) {
      for (const row of tryD9.data ?? []) {
        recent.push(scrubPayload(row as Record<string, unknown>));
        addTrend((row as { created_at: string }).created_at);
      }
      const { data: week } = await supabase
        .from("door9_submissions")
        .select("created_at")
        .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString());
      for (const row of week ?? []) addTrend((row as { created_at: string }).created_at);
    } else {
      const { data } = await supabase
        .from("layer5_prospects")
        .select("id, created_at, email, business_name, overall_score, url")
        .eq("source", "door4-ai-iq")
        .order("created_at", { ascending: false })
        .limit(10);
      for (const row of data ?? []) {
        recent.push(scrubPayload(row as Record<string, unknown>));
        addTrend((row as { created_at: string }).created_at);
      }
      const { data: week } = await supabase
        .from("layer5_prospects")
        .select("created_at")
        .eq("source", "door4-ai-iq")
        .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString());
      for (const row of week ?? []) addTrend((row as { created_at: string }).created_at);
    }
  } else if (doorId === "D-7") {
    const { data } = await supabase
      .from("voice_events")
      .select(
        "id, created_at, duration_seconds, outcome, prospect_identifier, agent_name, call_id",
      )
      .eq("vapi_assistant_id", ARCHITECT_ASSISTANT_ID)
      .eq("event_type", "end-of-call-report")
      .order("created_at", { ascending: false })
      .limit(10);
    for (const row of data ?? []) {
      recent.push(scrubPayload(row as Record<string, unknown>));
      addTrend((row as { created_at: string }).created_at);
    }
    const { data: week } = await supabase
      .from("voice_events")
      .select("created_at")
      .eq("vapi_assistant_id", ARCHITECT_ASSISTANT_ID)
      .eq("event_type", "end-of-call-report")
      .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString());
    for (const row of week ?? []) addTrend((row as { created_at: string }).created_at);
  }

  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const dt = new Date(Date.now() - i * 86400000);
    days.push(dt.toISOString().slice(0, 10));
  }
  const trend = days.map((day) => ({ day, count: trendMap.get(day) ?? 0 }));

  return { recent, trend };
}

type StreamRow = {
  stream_at: string;
  kind: string;
  subtype: string;
  title_hint: string;
  payload: Record<string, unknown>;
  source_row_id: string;
};

function rowMatchesFilter(
  row: StreamRow,
  category: string,
  search: string,
): boolean {
  const hay = `${row.kind} ${row.subtype} ${row.title_hint} ${JSON.stringify(row.payload)}`.toLowerCase();
  if (search.trim()) {
    if (!hay.includes(search.trim().toLowerCase())) return false;
  }
  if (category === "all") return true;
  if (category === "admin") return row.kind === "admin_action";
  if (category === "calls") return row.kind === "voice_call";
  if (category === "submissions") return row.kind === "prospect" || row.kind === "submission";
  if (category === "sessions") return row.kind === "roundtable";
  return true;
}

async function fetchTimelinePage(
  supabase: SupabaseClient,
  offset: number,
  limit: number,
  category: string,
  range: string,
  search: string,
): Promise<{ rows: StreamRow[]; hasMore: boolean }> {
  const since =
    range === "today"
      ? utcDayStartIso()
      : range === "7d"
        ? new Date(Date.now() - 7 * 86400000).toISOString()
        : range === "30d"
          ? new Date(Date.now() - 30 * 86400000).toISOString()
          : null;

  const { data: viewRows, error: vErr } = await supabase
    .from("admin_unified_event_stream")
    .select("*")
    .order("stream_at", { ascending: false })
    .limit(800);

  if (vErr) {
    console.log(LOG_PREFIX, "timeline view", vErr.message);
  }

  let merged: StreamRow[] = (viewRows ?? []).map((r: Record<string, unknown>) => ({
    stream_at: String(r.stream_at),
    kind: String(r.kind),
    subtype: String(r.subtype),
    title_hint: String(r.title_hint ?? ""),
    payload: (r.payload ?? {}) as Record<string, unknown>,
    source_row_id: String(r.source_row_id ?? ""),
  }));

  const { data: adminRows, error: adminErr } = await supabase
    .from("admin_action_log")
    .select("id, created_at, action, result, details")
    .order("created_at", { ascending: false })
    .limit(500);

  if (!adminErr && adminRows?.length) {
    for (const a of adminRows) {
      const ar = a as Record<string, unknown>;
      merged.push({
        stream_at: String(ar.created_at),
        kind: "admin_action",
        subtype: String(ar.action ?? "admin"),
        title_hint: String(ar.action ?? "Admin"),
        payload: scrubPayload({
          result: ar.result,
          details: ar.details,
          id: ar.id,
        }),
        source_row_id: String(ar.id),
      });
    }
  }

  merged.sort((x, y) => new Date(y.stream_at).getTime() - new Date(x.stream_at).getTime());

  if (since) {
    merged = merged.filter((r) => new Date(r.stream_at) >= new Date(since));
  }

  merged = merged.filter((r) => rowMatchesFilter(r, category, search));

  for (const r of merged) {
    r.payload = scrubPayload(r.payload);
  }

  const slice = merged.slice(offset, offset + limit);
  const hasMore = merged.length > offset + limit;

  return { rows: slice, hasMore };
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

  const query = typeof body.query === "string" ? body.query.trim() : "";

  if (query === "cc_log_page_view") {
    const view = typeof body.view === "string" ? body.view : "hub";
    await logAdminAction(supabase, sessionToken, "cc_page_view", { view });
    return json({ ok: true });
  }

  if (query === "hub_metrics") {
    const hub = await fetchHubMetrics(supabase);
    return json({ ok: true, ...hub });
  }

  if (query === "door_detail") {
    const doorId = typeof body.door_id === "string" ? body.door_id.trim() : "";
    if (!doorId || !/^D-[1-9]$/.test(doorId)) {
      return json({ error: "door_id required (D-1 … D-9)" }, 400);
    }
    const detail = await fetchDoorDetail(supabase, doorId);
    return json({ ok: true, door_id: doorId, ...detail });
  }

  if (query === "timeline_page" || query === "timeline_filter") {
    const offset = typeof body.offset === "number" && Number.isFinite(body.offset)
      ? Math.max(0, Math.floor(body.offset))
      : 0;
    const limit = typeof body.limit === "number" && Number.isFinite(body.limit)
      ? Math.min(100, Math.max(1, Math.floor(body.limit)))
      : 50;
    const category = typeof body.category === "string" ? body.category : "all";
    const range = typeof body.range === "string" ? body.range : "7d";
    const search = typeof body.search === "string" ? body.search : "";
    const page = await fetchTimelinePage(supabase, offset, limit, category, range, search);
    return json({ ok: true, ...page, offset, limit });
  }

  return json({ error: "Unknown query. Use hub_metrics, door_detail, timeline_page, timeline_filter, cc_log_page_view." }, 400);
});
