/**
 * One-time Cal.com setup: ensure event type slug `roundtable` exists.
 * Requires env: CAL_COM_API_KEY (never commit real keys).
 *
 * Run from repo root:
 *   set CAL_COM_API_KEY=...   (Windows PowerShell: $env:CAL_COM_API_KEY="...")
 *   node scripts/setup-roundtable-eventtype.mjs
 */

const CAL_BASE = "https://api.cal.com";

const slug = "roundtable";

async function main() {
  const apiKey = process.env.CAL_COM_API_KEY;
  if (!apiKey) {
    console.error("Missing CAL_COM_API_KEY");
    process.exit(1);
  }

  const listParams = new URLSearchParams({
    username: "socialutely",
  });

  const listRes = await fetch(`${CAL_BASE}/v2/event-types?${listParams}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "cal-api-version": "2024-06-14",
    },
  });

  const listJson = await listRes.json().catch(() => ({}));
  const rows =
    listJson?.data ??
    listJson?.event_types ??
    listJson?.items ??
    [];

  const flat = Array.isArray(rows)
    ? rows
    : typeof rows === "object" && rows !== null
      ? Object.values(rows).flat()
      : [];

  const existing = flat.find((e) => e?.slug === slug || e?.slug === `/${slug}`);
  if (existing?.id != null) {
    console.log(
      `Found existing '${slug}' event type id=${existing.id}. Add to Supabase Edge secrets as ROUNDTABLE_CALCOM_EVENT_TYPE_ID=${existing.id}`,
    );
    return;
  }

  const createRes = await fetch(`${CAL_BASE}/v2/event-types`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "cal-api-version": "2024-06-14",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: "AI Readiness Labs Working Session",
      slug,
      lengthInMinutes: 60,
      description: "Working session for the AI Readiness Labs partner group",
      locations: [{ type: "integration", integration: "cal-video" }],
      beforeEventBuffer: 0,
      afterEventBuffer: 15,
      minimumBookingNotice: 0,
      hidden: true,
      disableGuests: false,
    }),
  });

  const created = await createRes.json().catch(() => ({}));
  if (!createRes.ok) {
    console.error("Create failed:", createRes.status, created);
    process.exit(1);
  }

  const id =
    created?.data?.id ??
    created?.data?.eventTypeId ??
    created?.id ??
    created?.eventTypeId;
  console.log(
    `Created '${slug}' event type id=${id}. Set Supabase secret ROUNDTABLE_CALCOM_EVENT_TYPE_ID=${id}`,
  );
}

await main();
