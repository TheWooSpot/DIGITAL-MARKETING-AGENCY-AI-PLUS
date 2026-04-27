import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import {
  fetchAvailableSlots,
  filterCanonicalSlots,
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  let brief_token: string | undefined;
  let slot_start_utc: string | undefined;
  try {
    const body = (await req.json()) as {
      brief_token?: string;
      slot_start_utc?: string;
    };
    brief_token = typeof body?.brief_token === "string" ? body.brief_token.trim() : undefined;
    slot_start_utc =
      typeof body?.slot_start_utc === "string"
        ? normalizeIso(body.slot_start_utc.trim())
        : undefined;
  } catch {
    return json({ error: "Invalid request." }, 400);
  }

  if (!brief_token || !slot_start_utc) {
    return json({ error: "Invalid request." }, 400);
  }

  const calKey = Deno.env.get("CAL_COM_API_KEY");
  const eventTypeIdStr = Deno.env.get("ROUNDTABLE_CALCOM_EVENT_TYPE_ID");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!calKey || !eventTypeIdStr || !supabaseUrl || !serviceKey) {
    return json({ error: "Something went wrong. Please try again." }, 503);
  }

  const eventTypeId = Number.parseInt(eventTypeIdStr, 10);
  if (!Number.isFinite(eventTypeId)) {
    return json({ error: "Something went wrong. Please try again." }, 503);
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: partnerRow, error: pErr } = await supabase
    .from("roundtable_partners")
    .select("id, partner_id, partner_name, partner_email, partner_timezone, session_id")
    .eq("brief_token", brief_token)
    .maybeSingle();

  if (pErr || !partnerRow) {
    return json({ error: "This link has expired. The team will reach out separately." }, 403);
  }

  const sid = partnerRow.session_id as string;

  const { data: sess, error: sErr } = await supabase
    .from("roundtable_sessions")
    .select("*")
    .eq("id", sid)
    .maybeSingle();

  if (sErr || !sess) {
    return json({ error: "This scheduling window is no longer active." }, 400);
  }

  const session = sess as Record<string, unknown>;

  if (String(session.status) !== "lock_pending") {
    return json({ error: "This scheduling window is no longer active." }, 400);
  }

  const tz = (partnerRow.partner_timezone as string) || "America/Los_Angeles";
  const windowStart = String(session.window_start);
  const windowEnd = String(session.window_end);
  const durationMinutes = Number(session.duration_minutes ?? 60);

  const slotStartMs = new Date(slot_start_utc).getTime();
  const narrowStart = new Date(slotStartMs - 60 * 60 * 1000).toISOString();
  const narrowEnd = new Date(
    slotStartMs + (durationMinutes + 120) * 60 * 1000,
  ).toISOString();

  let calSlots = await fetchAvailableSlots({
    apiKey: calKey,
    apiVersion: "2024-06-14",
    eventTypeId,
    rangeStartIso: narrowStart,
    rangeEndIso: narrowEnd,
    timeZone: tz,
  });
  calSlots = filterCanonicalSlots(calSlots, tz, CANONICAL_HOURS);

  const stillThere = calSlots.some((s) => {
    const diff = Math.abs(new Date(s.start).getTime() - slotStartMs);
    return diff < 120 * 1000;
  });

  if (!stillThere) {
    await supabase.from("roundtable_sessions").update({ status: "open" }).eq("id", sid);
    return json({
      success: false,
      reason: "slot_taken",
      message:
        "That slot just filled on the calendar. Pick another — your other selections are still saved.",
    });
  }

  const { data: allPartners } = await supabase
    .from("roundtable_partners")
    .select("partner_email, partner_id")
    .eq("session_id", sid);

  const guests = (allPartners ?? [])
    .filter((p) => (p.partner_id as string) !== partnerRow.partner_id)
    .map((p) => String(p.partner_email))
    .filter(Boolean);

  const bookingRes = await fetch("https://api.cal.com/v2/bookings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${calKey}`,
      "cal-api-version": "2024-08-13",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      start: slot_start_utc,
      eventTypeId,
      attendee: {
        name: partnerRow.partner_name,
        email: partnerRow.partner_email,
        timeZone: tz,
      },
      guests,
      metadata: {
        roundtable_session_id: sid,
        brief_topic: "AI Readiness Labs",
      },
      lengthInMinutes: durationMinutes,
    }),
  });

  const bookingJson = (await bookingRes.json()) as Record<string, unknown>;

  if (!bookingRes.ok) {
    await supabase.from("roundtable_sessions").update({ status: "open" }).eq("id", sid);
    return json({
      success: false,
      reason: "slot_taken",
      message:
        "That slot just filled on the calendar. Pick another — your other selections are still saved.",
    });
  }

  const data = bookingJson?.data as Record<string, unknown> | undefined;
  const uid =
    (data?.uid as string) ??
    (bookingJson?.uid as string) ??
    String(data?.id ?? "");
  const meetingUrl =
    (data?.meetingUrl as string) ??
    (data?.videoCallUrl as string) ??
    ((data?.location as Record<string, unknown> | undefined)?.joinUrl as string) ??
    "";

  const slotEndUtc = new Date(slotStartMs + durationMinutes * 60 * 1000).toISOString();

  await supabase
    .from("roundtable_sessions")
    .update({
      status: "locked",
      locked_slot_start: slot_start_utc,
      locked_slot_end: slotEndUtc,
      calcom_event_type_id: eventTypeId,
      calcom_booking_uid: uid,
      calcom_meeting_link: meetingUrl,
    })
    .eq("id", sid);

  const finalizeUrl = `${supabaseUrl}/functions/v1/roundtable-finalize`;
  queueMicrotask(() => {
    fetch(finalizeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ session_id: sid }),
    }).catch(() => {});
  });

  return json({
    success: true,
    calcom_booking_uid: uid,
    meeting_link: meetingUrl,
  });
});
