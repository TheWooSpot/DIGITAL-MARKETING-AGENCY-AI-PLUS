const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
};

type RequestBody = {
  prospect_id?: string;
  selected_services?: number[];
  company_size?: string;
};

type ServiceStripeRow = {
  service_id: string;
  stripe_monthly_price_id: string | null;
  stripe_setup_price_id: string | null;
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

function normalizeServiceIds(input: unknown): number[] {
  if (!Array.isArray(input)) return [];
  const out = new Set<number>();
  for (const raw of input) {
    const n = Number(raw);
    if (Number.isFinite(n)) out.add(Math.trunc(n));
  }
  return Array.from(out);
}

function discountPercent(count: number): number {
  if (count >= 5) return 15;
  if (count >= 3) return 8;
  return 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
  const SITE_URL = Deno.env.get("SITE_URL") ?? "https://socialutely-any-door-engine.vercel.app";

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return json({ error: "Missing Supabase secrets" }, 500);
  if (!STRIPE_SECRET_KEY) return json({ error: "Missing STRIPE_SECRET_KEY" }, 500);

  try {

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const prospectId = String(body.prospect_id ?? "").trim();
  const serviceIds = normalizeServiceIds(body.selected_services);
  const companySize = String(body.company_size ?? "").trim();

  if (!prospectId) return json({ error: "Missing prospect_id" }, 400);
  if (serviceIds.length === 0) return json({ error: "selected_services must include at least one service id" }, 400);

  const sbHeaders = {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  };

  // Always use dynamic Stripe Checkout session creation to keep checkout pricing
  // consistent with the selected service set and avoid variant fallback drift.

  const inList = serviceIds.join(",");
  const svcRes = await fetch(
    `${SUPABASE_URL}/rest/v1/layer4_revenue_logic?service_id=in.(${inList})&select=service_id,stripe_monthly_price_id,stripe_setup_price_id`,
    { headers: sbHeaders }
  );
  if (!svcRes.ok) return json({ error: "Failed to read layer4_revenue_logic", detail: await svcRes.text() }, 500);
  const svcRows = (await svcRes.json()) as ServiceStripeRow[];
  const byId = new Map(svcRows.map((r) => [String(r.service_id), r]));

  const missing: number[] = [];
  const monthlyLineItems: Array<{ price: string; quantity: number }> = [];
  const setupInvoiceItems: Array<{ price: string; quantity: number }> = [];

  for (const sid of serviceIds) {
    const row = byId.get(String(sid));
    if (!row?.stripe_monthly_price_id || !row?.stripe_setup_price_id) {
      missing.push(sid);
      continue;
    }
    monthlyLineItems.push({ price: row.stripe_monthly_price_id, quantity: 1 });
    setupInvoiceItems.push({ price: row.stripe_setup_price_id, quantity: 1 });
  }

  if (missing.length > 0) return json({ error: "Missing Stripe IDs for selected services", missing_service_ids: missing }, 400);

  const stripe = new (await import("npm:stripe@16.12.0")).default(STRIPE_SECRET_KEY, {
    apiVersion: "2024-06-20",
  });

  const pct = discountPercent(serviceIds.length);
  let discounts: Array<{ coupon: string }> | undefined = undefined;
  if (pct > 0) {
    const couponId = pct === 15 ? "bundle_5plus_15_off" : "bundle_3to4_8_off";
    try {
      await stripe.coupons.retrieve(couponId);
    } catch {
      await stripe.coupons.create({
        id: couponId,
        name: pct === 15 ? "Bundle 5+ services" : "Bundle 3-4 services",
        percent_off: pct,
        duration: "forever",
      });
    }
    discounts = [{ coupon: couponId }];
  }

  const successUrl = `${SITE_URL.replace(/\/$/, "")}/thank-you?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${SITE_URL.replace(/\/$/, "")}/your-package?checkout=cancelled`;

  // One-time setup fees go in line_items alongside recurring items.
  // subscription_data.add_invoice_items was removed in newer Stripe API versions.
  const allLineItems = [
    ...monthlyLineItems,
    ...setupInvoiceItems,
  ];

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: allLineItems,
    ...(discounts ? { discounts } : {}),
    subscription_data: {
      metadata: {
        prospect_id: prospectId,
        company_size: companySize || "unknown",
        selected_services: serviceIds.join(","),
      },
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      prospect_id: prospectId,
      company_size: companySize || "unknown",
      selected_services: serviceIds.join(","),
    },
  });

  const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/layer5_prospects?id=eq.${encodeURIComponent(prospectId)}`, {
    method: "PATCH",
    headers: {
      ...sbHeaders,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ checkout_variant: "A" }),
  });
  if (!updateRes.ok) {
    return json({
      error: "Checkout session created but failed to update prospect checkout_variant",
      session_url: session.url,
      detail: await updateRes.text(),
    }, 500);
  }

  return json({ session_url: session.url });
} catch (err: unknown) {
  console.error("create-checkout-session error:", err);
  const stripeErr = err as { type?: string; code?: string; message?: string };
  if (stripeErr?.type?.startsWith("Stripe")) {
    return json({
      error: "Stripe checkout session failed",
      stripe_error: stripeErr.message ?? "Unknown Stripe error",
      stripe_type: stripeErr.type,
      stripe_code: stripeErr.code,
    }, 500);
  }
  return json({ error: err instanceof Error ? err.message : String(err) }, 500);
}
});

