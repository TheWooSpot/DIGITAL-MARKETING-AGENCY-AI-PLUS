/**
 * Socialutely — Notion → Supabase L1 Sync Edge Function
 * ======================================================
 * Syncs Layer 1 Notion databases to Supabase on demand or via cron.
 * 
 * Triggers:
 *   - POST https://<project>.supabase.co/functions/v1/notion-sync
 *   - Scheduled cron (set in supabase/config.toml)
 * 
 * Environment variables required (set in Supabase dashboard → Edge Functions → Secrets):
 *   NOTION_TOKEN          — Notion integration token (secret_...)
 *   SUPABASE_URL          — your project URL (auto-injected)
 *   SUPABASE_SERVICE_KEY  — service role key (auto-injected as SUPABASE_SERVICE_ROLE_KEY)
 * 
 * Notion data source IDs (L1):
 *   Service Catalog:    443e01c7-32f8-4619-9c0c-84a61a77c935
 *   Categories:         4426ca52-cece-4ee7-bc50-73533eaf3bff
 *   Service Boundaries: 6fdb60a2-a221-4153-a5c4-3f3634211257
 */

const NOTION_API = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

// Notion database IDs (the actual database pages, not data sources)
const NOTION_DBS = {
  service_catalog:    "b10fb89cd08245e990a2e8617cb630ca",
  categories:         "11bf323d5bf244ecb3257fb64a64f907",
  service_boundaries: "3935fc597b8c46adafe63dc5e114c6b8",
};

// ── Notion API helpers ────────────────────────────────────────────────────────

async function notionQuery(databaseId: string, token: string, cursor?: string) {
  const body: Record<string, unknown> = { page_size: 100 };
  if (cursor) body.start_cursor = cursor;

  const res = await fetch(`${NOTION_API}/databases/${databaseId}/query`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`Notion query failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function getAllPages(databaseId: string, token: string) {
  const pages: unknown[] = [];
  let cursor: string | undefined;

  do {
    const result = await notionQuery(databaseId, token, cursor);
    pages.push(...result.results);
    cursor = result.has_more ? result.next_cursor : undefined;
  } while (cursor);

  return pages;
}

// ── Property extractors ───────────────────────────────────────────────────────

function getText(prop: Record<string, unknown>): string {
  if (!prop) return "";
  if (prop.type === "title") return (prop.title as Array<{plain_text: string}>)?.map(t => t.plain_text).join("") ?? "";
  if (prop.type === "rich_text") return (prop.rich_text as Array<{plain_text: string}>)?.map(t => t.plain_text).join("") ?? "";
  return "";
}

function getSelect(prop: Record<string, unknown>): string {
  if (!prop || prop.type !== "select") return "";
  return (prop.select as {name: string})?.name ?? "";
}

function getNumber(prop: Record<string, unknown>): number | null {
  if (!prop || prop.type !== "number") return null;
  return prop.number as number ?? null;
}

// ── Transform functions — Notion page → Supabase row ─────────────────────────

function transformServiceCatalog(page: Record<string, unknown>) {
  const props = page.properties as Record<string, Record<string, unknown>>;
  return {
    notion_page_id: page.id,
    service_id:     getText(props["Service ID"]),
    service_name:   getText(props["Service Name"] ?? props["Socialutely Service"]),
    category:       getText(props["Category"]),
    tier:           getSelect(props["Tier"]),
    status:         getSelect(props["Status"]) || "Active",
    sort_order:     getNumber(props["sort_order"]) ?? null,
    updated_at:     new Date().toISOString(),
  };
}

function transformCategories(page: Record<string, unknown>) {
  const props = page.properties as Record<string, Record<string, unknown>>;
  return {
    notion_page_id:   page.id,
    category_name:    getText(props["Category Name"] ?? props["Name"]),
    category_order:   getNumber(props["Order"] ?? props["Category Order"]) ?? null,
    description:      getText(props["Description"]),
    updated_at:       new Date().toISOString(),
  };
}

function transformServiceBoundaries(page: Record<string, unknown>) {
  const props = page.properties as Record<string, Record<string, unknown>>;
  return {
    notion_page_id:   page.id,
    service_id:       getText(props["Service ID"]),
    service_name:     getText(props["Service Name"]),
    excludes:         getText(props["Excludes"]),
    exclusion_reason: getText(props["Exclusion Reason"]),
    growth_mechanism: getText(props["Growth Mechanism"]),
    updated_at:       new Date().toISOString(),
  };
}

// ── Supabase upsert ───────────────────────────────────────────────────────────

async function supabaseUpsert(
  table: string,
  rows: Record<string, unknown>[],
  supabaseUrl: string,
  serviceKey: string,
  onConflict: string = "notion_page_id"
) {
  if (rows.length === 0) return { count: 0 };

  const res = await fetch(
    `${supabaseUrl}/rest/v1/${table}?on_conflict=${onConflict}`,
    {
      method: "POST",
      headers: {
        "apikey": serviceKey,
        "Authorization": `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(rows),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase upsert to ${table} failed: ${res.status} ${err}`);
  }

  return { count: rows.length };
}

// ── Add notion_page_id column if it doesn't exist ────────────────────────────

async function ensureNotionPageIdColumns(supabaseUrl: string, serviceKey: string) {
  const tables = [
    "layer1_service_catalog",
    "layer1_categories", 
    "layer1_service_boundaries"
  ];

  for (const table of tables) {
    await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: "POST",
      headers: {
        "apikey": serviceKey,
        "Authorization": `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sql: `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS notion_page_id text UNIQUE;`
      }),
    });
  }
}

