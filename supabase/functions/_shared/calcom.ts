/** Cal.com API v2 helpers — server-side only. */

const CAL_BASE = "https://api.cal.com";

export type CalSlotRange = { start: string; end: string };

export async function fetchAvailableSlots(params: {
  apiKey: string;
  apiVersion: string;
  eventTypeId: number;
  rangeStartIso: string;
  rangeEndIso: string;
  timeZone: string;
}): Promise<CalSlotRange[]> {
  const q = new URLSearchParams({
    eventTypeId: String(params.eventTypeId),
    start: params.rangeStartIso,
    end: params.rangeEndIso,
    timeZone: params.timeZone,
    format: "range",
  });

  const urls = [
    `${CAL_BASE}/v2/slots?${q}`,
    `${CAL_BASE}/v2/slots/available?${q}`,
  ];

  const headers = {
    Authorization: `Bearer ${params.apiKey}`,
    "cal-api-version": params.apiVersion,
  };

  for (const url of urls) {
    const res = await fetch(url, { headers });
    if (!res.ok) continue;
    const raw = (await res.json()) as Record<string, unknown>;
    const flat = flattenCalSlots(raw);
    if (flat.length > 0) return flat;
  }

  const res = await fetch(`${CAL_BASE}/v2/slots?${q}`, {
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      "cal-api-version": "2024-09-04",
    },
  });
  if (!res.ok) return [];
  const raw = (await res.json()) as Record<string, unknown>;
  return flattenCalSlots(raw);
}

function flattenCalSlots(raw: Record<string, unknown>): CalSlotRange[] {
  const data = raw?.data ?? raw;
  const out: CalSlotRange[] = [];

  if (Array.isArray(data)) {
    for (const item of data) {
      if (item && typeof item === "object") {
        const o = item as Record<string, unknown>;
        const s = o.start ?? o.startTime;
        const e = o.end ?? o.endTime;
        if (typeof s === "string" && typeof e === "string") out.push({ start: s, end: e });
      }
    }
    return out;
  }

  if (data && typeof data === "object" && !Array.isArray(data)) {
    for (const v of Object.values(data as Record<string, unknown>)) {
      if (Array.isArray(v)) {
        for (const slot of v) {
          if (typeof slot === "string") {
            out.push({ start: slot, end: slot });
          } else if (slot && typeof slot === "object") {
            const o = slot as Record<string, unknown>;
            const s = o.start ?? o.startTime;
            const e = o.end ?? o.endTime;
            if (typeof s === "string") {
              out.push({
                start: s,
                end: typeof e === "string" ? e : s,
              });
            }
          }
        }
      }
    }
  }

  return out;
}

/** Keep only canonical grid hours in the partner's local timezone (10, 12, 14, 16). */
export function filterCanonicalSlots(
  slots: CalSlotRange[],
  timeZone: string,
  allowedHoursLocal: number[],
): CalSlotRange[] {
  const allowed = new Set(allowedHoursLocal);
  return slots.filter((slot) => {
    const d = new Date(slot.start);
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "numeric",
      hour12: false,
    }).formatToParts(d);
    const hourStr = parts.find((p) => p.type === "hour")?.value;
    const hour = hourStr ? parseInt(hourStr, 10) : NaN;
    return allowed.has(hour);
  });
}
