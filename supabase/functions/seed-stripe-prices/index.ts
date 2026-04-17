/**
 * seed-stripe-prices — one-shot Edge Function.
 * GET /functions/v1/seed-stripe-prices
 * Fetches Stripe products+prices, matches to SERVICE_MAP, upserts layer4_revenue_logic.
 */

const CORS = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };

const SERVICE_MAP: Record<number, string> = {
  101: "SearchLift™ SBO Engine",
  102: "SpotLight Direct™ Media Engine",
  103: "Authority Amplifier™ PR System",
  104: "Signal Surge™ Paid Traffic Lab",
  105: "NearRank™ Local Discovery Engine",
  106: "AutoRank™ Search Box Optimizer",
  201: "VoiceBridge™ AI ChatLabs",
  202: "InboxIgnite™ Smart Email Engine",
  203: "TextPulse™ SMS Automation",
  503: "Adaptation™ AI Readiness Rung 2",
  301: "BookStream™ Smart Scheduling Hub",
  302: "CloseCraft™ Funnel Builder",
  303: "DealDrive™ Proposal Automation",
  304: "PayNamic™ Dynamic Checkout Engine",
  401: "HubAI™ CRM Architecture",
  402: "FlowForge™ Automation Lab",
  403: "CommandDesk™ Client Portal System",
  501: "SkillSprint™ Workshop Academy",
  502: "Onboardly™ Client Activation System",
  601: "Voice & Vibe™ Production Engine",
  602: "StoryFrame™ Brand Narrative Suite",
  701: "InsightLoop™ Analytics Dashboard",
  801: "TrustGuard™ Governance Layer",
  802: "ReputationStack™ Reviews Engine",
  901: "AllianceOS™ Growth Partnerships Engine",
  1001: "Socialutely Circle™",
  1002: "Momentum Vault™",
  1003: "Concierge Access™",
  1004: "AI Maturity Diagnostic & Blueprint™",
};

function norm(s: string): string {
  return s.toLowerCase()
    .replace(/[™®©]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function stripePaginate(stripeKey: string, endpoint: string): Promise<unknown[]> {
  const items: unknown[] = [];
  let url = `https://api.stripe.com${endpoint}${endpoint.includes("?") ? "&" : "?"}limit=100`;
  while (url) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${stripeKey}` },
    });
    const body = await res.json() as { data: unknown[]; has_more: boolean };
    if (!res.ok) { console.error("Stripe error:", JSON.stringify(body)); break; }
    items.push(...body.data);
    const last = body.data[body.data.length - 1] as { id: string } | undefined;
    url = body.has_more && last
      ? `https://api.stripe.com${endpoint}${endpoint.includes("?") ? "&" : "?"}limit=100&starting_after=${last.id}`
      : "";
  }
  return items;
}

Deno.serve(async () => {
  const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!STRIPE_SECRET_KEY) return new Response(JSON.stringify({ error: "Missing STRIPE_SECRET_KEY" }), { status: 500, headers: CORS });
  if (!SUPABASE_URL || !SERVICE_KEY) return new Response(JSON.stringify({ error: "Missing Supabase config" }), { status: 500, headers: CORS });

  const products = await stripePaginate(STRIPE_SECRET_KEY, "/v1/products?active=true") as Array<{
    id: string; name: string; metadata?: Record<string, string>;
  }>;
  const prices = await stripePaginate(STRIPE_SECRET_KEY, "/v1/prices?active=true") as Array<{
    id: string; product: string; type: string; recurring?: { interval: string };
  }>;

  const productList = products.map(p => ({ id: p.id, name: p.name }));

  // Group prices by product
  const pricesByProduct = new Map<string, typeof prices>();
  for (const price of prices) {
    const pid = price.product;
    if (!pricesByProduct.has(pid)) pricesByProduct.set(pid, []);
    pricesByProduct.get(pid)!.push(price);
  }

  const matches: Array<{
    service_id: number;
    service_name: string;
    stripe_product_id: string;
    stripe_monthly_price_id: string | null;
    stripe_setup_price_id: string | null;
  }> = [];
  const unmatched: Array<{ name: string; id: string }> = [];

  for (const product of products) {
    const productNorm = norm(product.name);
    let matchedId: number | null = null;

    // 1. metadata.service_id
    if (product.metadata?.service_id) {
      const sid = parseInt(product.metadata.service_id, 10);
      if (SERVICE_MAP[sid]) matchedId = sid;
    }

    // 2. Exact normalised name
    if (!matchedId) {
      for (const [id, name] of Object.entries(SERVICE_MAP)) {
        if (norm(name) === productNorm) { matchedId = parseInt(id, 10); break; }
      }
    }

    // 3. First-word partial match
    if (!matchedId) {
      const productFirst = productNorm.split(" ")[0];
      for (const [id, name] of Object.entries(SERVICE_MAP)) {
        const svcFirst = norm(name).split(" ")[0];
        if (productNorm.includes(svcFirst) || svcFirst.includes(productFirst)) {
          matchedId = parseInt(id, 10);
          break;
        }
      }
    }

    const productPrices = pricesByProduct.get(product.id) ?? [];
    const monthly = productPrices.find(p => p.type === "recurring" && p.recurring?.interval === "month");
    const oneTime = productPrices.find(p => p.type === "one_time");

    if (matchedId) {
      matches.push({
        service_id: matchedId,
        service_name: SERVICE_MAP[matchedId],
        stripe_product_id: product.id,
        stripe_monthly_price_id: monthly?.id ?? null,
        stripe_setup_price_id: oneTime?.id ?? null,
      });
    } else {
      unmatched.push({ name: product.name, id: product.id });
    }
  }

  if (matches.length === 0) {
    return new Response(JSON.stringify({
      message: "No matches found — Stripe product names don't match SERVICE_MAP",
      stripe_products: productList,
      unmatched,
    }), { status: 200, headers: CORS });
  }

  // Deduplicate by service_id — last match wins (keeps most complete price data)
  const deduped = new Map<number, typeof matches[0]>();
  for (const m of matches) {
    const existing = deduped.get(m.service_id);
    // Prefer the entry that has both price IDs set
    if (!existing || (!existing.stripe_monthly_price_id && m.stripe_monthly_price_id)) {
      deduped.set(m.service_id, m);
    }
  }
  const dedupedMatches = Array.from(deduped.values());

  // Delete existing rows for these service_ids first, then insert fresh
  const ids = dedupedMatches.map(m => m.service_id).join(",");
  const deleteRes = await fetch(
    `${SUPABASE_URL}/rest/v1/layer4_revenue_logic?service_id=in.(${ids})`,
    {
      method: "DELETE",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        Prefer: "return=minimal",
      },
    }
  );
  console.log("DELETE status:", deleteRes.status);

  // Insert all rows
  const sbRes = await fetch(
    `${SUPABASE_URL}/rest/v1/layer4_revenue_logic`,
    {
      method: "POST",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(dedupedMatches),
    }
  );

  const sbBody = await sbRes.text();
  let upserted: unknown[] = [];
  try { upserted = JSON.parse(sbBody); } catch { /* ignore */ }

  return new Response(JSON.stringify({
    stripe_products_found: products.length,
    stripe_prices_found: prices.length,
    matched: matches.length,
    deduped: dedupedMatches.length,
    inserted: Array.isArray(upserted) ? upserted.length : "unknown",
    matches: dedupedMatches,
    unmatched,
    supabase_status: sbRes.status,
  }), { status: 200, headers: CORS });
});