// ── Main sync handler ─────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  // Allow GET for health check
  if (req.method === "GET") {
    return new Response(JSON.stringify({ status: "ok", fn: "notion-sync" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const startTime = Date.now();
  const results: Record<string, unknown> = {};

  try {
    const NOTION_TOKEN    = Deno.env.get("NOTION_TOKEN") ?? "";
    const SUPABASE_URL    = Deno.env.get("SUPABASE_URL") ?? "";
    const SERVICE_KEY     = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!NOTION_TOKEN) throw new Error("Missing NOTION_TOKEN");
    if (!SUPABASE_URL) throw new Error("Missing SUPABASE_URL");
    if (!SERVICE_KEY)  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

    // ── 1. Sync Service Catalog ───────────────────────────────────────────────
    console.log("Syncing layer1_service_catalog...");
    const catalogPages = await getAllPages(NOTION_DBS.service_catalog, NOTION_TOKEN);
    const catalogRows  = catalogPages
      .filter((p: Record<string, unknown>) => !(p as {archived: boolean}).archived)
      .map(transformServiceCatalog);
    results.service_catalog = await supabaseUpsert(
      "layer1_service_catalog", catalogRows, SUPABASE_URL, SERVICE_KEY
    );
    console.log(`  → ${catalogRows.length} service catalog rows upserted`);

    // ── 2. Sync Categories ────────────────────────────────────────────────────
    console.log("Syncing layer1_categories...");
    const categoryPages = await getAllPages(NOTION_DBS.categories, NOTION_TOKEN);
    const categoryRows  = categoryPages
      .filter((p: Record<string, unknown>) => !(p as {archived: boolean}).archived)
      .map(transformCategories);
    results.categories = await supabaseUpsert(
      "layer1_categories", categoryRows, SUPABASE_URL, SERVICE_KEY
    );
    console.log(`  → ${categoryRows.length} category rows upserted`);

    // ── 3. Sync Service Boundaries ────────────────────────────────────────────
    console.log("Syncing layer1_service_boundaries...");
    const boundaryPages = await getAllPages(NOTION_DBS.service_boundaries, NOTION_TOKEN);
    const boundaryRows  = boundaryPages
      .filter((p: Record<string, unknown>) => !(p as {archived: boolean}).archived)
      .map(transformServiceBoundaries);
    results.service_boundaries = await supabaseUpsert(
      "layer1_service_boundaries", boundaryRows, SUPABASE_URL, SERVICE_KEY
    );
    console.log(`  → ${boundaryRows.length} service boundary rows upserted`);

    const duration = Date.now() - startTime;
    console.log(`Sync complete in ${duration}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        duration_ms: duration,
        synced_at: new Date().toISOString(),
        results,
      }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Sync error:", err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
