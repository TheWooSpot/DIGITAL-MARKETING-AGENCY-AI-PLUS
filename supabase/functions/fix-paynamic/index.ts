/**
 * fix-paynamic — one-shot: creates canonical PayNamic product + prices in Stripe,
 * then updates layer4_revenue_logic and layer1_service_catalog.
 */

const CORS = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };

async function stripePost(stripeKey: string, path: string, params: Record<string, unknown>) {
  const body = Object.entries(params)
    .flatMap(([k, v]) => v !== undefined ? [`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`] : [])
    .join("&");
  const res = await fetch(`https://api.stripe.com${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${stripeKey}`, "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Stripe POST ${path} failed: ${JSON.stringify(data)}`);
  return data as Record<string, unknown>;
}

async function stripePaginate(stripeKey: string, endpoint: string): Promise<Array<Record<string, unknown>>> {
  const items: Array<Record<string, unknown>> = [];
  let url = `https://api.stripe.com${endpoint}${endpoint.includes("?") ? "&" : "?"}limit=100`;
  while (url) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${stripeKey}` } });
    const body = await res.json() as { data: Array<Record<string, unknown>>; has_more: boolean };
    if (!res.ok) throw new Error(`Stripe paginate failed: ${JSON.stringify(body)}`);
    items.push(...body.data);
    const last = body.data[body.data.length - 1] as { id: string } | undefined;
    url = body.has_more && last
      ? `https://api.stripe.com${endpoint}${endpoint.includes("?") ? "&" : "?"}limit=100&starting_after=${last.id}`
      : "";
  }
  return items;
}

async function sbPatch(supabaseUrl: string, serviceKey: string, table: string, filter: string, data: Record<string, unknown>) {
  const res = await fetch(`${supabaseUrl}/rest/v1/${table}?${filter}`, {
    method: "PATCH",
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`PATCH ${table} failed (${res.status}): ${await res.text()}`);
}

Deno.serve(async () => {
  const STRIPE_KEY = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!STRIPE_KEY || !SUPABASE_URL || !SERVICE_KEY) {
    return new Response(JSON.stringify({ error: "Missing env vars" }), { status: 500, headers: CORS });
  }

  const log: string[] = [];

  try {
    // Get existing products to avoid duplicate creation
    const allProducts = await stripePaginate(STRIPE_KEY, "/v1/products?active=true");
    const allPrices = await stripePaginate(STRIPE_KEY, "/v1/prices?active=true");

    const productName = "PayNamic\u2122 Dynamic Checkout Engine";
    
    // Find existing PayNamic product that is NOT the archived one
    const existing = allProducts.find(p =>
      typeof p.name === "string" &&
      p.name.includes("PayNamic") &&
      p.id !== "prod_UEHRqLM2ZmcNeA"
    );

    let productId: string;
    if (existing) {
      productId = existing.id as string;
      log.push(`Found existing PayNamic product: ${productId} ("${existing.name}")`);
    } else {
      const created = await stripePost(STRIPE_KEY, "/v1/products", { name: productName });
      productId = created.id as string;
      log.push(`Created PayNamic product: ${productId}`);
    }

    // Find or create monthly recurring price
    const productPrices = allPrices.filter(p => p.product === productId);
    const monthlyPrice = productPrices.find(p => p.type === "recurring" && (p.recurring as { interval?: string } | null)?.interval === "month");
    const setupPrice = productPrices.find(p => p.type === "one_time");

    let monthlyId: string;
    if (monthlyPrice) {
      monthlyId = monthlyPrice.id as string;
      log.push(`Found existing monthly price: ${monthlyId}`);
    } else {
      const p = await stripePost(STRIPE_KEY, "/v1/prices", {
        product: productId,
        unit_amount: 29700,
        currency: "usd",
        "recurring[interval]": "month",
      });
      monthlyId = p.id as string;
      log.push(`Created monthly price: ${monthlyId} ($297/mo)`);
    }

    let setupId: string;
    if (setupPrice) {
      setupId = setupPrice.id as string;
      log.push(`Found existing setup price: ${setupId}`);
    } else {
      const p = await stripePost(STRIPE_KEY, "/v1/prices", {
        product: productId,
        unit_amount: 19700,
        currency: "usd",
      });
      setupId = p.id as string;
      log.push(`Created setup price: ${setupId} ($197 one-time)`);
    }

    // Update layer4_revenue_logic
    await sbPatch(SUPABASE_URL, SERVICE_KEY, "layer4_revenue_logic", "service_id=eq.304", {
      stripe_product_id: productId,
      stripe_monthly_price_id: monthlyId,
      stripe_setup_price_id: setupId,
    });
    log.push(`Updated layer4 service 304: prod=${productId} monthly=${monthlyId} setup=${setupId}`);

    // Mirror to layer1
    await sbPatch(SUPABASE_URL, SERVICE_KEY, "layer1_service_catalog", "service_id=eq.304", {
      stripe_product_id: productId,
    });
    log.push("Mirrored to layer1_service_catalog");

    return new Response(JSON.stringify({ success: true, product_id: productId, monthly_price_id: monthlyId, setup_price_id: setupId, log }), { status: 200, headers: CORS });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ success: false, error: msg, log }), { status: 500, headers: CORS });
  }
});
