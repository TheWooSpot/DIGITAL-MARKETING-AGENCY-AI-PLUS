import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import {
  fetchAvailableSlots,
  filterCanonicalSlots,
  type CalSlotRange,
} from "../_shared/calcom.ts";

const CANONICAL_HOURS = [10, 12, 14, 16];

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function normalizeIso(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toISOString();
}

function hourInTz(iso: string, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    hour12: false,
  }).formatToParts(new Date(iso));
  return parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  let brief_token: string | undefined;
  try {
    const body = (await req.json()) as { brief_token?: string };
    brief_token = typeof body?.brief_token === "string" ? body.brief_token.trim() : undefined;
  } catch {
    return json({ error: "Invalid request." }, 400);
  }

  if (!brief_token) {
    return json({ error: "Invalid request." }, 400);
  }

  const calKey = Deno.env.get("CAL_COM_API_KEY");
  const eventTypeIdStr = Deno.env.get("ROUNDTABLE_CALCOM_EVENT_TYPE_ID");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!calKey || !eventTypeIdStr || !supabaseUrl || !serviceKey) {
    return json({ error: "We couldn't load the calendar right now. Please try again." }, 503);
  }

  const eventTypeId = Number.parseInt(eventTypeIdStr, 10);
  if (!Number.isFinite(eventTypeId)) {
    return json({ error: "We couldn't load the calendar right now. Please try again." }, 503);
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: partnerRow, error: pErr } = await supabase
    .from("roundtable_partners")
    .select("id, partner_id, partner_name, partner_timezone, session_id")
    .eq("brief_token", brief_token)
    .maybeSingle();

  if (pErr || !partnerRow?.session_id) {
    return json({ error: "This link has expired. The team will reach out separately." }, 403);
  }

  const { data: sess, error: sErr } = await supabase
    .from("roundtable_sessions")
    .select("*")
    .eq("id", partnerRow.session_id)
    .maybeSingle();

  if (sErr || !sess) {
    return json({ error: "This scheduling window is no longer active." }, 400);
  }

  const session = sess as Record<string, unknown>;
  const sid = partnerRow.session_id as string;
  const status = String(session.status ?? "");
  const expiresAt = session.expires_at ? new Date(String(session.expires_at)) : null;

  if (!["open", "lock_pending"].includes(status)) {
    if (status === "locked") {
      return json({
        locked: true,
        locked_slot_start: session.locked_slot_start ?? null,
        locked_slot_end: session.locked_slot_end ?? null,
        message:
          "This Roundtable is set. The invite is in your inbox.",
      }, 200);
    }
    return json({ error: "This scheduling window is no longer active." }, 400);
  }

  if (expiresAt && Date.now() > expiresAt.getTime()) {
    return json({ error: "This scheduling window has closed. The team will reach out separately about next steps." }, 400);
  }

  const tz = (partnerRow.partner_timezone as string) || "America/Los_Angeles";
  const windowStart = String(session.window_start);
  const windowEnd = String(session.window_end);

  let calSlots: CalSlotRange[] = [];
  try {
    calSlots = await fetchAvailableSlots({
      apiKey: calKey,
      apiVersion: "2024-06-14",
      eventTypeId,
      rangeStartIso: windowStart,
      rangeEndIso: windowEnd,
      timeZone: tz,
    });
  } catch {
    return json({ error: "We couldn't load the calendar right now. Please try again." }, 502);
  }

  calSlots = filterCanonicalSlots(calSlots, tz, CANONICAL_HOURS);

  const ws = new Date(windowStart).getTime();
  const we = new Date(windowEnd).getTime();
  calSlots = calSlots.filter((s) => {
    const t = new Date(s.start).getTime();
    return t >= ws && t <= we;
  });

  calSlots.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  const fmtDay = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const byDay = new Map<string, CalSlotRange[]>();
  for (const slot of calSlots) {
    const dayKey = fmtDay.format(new Date(slot.start));
    if (!byDay.has(dayKey)) byDay.set(dayKey, []);
    const arr = byDay.get(dayKey)!;
    if (arr.length < 4) arr.push(slot);
  }

  const dayKeys = [...byDay.keys()].slice(0, 10);
  const slotList = dayKeys.flatMap((k) => byDay.get(k) ?? []);

  const slotMap = new Map<string, CalSlotRange>();
  for (const slot of slotList) {
    const dk = fmtDay.format(new Date(slot.start));
    const h = hourInTz(slot.start, tz);
    slotMap.set(`${dk}-${h}`, slot);
  }

  const cells = [] as Array<{
    day_key: string;
    hour_local: number;
    available: boolean;
    slot_start_utc: string | null;
    slot_end_utc: string | null;
    overlap_count: number;
    is_own_tap: boolean;
  }>;

  const { data: overlaps } = await supabase
    .from("v_roundtable_slot_overlaps")
    .select("slot_start_utc, slot_end_utc, overlap_count")
    .eq("session_id", sid);

  const overlapMap = new Map<string, number>();
  for (const row of overlaps ?? []) {
    overlapMap.set(normalizeIso(String(row.slot_start_utc)), Number(row.overlap_count ?? 0));
  }

  const { data: myTaps } = await supabase
    .from("roundtable_taps")
    .select("slot_start_utc")
    .eq("session_id", sid)
    .eq("partner_id", partnerRow.partner_id)
    .eq("is_active", true);

  const mine = new Set((myTaps ?? []).map((t) => normalizeIso(String(t.slot_start_utc))));

  for (const dk of dayKeys) {
    for (const hour of CANONICAL_HOURS) {
      const found = slotMap.get(`${dk}-${hour}`);
      const ns = found ? normalizeIso(found.start) : null;
      cells.push({
        day_key: dk,
        hour_local: hour,
        available: Boolean(found),
        slot_start_utc: ns,
        slot_end_utc: found ? normalizeIso(found.end) : null,
        overlap_count: ns ? overlapMap.get(ns) ?? 0 : 0,
        is_own_tap: ns ? mine.has(ns) : false,
      });
    }
  }

  const tiles = slotList.map((slot) => {
    const ns = normalizeIso(slot.start);
    return {
      slot_start_utc: ns,
      slot_end_utc: normalizeIso(slot.end),
      overlap_count: overlapMap.get(ns) ?? 0,
      is_own_tap: mine.has(ns),
    };
  });

  let consensus_slot_start: string | null = null;
  let consensus_slot_end: string | null = null;
  if (status === "lock_pending") {
    const quorum = Number(session.quorum_threshold ?? 3);
    const candidates = (overlaps ?? [])
      .filter((o) => Number(o.overlap_count) >= quorum)
      .sort((a, b) => Number(b.overlap_count) - Number(a.overlap_count));
    const hit = candidates[0];
    if (hit) {
      consensus_slot_start = normalizeIso(String(hit.slot_start_utc));
      consensus_slot_end = normalizeIso(String(hit.slot_end_utc));
    }
  }

  return json({
    session: {
      id: sid,
      duration_minutes: session.duration_minutes,
      quorum_threshold: session.quorum_threshold,
      total_partners_invited: session.total_partners_invited,
      status,
      window_start: session.window_start,
      window_end: session.window_end,
      expires_at: session.expires_at,
      locked_slot_start: session.locked_slot_start ?? null,
      locked_slot_end: session.locked_slot_end ?? null,
    },
    tiles,
    partner: {
      id: partnerRow.partner_id,
      name: partnerRow.partner_name,
      timezone: tz,
    },
    consensus_slot_start,
    consensus_slot_end,
    cells,
  });
});
