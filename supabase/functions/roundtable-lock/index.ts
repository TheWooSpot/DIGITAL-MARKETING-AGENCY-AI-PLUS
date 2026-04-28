import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const CAL_BOOKING_URL = "https://api.cal.com/v2/bookings";

function redactAuthHeader(h: Record<string, string>): Record<string, string> {
  const out = { ...h };
  const auth = out.Authorization;
  if (auth && auth.startsWith("Bearer ")) {
    out.Authorization = "Bearer [REDACTED]";
  }
  return out;
}

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
  const durationMinutes = Number(session.duration_minutes ?? 60);

  const slotStartMs = new Date(slot_start_utc).getTime();

  console.log("[roundtable-lock] skip precheck - proceeding directly to Cal.com booking", {
    session_id: sid,
    brief_token_suffix: brief_token.slice(-8),
    slot_start_utc,
    durationMinutes,
    eventTypeId,
  });

  const { data: allPartners } = await supabase
    .from("roundtable_partners")
    .select("partner_email, partner_id")
    .eq("session_id", sid);

  const guests = (allPartners ?? [])
    .filter((p) => (p.partner_id as string) !== partnerRow.partner_id)
    .map((p) => String(p.partner_email))
    .filter(Boolean);

  const bookingHeaders: Record<string, string> = {
    Authorization: `Bearer ${calKey}`,
    "cal-api-version": "2024-08-13",
    "Content-Type": "application/json",
  };

  const bookingBody = {
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
  };

  const bookingBodyStr = JSON.stringify(bookingBody);

  console.log("[roundtable-lock] Cal.com booking request", {
    url: CAL_BOOKING_URL,
    method: "POST",
    headers: redactAuthHeader(bookingHeaders),
    body: bookingBody,
    body_bytes: new TextEncoder().encode(bookingBodyStr).length,
    note:
      "Consensus slot - no availability precheck; Cal.com is source of truth",
  });

  const bookingRes = await fetch(CAL_BOOKING_URL, {
    method: "POST",
    headers: bookingHeaders,
    body: bookingBodyStr,
  });

  const bookingText = await bookingRes.text();
  let bookingJson: Record<string, unknown> = {};
  try {
    bookingJson = bookingText ? (JSON.parse(bookingText) as Record<string, unknown>) : {};
  } catch (e) {
    console.log("[roundtable-lock] Cal.com response JSON parse error", {
      status: bookingRes.status,
      raw_body_preview: bookingText.slice(0, 2000),
      err: String(e),
    });
  }

  console.log("[roundtable-lock] Cal.com booking response", {
    http_status: bookingRes.status,
    http_ok: bookingRes.ok,
    response_body_full: bookingText,
    response_bytes: new TextEncoder().encode(bookingText).length,
  });

  const rollbackOpen = async () => {
    await supabase.from("roundtable_sessions").update({ status: "open" }).eq("id", sid);
  };

  const st = bookingRes.status;

  // Success: any 2xx (typically 200 or 201 from Cal.com bookings)
  if (bookingRes.ok) {
    console.log("[roundtable-lock] branch=booking_http_success extract uid + meeting url");

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

    console.log("[roundtable-lock] branch=success persist locked + queue finalize", {
      session_id: sid,
      calcom_booking_uid: uid,
      meeting_link_present: Boolean(meetingUrl),
      locked_slot_start: slot_start_utc,
      locked_slot_end: slotEndUtc,
    });

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
  }

  // Booking failed: rollback lock_pending -> open once, then classify
  await rollbackOpen();

  if (st === 409) {
    console.log("[roundtable-lock] branch=slot_taken_at_calcom rollback session to open", {
      session_id: sid,
      http_status: st,
      parsed: bookingJson,
    });
    return json({
      success: false,
      reason: "slot_taken_at_calcom",
      message:
        "That slot was taken on the calendar. Pick another - your other selections are still saved.",
    });
  }

  if (st === 400) {
    console.log("[roundtable-lock] branch=validation_error rollback session to open", {
      session_id: sid,
      http_status: st,
      calcom_response: bookingJson,
      response_body_full: bookingText,
    });
    return json({
      success: false,
      reason: "validation_error",
      message: "Calendar rejected the booking request.",
      calcom_response: bookingJson,
      calcom_raw: bookingText,
    });
  }

  if (st === 401 || st === 403) {
    console.log("[roundtable-lock] branch=auth_error rollback session to open", {
      session_id: sid,
      http_status: st,
      response_body_full: bookingText,
    });
    return json({
      success: false,
      reason: "auth_error",
      message: "Calendar authentication failed. Please contact support.",
    });
  }

  if (st >= 500 && st <= 599) {
    console.log("[roundtable-lock] branch=calcom_unavailable rollback session to open", {
      session_id: sid,
      http_status: st,
      response_body_full: bookingText,
    });
    return json({
      success: false,
      reason: "calcom_unavailable",
      message: "Calendar service is unavailable. Please try again shortly.",
    });
  }

  console.log("[roundtable-lock] branch=unknown_calcom_failure rollback session to open", {
    session_id: sid,
    http_status: st,
    response_body_full: bookingText,
    parsed: bookingJson,
  });
  return json({
    success: false,
    reason: "unknown",
    message: "Could not complete the booking. Please try again.",
    http_status: st,
    calcom_response: bookingJson,
    calcom_raw: bookingText,
  });
});
