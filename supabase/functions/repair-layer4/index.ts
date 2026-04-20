/**
 * repair-layer4 — one-shot Edge Function.
 * POST /functions/v1/repair-layer4
 * 
 * This function:
 *  1. Fetches all active Stripe products to understand what exists
 *  2. Fixes wrong product IDs for 201, 304, 401
 *  3. Separates 601 from 201 (they currently share a product)
 *  4. Creates missing Stripe products/prices for 1001, 1002, 1003
 *  5. Fixes 1002 to not use archived product
 *  6. Populates ALL pricing metadata (tier, retail_price_low, retail_price_high, etc.)
 *  7. Mirrors stripe_product_id to layer1_service_catalog
 *  8. Inserts missing rows for 1001, 1003
 */

const CORS = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };

type StripeProduct = {
  id: string;
  name: string;
  active: boolean;
  metadata?: Record<string, string>;
};

type StripePrice = {
  id: string;
  product: string;
  type: string;
  unit_amount: number | null;
  recurring?: { interval: string } | null;
  active: boolean;
};

async function stripeGet(stripeKey: string, path: string) {
  const res = await fetch(`https://api.stripe.com${path}`, {
    headers: { Authorization: `Bearer ${stripeKey}` },
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`Stripe GET ${path} failed: ${JSON.stringify(body)}`);
  return body;
}

async function stripePost(stripeKey: string, path: string, params: Record<string, unknown>) {
  const body = Object.entries(params)
    .flatMap(([k, v]) => v !== undefined ? [`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`] : [])
    .join("&");
  const res = await fetch(`https://api.stripe.com${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stripeKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Stripe POST ${path} failed: ${JSON.stringify(data)}`);
  return data;
}

async function stripePaginate(stripeKey: string, endpoint: string): Promise<unknown[]> {
  const items: unknown[] = [];
  let url = `https://api.stripe.com${endpoint}${endpoint.includes("?") ? "&" : "?"}limit=100`;
  while (url) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${stripeKey}` } });
    const body = await res.json() as { data: unknown[]; has_more: boolean };
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
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PATCH ${table} ${filter} failed (${res.status}): ${text}`);
  }
  return res.status;
}

