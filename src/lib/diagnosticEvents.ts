import { supabase } from "./supabase";

type EventType =
  | "report_viewed"
  | "cta_clicked"
  | "checkout_started"
  | "checkout_cancelled"
  | "voice_launched"
  | "voice_ended";

type EventPayload = {
  share_token?: string;
  portal_token?: string;
  prospect_id?: string;
  door?: "door-2" | "door-3" | "door-7" | "door-9";
  event_data?: Record<string, unknown>;
};

function getSessionId(): string {
  const existing = sessionStorage.getItem("session_id");
  if (existing) return existing;
  const created = crypto.randomUUID();
  sessionStorage.setItem("session_id", created);
  return created;
}

export async function logEvent(eventType: EventType, payload: EventPayload) {
  try {
    if (!supabase) return;
    await supabase.from("diagnostic_events").insert({
      event_type: eventType,
      source: "frontend",
      user_agent: navigator.userAgent.slice(0, 500),
      session_id: getSessionId(),
      ...payload,
    });
  } catch (e) {
    console.warn("[diag-event] failed", e);
  }
}
