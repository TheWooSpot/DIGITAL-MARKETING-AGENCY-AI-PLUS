import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

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

function addMinutesIso(iso: string, mins: number): string {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() + mins);
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
  let slot_starts: string[] = [];
  try {
    const body = (await req.json()) as {
      brief_token?: string;
      slot_starts?: string[];
    };
    brief_token = typeof body?.brief_token === "string" ? body.brief_token.trim() : undefined;
    slot_starts = Array.isArray(body?.slot_starts)
      ? body.slot_starts.map((s) => normalizeIso(String(s)))
      : [];
  } catch {
    return json({ error: "Invalid request." }, 400);
  }

  if (!brief_token) {
    return json({ error: "Invalid request." }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return json({ error: "Something went wrong. Please try again." }, 503);
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: partnerRow, error: pErr } = await supabase
    .from("roundtable_partners")
    .select("id, partner_id, session_id")
    .eq("brief_token", brief_token)
    .maybeSingle();

  if (pErr || !partnerRow) {
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
  const pid = partnerRow.partner_id as string;

  if (String(session.status) !== "open") {
    return json({ error: "This scheduling window is no longer active." }, 400);
  }

  const expiresAt = session.expires_at ? new Date(String(session.expires_at)) : null;
  if (expiresAt && Date.now() > expiresAt.getTime()) {
    return json({
      error: "This scheduling window has closed. The team will reach out separately about next steps.",
    }, 400);
  }

  const durationMinutes = Number(session.duration_minutes ?? 60);

  const { data: existing } = await supabase
    .from("roundtable_taps")
    .select("id, slot_start_utc")
    .eq("session_id", sid)
    .eq("partner_id", pid)
    .eq("is_active", true);

  const keep = new Set(slot_starts.map(normalizeIso));
  for (const row of existing ?? []) {
    const ns = normalizeIso(String(row.slot_start_utc));
    if (!keep.has(ns)) {
      await supabase
        .from("roundtable_taps")
        .update({ is_active: false })
        .eq("id", row.id);
    }
  }

  for (const startIso of slot_starts) {
    const endIso = addMinutesIso(startIso, durationMinutes);
    await supabase.from("roundtable_taps").upsert(
      {
        session_id: sid,
        partner_id: pid,
        slot_start_utc: startIso,
        slot_end_utc: endIso,
        is_active: true,
        tapped_at: new Date().toISOString(),
      },
      { onConflict: "session_id,partner_id,slot_start_utc" },
    );
  }

  await supabase
    .from("roundtable_partners")
    .update({
      invite_status: "engaged",
      last_active_at: new Date().toISOString(),
    })
    .eq("id", partnerRow.id);

  const quorum = Number(session.quorum_threshold ?? 3);

  const { data: overlaps } = await supabase
    .from("v_roundtable_slot_overlaps")
    .select("slot_start_utc, slot_end_utc, overlap_count")
    .eq("session_id", sid)
    .order("overlap_count", { ascending: false });

  const hit = (overlaps ?? []).find((o) => Number(o.overlap_count) >= quorum);

  if (hit) {
    await supabase
      .from("roundtable_sessions")
      .update({ status: "lock_pending" })
      .eq("id", sid);

    return json({
      lock_pending: true,
      lock_slot_start: hit.slot_start_utc,
      lock_slot_end: hit.slot_end_utc,
      confirmed_count: slot_starts.length,
    });
  }

  return json({
    lock_pending: false,
    confirmed_count: slot_starts.length,
  });
});