async function sbInsert(supabaseUrl: string, serviceKey: string, table: string, data: Record<string, unknown>) {
  const res = await fetch(`${supabaseUrl}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`INSERT ${table} failed (${res.status}): ${text}`);
  }
  return res.status;
}

async function getOrCreateProduct(stripeKey: string, name: string, existingProducts: StripeProduct[]): Promise<StripeProduct> {
  const existing = existingProducts.find(p => p.name === name && p.active);
  if (existing) return existing;
  const created = await stripePost(stripeKey, "/v1/products", { name }) as StripeProduct;
  return created;
}

async function getPricesForProduct(stripeKey: string, productId: string, allPrices: StripePrice[]): Promise<{ monthly: StripePrice | null; oneTime: StripePrice | null }> {
  const productPrices = allPrices.filter(p => p.product === productId && p.active);
  const monthly = productPrices.find(p => p.type === "recurring" && p.recurring?.interval === "month") ?? null;
  const oneTime = productPrices.find(p => p.type === "one_time") ?? null;
  return { monthly, oneTime };
}

async function createPrice(stripeKey: string, productId: string, unitAmount: number, type: "recurring" | "one_time"): Promise<StripePrice> {
  const params: Record<string, unknown> = {
    product: productId,
    unit_amount: unitAmount,
    currency: "usd",
  };
  if (type === "recurring") {
    params["recurring[interval]"] = "month";
  }
  return await stripePost(stripeKey, "/v1/prices", params) as StripePrice;
}

// Canonical pricing data per service
const PRICING_DATA: Record<number, {
  tier: string;
  priceLow: number;
  priceHigh: number;
  monthlyUnitAmount: number; // in cents for Stripe
  setupUnitAmount: number;   // in cents for Stripe
}> = {
  // Essentials tier ($1,800–$3,500/mo total)
  105: { tier: "Essentials", priceLow: 297, priceHigh: 397, monthlyUnitAmount: 29700, setupUnitAmount: 19700 },
  201: { tier: "Essentials", priceLow: 397, priceHigh: 497, monthlyUnitAmount: 39700, setupUnitAmount: 29700 },
  202: { tier: "Essentials", priceLow: 197, priceHigh: 297, monthlyUnitAmount: 19700, setupUnitAmount: 9700 },
  203: { tier: "Essentials", priceLow: 197, priceHigh: 297, monthlyUnitAmount: 19700, setupUnitAmount: 9700 },
  301: { tier: "Essentials", priceLow: 297, priceHigh: 397, monthlyUnitAmount: 29700, setupUnitAmount: 19700 },
  401: { tier: "Essentials", priceLow: 247, priceHigh: 347, monthlyUnitAmount: 24700, setupUnitAmount: 19700 },
  501: { tier: "Essentials", priceLow: 497, priceHigh: 497, monthlyUnitAmount: 49700, setupUnitAmount: 0 }, // one-time workshop
  // Momentum tier ($3,500–$6,500/mo total)
  101: { tier: "Momentum", priceLow: 497, priceHigh: 597, monthlyUnitAmount: 49700, setupUnitAmount: 29700 },
  104: { tier: "Momentum", priceLow: 397, priceHigh: 497, monthlyUnitAmount: 39700, setupUnitAmount: 19700 },
  303: { tier: "Momentum", priceLow: 447, priceHigh: 547, monthlyUnitAmount: 44700, setupUnitAmount: 24700 },
  304: { tier: "Momentum", priceLow: 297, priceHigh: 397, monthlyUnitAmount: 29700, setupUnitAmount: 19700 },
  402: { tier: "Momentum", priceLow: 497, priceHigh: 597, monthlyUnitAmount: 49700, setupUnitAmount: 29700 },
  // Signature tier ($6,500–$12,000/mo total)
  102: { tier: "Signature", priceLow: 697, priceHigh: 997, monthlyUnitAmount: 69700, setupUnitAmount: 39700 },
  103: { tier: "Signature", priceLow: 797, priceHigh: 1197, monthlyUnitAmount: 79700, setupUnitAmount: 39700 },
  302: { tier: "Signature", priceLow: 597, priceHigh: 897, monthlyUnitAmount: 59700, setupUnitAmount: 29700 },
  403: { tier: "Signature", priceLow: 697, priceHigh: 997, monthlyUnitAmount: 69700, setupUnitAmount: 34700 },
  502: { tier: "Signature", priceLow: 597, priceHigh: 897, monthlyUnitAmount: 59700, setupUnitAmount: 29700 },
  601: { tier: "Signature", priceLow: 997, priceHigh: 1497, monthlyUnitAmount: 99700, setupUnitAmount: 49700 },
  602: { tier: "Signature", priceLow: 797, priceHigh: 1197, monthlyUnitAmount: 79700, setupUnitAmount: 39700 },
  701: { tier: "Signature", priceLow: 597, priceHigh: 897, monthlyUnitAmount: 59700, setupUnitAmount: 29700 },
  // Vanguard tier ($12,000–$22,000/mo total)
  106: { tier: "Vanguard", priceLow: 997, priceHigh: 1497, monthlyUnitAmount: 99700, setupUnitAmount: 49700 },
  801: { tier: "Vanguard", priceLow: 1497, priceHigh: 2197, monthlyUnitAmount: 149700, setupUnitAmount: 74700 },
  802: { tier: "Vanguard", priceLow: 997, priceHigh: 1497, monthlyUnitAmount: 99700, setupUnitAmount: 49700 },
  901: { tier: "Vanguard", priceLow: 1497, priceHigh: 2497, monthlyUnitAmount: 149700, setupUnitAmount: 74700 },
  // Sovereign tier ($15,000+/mo)
  1001: { tier: "Sovereign", priceLow: 2997, priceHigh: 4997, monthlyUnitAmount: 299700, setupUnitAmount: 149700 },
  1002: { tier: "Sovereign", priceLow: 1997, priceHigh: 3497, monthlyUnitAmount: 199700, setupUnitAmount: 99700 },
  1003: { tier: "Sovereign", priceLow: 4997, priceHigh: 9999900, monthlyUnitAmount: 499700, setupUnitAmount: 249700 },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!STRIPE_SECRET_KEY) return new Response(JSON.stringify({ error: "Missing STRIPE_SECRET_KEY" }), { status: 500, headers: CORS });
  if (!SUPABASE_URL || !SERVICE_KEY) return new Response(JSON.stringify({ error: "Missing Supabase config" }), { status: 500, headers: CORS });

  const log: string[] = [];
  const errors: string[] = [];

  try {
    log.push("Fetching all active Stripe products and prices...");
    const allProducts = await stripePaginate(STRIPE_SECRET_KEY, "/v1/products?active=true") as StripeProduct[];
    // Also fetch inactive to find archived PayNamic canonical
    const allPricesActive = await stripePaginate(STRIPE_SECRET_KEY, "/v1/prices?active=true") as StripePrice[];
    const allPricesInactive = await stripePaginate(STRIPE_SECRET_KEY, "/v1/prices?active=false") as StripePrice[];
    const allPrices = [...allPricesActive, ...allPricesInactive];
    log.push(`Found ${allProducts.length} active products, ${allPrices.length} prices total`);

    // Build product lookup by ID
    const productById = new Map(allProducts.map(p => [p.id, p]));

    // ─────────────────────────────────────────────
    // FIX: service 304 PayNamic™ — canonical is prod_UECHxcCiK7Jvkn
    // ─────────────────────────────────────────────
    const payNamicCanonical = "prod_UECHxcCiK7Jvkn";
    const payNamicProduct = productById.get(payNamicCanonical);
    if (payNamicProduct) {
      const { monthly: pmMonthly, oneTime: pmSetup } = await getPricesForProduct(STRIPE_SECRET_KEY, payNamicCanonical, allPricesActive);
      let monthlyId = pmMonthly?.id ?? null;
      let setupId = pmSetup?.id ?? null;
      // Create missing prices if needed
      if (!monthlyId) {
        const p = await createPrice(STRIPE_SECRET_KEY, payNamicCanonical, 29700, "recurring");
        monthlyId = p.id;
        log.push(`Created PayNamic monthly price: ${monthlyId}`);
      }
      if (!setupId) {
        const p = await createPrice(STRIPE_SECRET_KEY, payNamicCanonical, 19700, "one_time");
        setupId = p.id;
        log.push(`Created PayNamic setup price: ${setupId}`);
      }
      await sbPatch(SUPABASE_URL, SERVICE_KEY, "layer4_revenue_logic", "service_id=eq.304", {
        stripe_product_id: payNamicCanonical,
        stripe_monthly_price_id: monthlyId,
        stripe_setup_price_id: setupId,
      });
      log.push(`Fixed 304 PayNamic™: prod=${payNamicCanonical} monthly=${monthlyId} setup=${setupId}`);
    } else {
      errors.push(`PayNamic canonical product ${payNamicCanonical} not found in Stripe. Check sandbox.`);
    }

    // ─────────────────────────────────────────────
    // FIX: service 201 VoiceBridge™ — canonical Essentials is prod_UEBSGmxrVmqH0a
    // ─────────────────────────────────────────────
    const voiceBridgeCanonical = "prod_UEBSGmxrVmqH0a";
    // First check if this product exists in all products (including inactive)
    const vbRes = await stripeGet(STRIPE_SECRET_KEY, `/v1/products/${voiceBridgeCanonical}`).catch(() => null) as StripeProduct | null;
    if (vbRes && vbRes.id) {
      const { monthly: vbMonthly, oneTime: vbSetup } = await getPricesForProduct(STRIPE_SECRET_KEY, voiceBridgeCanonical, allPrices);
      let monthlyId = vbMonthly?.id ?? null;
      let setupId = vbSetup?.id ?? null;
      if (!monthlyId) {
        const p = await createPrice(STRIPE_SECRET_KEY, voiceBridgeCanonical, 39700, "recurring");
        monthlyId = p.id;
        log.push(`Created VoiceBridge monthly price: ${monthlyId}`);
      }
      if (!setupId) {
        const p = await createPrice(STRIPE_SECRET_KEY, voiceBridgeCanonical, 29700, "one_time");
        setupId = p.id;
        log.push(`Created VoiceBridge setup price: ${setupId}`);
      }
      await sbPatch(SUPABASE_URL, SERVICE_KEY, "layer4_revenue_logic", "service_id=eq.201", {
        stripe_product_id: voiceBridgeCanonical,
        stripe_monthly_price_id: monthlyId,
        stripe_setup_price_id: setupId,
      });
      await sbPatch(SUPABASE_URL, SERVICE_KEY, "layer1_service_catalog", "service_id=eq.201", {
        stripe_product_id: voiceBridgeCanonical,
      });
      log.push(`Fixed 201 VoiceBridge™: prod=${voiceBridgeCanonical} monthly=${monthlyId} setup=${setupId}`);
    } else {
      errors.push(`VoiceBridge canonical product ${voiceBridgeCanonical} not found in Stripe.`);
    }

    // ─────────────────────────────────────────────
    // FIX: service 401 HubAI™ — canonical Essentials is prod_UEBTKH3e8ySMeq
    // ─────────────────────────────────────────────
    const hubAiCanonical = "prod_UEBTKH3e8ySMeq";
    const hubAiRes = await stripeGet(STRIPE_SECRET_KEY, `/v1/products/${hubAiCanonical}`).catch(() => null) as StripeProduct | null;
    if (hubAiRes && hubAiRes.id) {
      const { monthly: haMonthly, oneTime: haSetup } = await getPricesForProduct(STRIPE_SECRET_KEY, hubAiCanonical, allPrices);
      let monthlyId = haMonthly?.id ?? null;
      let setupId = haSetup?.id ?? null;
      if (!monthlyId) {
        const p = await createPrice(STRIPE_SECRET_KEY, hubAiCanonical, 24700, "recurring");
        monthlyId = p.id;
        log.push(`Created HubAI monthly price: ${monthlyId}`);
      }
      if (!setupId) {
        const p = await createPrice(STRIPE_SECRET_KEY, hubAiCanonical, 19700, "one_time");
        setupId = p.id;
        log.push(`Created HubAI setup price: ${setupId}`);
      }
      await sbPatch(SUPABASE_URL, SERVICE_KEY, "layer4_revenue_logic", "service_id=eq.401", {
        stripe_product_id: hubAiCanonical,
        stripe_monthly_price_id: monthlyId,
        stripe_setup_price_id: setupId,
      });
      await sbPatch(SUPABASE_URL, SERVICE_KEY, "layer1_service_catalog", "service_id=eq.401", {
        stripe_product_id: hubAiCanonical,
      });
      log.push(`Fixed 401 HubAI™: prod=${hubAiCanonical} monthly=${monthlyId} setup=${setupId}`);
    } else {
      errors.push(`HubAI canonical product ${hubAiCanonical} not found in Stripe.`);
    }

    // ─────────────────────────────────────────────
    // FIX: service 601 Voice & Vibe™ — needs its OWN product (currently sharing 201's)
    // Check if prod_UGwzEjgH4diaVg is actually Voice & Vibe or VoiceBridge
    // ─────────────────────────────────────────────
    const sharedProd = productById.get("prod_UGwzEjgH4diaVg");
    log.push(`Shared product prod_UGwzEjgH4diaVg name: "${sharedProd?.name ?? "not found"}"`);
    // This product was matched to VoiceBridge by the seed. For 601, create a dedicated product.
    const voiceVibeName = "Voice & Vibe™ Production Engine";
    const existingVoiceVibe = allProducts.find(p => p.name === voiceVibeName);
    let voiceVibeProdId: string;
    if (existingVoiceVibe && existingVoiceVibe.id !== "prod_UGwzEjgH4diaVg") {
      // There's a separate Voice & Vibe product already
      voiceVibeProdId = existingVoiceVibe.id;
      log.push(`Found existing Voice & Vibe product: ${voiceVibeProdId}`);
    } else {
      // Create a new one
      const newProd = await stripePost(STRIPE_SECRET_KEY, "/v1/products", { name: voiceVibeName }) as StripeProduct;
      voiceVibeProdId = newProd.id;
      log.push(`Created new Voice & Vibe™ product: ${voiceVibeProdId}`);
    }
    const { monthly: vvMonthly, oneTime: vvSetup } = await getPricesForProduct(STRIPE_SECRET_KEY, voiceVibeProdId, allPricesActive);
    let vvMonthlyId = vvMonthly?.id ?? null;
    let vvSetupId = vvSetup?.id ?? null;
    if (!vvMonthlyId) {
      const p = await createPrice(STRIPE_SECRET_KEY, voiceVibeProdId, 99700, "recurring");
      vvMonthlyId = p.id;
      log.push(`Created Voice & Vibe monthly price: ${vvMonthlyId}`);
    }
    if (!vvSetupId) {
      const p = await createPrice(STRIPE_SECRET_KEY, voiceVibeProdId, 49700, "one_time");
      vvSetupId = p.id;
      log.push(`Created Voice & Vibe setup price: ${vvSetupId}`);
    }
    await sbPatch(SUPABASE_URL, SERVICE_KEY, "layer4_revenue_logic", "service_id=eq.601", {
      stripe_product_id: voiceVibeProdId,
      stripe_monthly_price_id: vvMonthlyId,
      stripe_setup_price_id: vvSetupId,
    });
    await sbPatch(SUPABASE_URL, SERVICE_KEY, "layer1_service_catalog", "service_id=eq.601", {
      stripe_product_id: voiceVibeProdId,
    });
    log.push(`Fixed 601 Voice & Vibe™: prod=${voiceVibeProdId} monthly=${vvMonthlyId} setup=${vvSetupId}`);

    // ─────────────────────────────────────────────
    // CREATE: 1001 Socialutely Circle™
    // ─────────────────────────────────────────────
    const circleName = "Socialutely Circle™";
    let circleProd = allProducts.find(p => p.name === circleName);
    if (!circleProd) {
      circleProd = await stripePost(STRIPE_SECRET_KEY, "/v1/products", { name: circleName }) as StripeProduct;
      log.push(`Created Socialutely Circle™ product: ${circleProd.id}`);
    } else {
      log.push(`Found existing Socialutely Circle™: ${circleProd.id}`);
    }
    const { monthly: c1Monthly, oneTime: c1Setup } = await getPricesForProduct(STRIPE_SECRET_KEY, circleProd.id, allPricesActive);
    let c1MonthlyId = c1Monthly?.id ?? null;
    let c1SetupId = c1Setup?.id ?? null;
    if (!c1MonthlyId) {
      const p = await createPrice(STRIPE_SECRET_KEY, circleProd.id, 299700, "recurring");
      c1MonthlyId = p.id;
    }
    if (!c1SetupId) {
      const p = await createPrice(STRIPE_SECRET_KEY, circleProd.id, 149700, "one_time");
      c1SetupId = p.id;
    }
    // Check if row exists in layer4
    const check1001Res = await fetch(`${SUPABASE_URL}/rest/v1/layer4_revenue_logic?service_id=eq.1001`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    });
    const check1001 = await check1001Res.json() as unknown[];
    if (check1001.length > 0) {
      await sbPatch(SUPABASE_URL, SERVICE_KEY, "layer4_revenue_logic", "service_id=eq.1001", {
        service_name: "Socialutely Circle™",
        stripe_product_id: circleProd.id,
        stripe_monthly_price_id: c1MonthlyId,
        stripe_setup_price_id: c1SetupId,
      });
    } else {
      await sbInsert(SUPABASE_URL, SERVICE_KEY, "layer4_revenue_logic", {
        service_id: "1001",
        service_name: "Socialutely Circle™",
        stripe_product_id: circleProd.id,
        stripe_monthly_price_id: c1MonthlyId,
        stripe_setup_price_id: c1SetupId,
      });
    }
    await sbPatch(SUPABASE_URL, SERVICE_KEY, "layer1_service_catalog", "service_id=eq.1001", {
      stripe_product_id: circleProd.id,
    });
    log.push(`Upserted 1001 Socialutely Circle™: prod=${circleProd.id} monthly=${c1MonthlyId} setup=${c1SetupId}`);

    // ─────────────────────────────────────────────
    // FIX: 1002 Momentum Vault™ — currently has archived product, create proper one
    // ─────────────────────────────────────────────
    const vaultName = "Momentum Vault™";
    // Find if there's a non-archived product with this name
    let vaultProd = allProducts.find(p => p.name === vaultName && p.id !== "prod_UEAhXJZQ8P7id8");
    if (!vaultProd) {
      vaultProd = await stripePost(STRIPE_SECRET_KEY, "/v1/products", { name: vaultName }) as StripeProduct;
      log.push(`Created Momentum Vault™ product: ${vaultProd.id}`);
    } else {
      log.push(`Found existing Momentum Vault™: ${vaultProd.id}`);
    }
    const { monthly: mvMonthly, oneTime: mvSetup } = await getPricesForProduct(STRIPE_SECRET_KEY, vaultProd.id, allPricesActive);
    let mvMonthlyId = mvMonthly?.id ?? null;
    let mvSetupId = mvSetup?.id ?? null;
    if (!mvMonthlyId) {
      const p = await createPrice(STRIPE_SECRET_KEY, vaultProd.id, 199700, "recurring");
      mvMonthlyId = p.id;
    }
    if (!mvSetupId) {
      const p = await createPrice(STRIPE_SECRET_KEY, vaultProd.id, 99700, "one_time");
      mvSetupId = p.id;
    }
    await sbPatch(SUPABASE_URL, SERVICE_KEY, "layer4_revenue_logic", "service_id=eq.1002", {
      service_name: "Momentum Vault™",
      stripe_product_id: vaultProd.id,
      stripe_monthly_price_id: mvMonthlyId,
      stripe_setup_price_id: mvSetupId,
    });
    await sbPatch(SUPABASE_URL, SERVICE_KEY, "layer1_service_catalog", "service_id=eq.1002", {
      stripe_product_id: vaultProd.id,
    });
    log.push(`Fixed 1002 Momentum Vault™: prod=${vaultProd.id} monthly=${mvMonthlyId} setup=${mvSetupId}`);

    // ─────────────────────────────────────────────
    // CREATE: 1003 Concierge Access™
    // ─────────────────────────────────────────────
    const conciergeName = "Concierge Access™";
    let conciergeProd = allProducts.find(p => p.name === conciergeName);
    if (!conciergeProd) {
      conciergeProd = await stripePost(STRIPE_SECRET_KEY, "/v1/products", { name: conciergeName }) as StripeProduct;
      log.push(`Created Concierge Access™ product: ${conciergeProd.id}`);
    } else {
      log.push(`Found existing Concierge Access™: ${conciergeProd.id}`);
    }
    const { monthly: caMonthly, oneTime: caSetup } = await getPricesForProduct(STRIPE_SECRET_KEY, conciergeProd.id, allPricesActive);
    let caMonthlyId = caMonthly?.id ?? null;
    let caSetupId = caSetup?.id ?? null;
    if (!caMonthlyId) {
      const p = await createPrice(STRIPE_SECRET_KEY, conciergeProd.id, 499700, "recurring");
      caMonthlyId = p.id;
    }
    if (!caSetupId) {
      const p = await createPrice(STRIPE_SECRET_KEY, conciergeProd.id, 249700, "one_time");
      caSetupId = p.id;
    }
    const check1003Res = await fetch(`${SUPABASE_URL}/rest/v1/layer4_revenue_logic?service_id=eq.1003`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    });
    const check1003 = await check1003Res.json() as unknown[];
    if (check1003.length > 0) {
      await sbPatch(SUPABASE_URL, SERVICE_KEY, "layer4_revenue_logic", "service_id=eq.1003", {
        service_name: "Concierge Access™",
        stripe_product_id: conciergeProd.id,
        stripe_monthly_price_id: caMonthlyId,
        stripe_setup_price_id: caSetupId,
      });
    } else {
      await sbInsert(SUPABASE_URL, SERVICE_KEY, "layer4_revenue_logic", {
        service_id: "1003",
        service_name: "Concierge Access™",
        stripe_product_id: conciergeProd.id,
        stripe_monthly_price_id: caMonthlyId,
        stripe_setup_price_id: caSetupId,
      });
    }
    await sbPatch(SUPABASE_URL, SERVICE_KEY, "layer1_service_catalog", "service_id=eq.1003", {
      stripe_product_id: conciergeProd.id,
    });
    log.push(`Upserted 1003 Concierge Access™: prod=${conciergeProd.id} monthly=${caMonthlyId} setup=${caSetupId}`);

    // ─────────────────────────────────────────────
    // POPULATE: Pricing metadata for all services
    // ─────────────────────────────────────────────
    log.push("Populating pricing metadata for all services...");
    for (const [serviceIdStr, pricing] of Object.entries(PRICING_DATA)) {
      const serviceId = serviceIdStr;
      await sbPatch(SUPABASE_URL, SERVICE_KEY, "layer4_revenue_logic", `service_id=eq.${serviceId}`, {
        pricing_tier: pricing.tier,
        retail_price_low: pricing.priceLow,
        retail_price_high: pricing.priceHigh,
        retail_unit: "month",
        billing_frequency: "monthly",
      });
    }
    log.push(`Populated pricing metadata for ${Object.keys(PRICING_DATA).length} services`);

    // ─────────────────────────────────────────────
    // MIRROR: stripe_product_id to layer1_service_catalog for all mapped services
    // ─────────────────────────────────────────────
    log.push("Mirroring stripe_product_ids to layer1_service_catalog...");
    const l4Res = await fetch(`${SUPABASE_URL}/rest/v1/layer4_revenue_logic?select=service_id,stripe_product_id`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    });
    const l4Rows = await l4Res.json() as Array<{ service_id: string; stripe_product_id: string | null }>;
    for (const row of l4Rows) {
      if (row.stripe_product_id) {
        await sbPatch(SUPABASE_URL, SERVICE_KEY, "layer1_service_catalog", `service_id=eq.${row.service_id}`, {
          stripe_product_id: row.stripe_product_id,
        }).catch(() => { /* ok if row doesn't exist in l1 */ });
      }
    }
    log.push(`Mirrored ${l4Rows.filter(r => r.stripe_product_id).length} product IDs to layer1`);

    return new Response(JSON.stringify({ success: true, log, errors }), { status: 200, headers: CORS });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(msg);
    return new Response(JSON.stringify({ success: false, log, errors }), { status: 500, headers: CORS });
  }
});
