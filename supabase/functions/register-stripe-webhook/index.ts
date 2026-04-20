/**
 * register-stripe-webhook — one-shot function.
 * Checks if the stripe-conversion-webhook endpoint is already registered in Stripe,
 * and creates it if not. Returns the webhook details.
 */

const CORS = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };

const WEBHOOK_URL = "https://aagggflwhadxjjhcaohc.supabase.co/functions/v1/stripe-conversion-webhook";
const ENABLED_EVENTS = ["payment_intent.succeeded", "checkout.session.completed"];

async function stripeGet(key: string, path: string) {
  const res = await fetch(`https://api.stripe.com${path}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Stripe GET ${path}: ${JSON.stringify(data)}`);
  return data as Record<string, unknown>;
}

async function stripePost(key: string, path: string, params: Record<string, unknown>) {
  const encode = (k: string, v: unknown): string[] => {
    if (Array.isArray(v)) return v.flatMap((item, i) => encode(`${k}[${i}]`, item));
    return [`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`];
  };
  const body = Object.entries(params).flatMap(([k, v]) => encode(k, v)).join("&");
  const res = await fetch(`https://api.stripe.com${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Stripe POST ${path}: ${JSON.stringify(data)}`);
  return data as Record<string, unknown>;
}

Deno.serve(async () => {
  const STRIPE_KEY = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
  if (!STRIPE_KEY) return new Response(JSON.stringify({ error: "Missing STRIPE_SECRET_KEY" }), { status: 500, headers: CORS });

  try {
    // List existing webhook endpoints
    const webhooks = await stripeGet(STRIPE_KEY, "/v1/webhook_endpoints?limit=100") as {
      data: Array<{ id: string; url: string; status: string; enabled_events: string[] }>;
    };

    const existing = webhooks.data.find(w => w.url === WEBHOOK_URL);

    if (existing) {
      return new Response(JSON.stringify({
        action: "already_registered",
        webhook_id: existing.id,
        url: existing.url,
        status: existing.status,
        enabled_events: existing.enabled_events,
        note: "Webhook already exists. Check STRIPE_WEBHOOK_SECRET in Supabase Edge Secrets matches the signing secret for this webhook ID.",
      }), { status: 200, headers: CORS });
    }

    // Create the webhook endpoint
    const created = await stripePost(STRIPE_KEY, "/v1/webhook_endpoints", {
      url: WEBHOOK_URL,
      enabled_events: ENABLED_EVENTS,
      description: "Socialutely AnyDoor Engine — conversion tracking",
    });

    return new Response(JSON.stringify({
      action: "created",
      webhook_id: created.id,
      url: created.url,
      status: created.status,
      enabled_events: created.enabled_events,
      secret: created.secret,
      warning: "IMPORTANT: Copy the 'secret' value above and set it as STRIPE_WEBHOOK_SECRET in Supabase Edge Function secrets (Dashboard → Edge Functions → Secrets). This is the only time the secret is shown.",
    }), { status: 200, headers: CORS });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: CORS });
  }
});
