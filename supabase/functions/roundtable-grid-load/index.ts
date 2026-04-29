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

function dayKeyInTz(iso: string, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function parseDayKey(dayKey: string): { y: number; m: number; d: number } {
  const [y, m, d] = dayKey.split("-").map(Number);
  return { y, m, d };
}

function addDaysToDayKey(dayKey: string, days: number): string {
  const { y, m, d } = parseDayKey(dayKey);
  const utc = new Date(Date.UTC(y, m - 1, d + days));
  const yy = utc.getUTCFullYear();
  const mm = String(utc.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(utc.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function dayKeysInclusive(startIso: string, endIso: string, tz: string, maxDays = 10): string[] {
  const startKey = dayKeyInTz(startIso, tz);
  const endKey = dayKeyInTz(endIso, tz);
  const out: string[] = [];
  let cursor = startKey;
  while (out.length < maxDays) {
    out.push(cursor);
    if (cursor === endKey) break;
    cursor = addDaysToDayKey(cursor, 1);
  }
  return out;
}

function tzOffsetMinutesForDay(dayKey: string, tz: string): number {
  const { y, m, d } = parseDayKey(dayKey);
  const probe = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    timeZoneName: "shortOffset",
  }).formatToParts(probe);
  const token = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT+0";
  const match = token.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/);
  if (!match) return 0;
  const sign = match[1] === "-" ? -1 : 1;
  const hh = Number(match[2] ?? "0");
  const mm = Number(match[3] ?? "0");
  return sign * (hh * 60 + mm);
}

function localDayHourToUtcIso(dayKey: string, hour: number, tz: string): string {
  const { y, m, d } = parseDayKey(dayKey);
  const offsetMin = tzOffsetMinutesForDay(dayKey, tz);
  const utcMs = Date.UTC(y, m - 1, d, hour, 0, 0) - offsetMin * 60_000;
  return new Date(utcMs).toISOString();
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

  const basePartnerColumns =
    "id, partner_id, partner_name, partner_timezone, session_id";

  // Prefer most-recent active session for reused brief_token values.
  const { data: activeRows, error: activeErr } = await supabase
    .from("roundtable_partners")
    .select(`${basePartnerColumns}, roundtable_sessions!inner(*)`)
    .eq("brief_token", brief_token)
    .in("roundtable_sessions.status", ["open", "lock_pending", "locked"])
    .order("created_at", { ascending: false, foreignTable: "roundtable_sessions" })
    .limit(1);

  let partnerRow = activeRows?.[0] ?? null;
  let session = (partnerRow?.roundtable_sessions as Record<string, unknown> | undefined) ?? null;

  if ((activeErr || !partnerRow || !session)) {
    // Fallback: most-recent session regardless of status so UI can show proper closed state.
    const { data: fallbackRows, error: fallbackErr } = await supabase
      .from("roundtable_partners")
      .select(`${basePartnerColumns}, roundtable_sessions!inner(*)`)
      .eq("brief_token", brief_token)
      .order("created_at", { ascending: false, foreignTable: "roundtable_sessions" })
      .limit(1);

    if (fallbackErr || !fallbackRows?.length) {
      return json({ error: "This link has expired. The team will reach out separately." }, 403);
    }

    partnerRow = fallbackRows[0];
    session = (partnerRow.roundtable_sessions as Record<string, unknown> | undefined) ?? null;
  }

  if (!partnerRow?.session_id || !session) {
    return json({ error: "This scheduling window is no longer active." }, 400);
  }
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

  const dayKeys = dayKeysInclusive(windowStart, windowEnd, tz, 10);

  const slotMap = new Map<string, CalSlotRange>();
  for (const slot of calSlots) {
    const dk = dayKeyInTz(slot.start, tz);
    if (!dayKeys.includes(dk)) continue;
    const h = hourInTz(slot.start, tz);
    slotMap.set(`${dk}-${h}`, slot);
  }

  const cells = [] as Array<{
    day_key: string;
    hour_local: number;
      is_available: boolean;
      slot_start_utc: string;
      slot_end_utc: string;
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
      const canonicalStart = localDayHourToUtcIso(dk, hour, tz);
      const canonicalEnd = new Date(
        new Date(canonicalStart).getTime() + Number(session.duration_minutes ?? 60) * 60_000,
      ).toISOString();
      const effectiveStart = found ? normalizeIso(found.start) : canonicalStart;
      const effectiveEnd = found ? normalizeIso(found.end) : canonicalEnd;
      const isPast = new Date(effectiveStart).getTime() < Date.now();
      const isAvailable = Boolean(found) && !isPast;
      cells.push({
        day_key: dk,
        hour_local: hour,
        is_available: isAvailable,
        slot_start_utc: effectiveStart,
        slot_end_utc: effectiveEnd,
        overlap_count: isAvailable ? overlapMap.get(effectiveStart) ?? 0 : 0,
        is_own_tap: isAvailable ? mine.has(effectiveStart) : false,
      });
    }
  }

  const tiles = cells.map((cell) => {
    return {
      slot_start_utc: cell.slot_start_utc,
      slot_end_utc: cell.slot_end_utc,
      is_available: cell.is_available,
      overlap_count: cell.overlap_count,
      is_own_tap: cell.is_own_tap,
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
