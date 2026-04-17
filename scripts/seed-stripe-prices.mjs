/**
 * seed-stripe-prices.mjs
 *
 * Fetches all active Stripe products + prices, matches them to the
 * SERVICE_MAP by name, then upserts into layer4_revenue_logic.
 *
 * Requires env vars:
 *   STRIPE_SECRET_KEY  — from Supabase secrets
 *   SUPABASE_SERVICE_KEY — from .env (SUPABASE_SERVICE_KEY)
 */

import https from 'https';

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
const SUPABASE_URL = 'aagggflwhadxjjhcaohc.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!STRIPE_KEY) { console.error('Missing STRIPE_SECRET_KEY'); process.exit(1); }
if (!SUPABASE_KEY) { console.error('Missing SUPABASE_SERVICE_KEY'); process.exit(1); }

// --- Canonical service map (mirrors diagnosticCatalog.ts) ---
const SERVICE_MAP = {
  101: 'SearchLift™ SBO Engine',
  102: 'SpotLight Direct™ Media Engine',
  103: 'Authority Amplifier™ PR System',
  104: 'Signal Surge™ Paid Traffic Lab',
  105: 'NearRank™ Local Discovery Engine',
  106: 'AutoRank™ Search Box Optimizer',
  201: 'VoiceBridge™ AI ChatLabs',
  202: 'InboxIgnite™ Smart Email Engine',
  203: 'TextPulse™ SMS Automation',
  503: 'Adaptation™ AI Readiness Rung 2',
  301: 'BookStream™ Smart Scheduling Hub',
  302: 'CloseCraft™ Funnel Builder',
  303: 'DealDrive™ Proposal Automation',
  304: 'PayNamic™ Dynamic Checkout Engine',
  401: 'HubAI™ CRM Architecture',
  402: 'FlowForge™ Automation Lab',
  403: 'CommandDesk™ Client Portal System',
  501: 'SkillSprint™ Workshop Academy',
  502: 'Onboardly™ Client Activation System',
  601: 'Voice & Vibe™ Production Engine',
  602: 'StoryFrame™ Brand Narrative Suite',
  701: 'InsightLoop™ Analytics Dashboard',
  801: 'TrustGuard™ Governance Layer',
  802: 'ReputationStack™ Reviews Engine',
  901: 'AllianceOS™ Growth Partnerships Engine',
  1001: 'Socialutely Circle™',
  1002: 'Momentum Vault™',
  1003: 'Concierge Access™',
  1004: 'AI Maturity Diagnostic & Blueprint™',
};

// Normalise a string for fuzzy matching
function norm(s) {
  return s
    .toLowerCase()
    .replace(/[™®©]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// --- Stripe helpers ---
function stripeGet(path) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.stripe.com',
      path,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${STRIPE_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }, res => {
      let b = ''; res.on('data', d => b += d);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(b) }));
    });
    req.on('error', reject); req.end();
  });
}

async function stripePaginate(endpoint) {
  const items = [];
  let url = `${endpoint}${endpoint.includes('?') ? '&' : '?'}limit=100`;
  while (url) {
    const { status, body } = await stripeGet(url.replace('https://api.stripe.com', ''));
    if (status !== 200) { console.error(`Stripe error ${status}:`, JSON.stringify(body)); break; }
    items.push(...body.data);
    url = body.has_more && body.data.length > 0
      ? `${endpoint}${endpoint.includes('?') ? '&' : '?'}limit=100&starting_after=${body.data[body.data.length - 1].id}`
      : null;
  }
  return items;
}

// --- Supabase helpers ---
function supabaseRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: SUPABASE_URL,
      path,
      method,
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation,resolution=merge-duplicates',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    }, res => {
      let b = ''; res.on('data', d => b += d);
      res.on('end', () => resolve({ status: res.statusCode, body: b }));
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

// -----------------------------------------------------------------------
console.log('Fetching Stripe products...');
const products = await stripePaginate('/v1/products?active=true');
console.log(`  Found ${products.length} active products`);

console.log('Fetching Stripe prices...');
const prices = await stripePaginate('/v1/prices?active=true');
console.log(`  Found ${prices.length} active prices`);

// List all products for visibility
console.log('\nAll Stripe products:');
products.forEach(p => console.log(`  [${p.id}] ${p.name}`));

// Group prices by product
const pricesByProduct = {};
for (const price of prices) {
  const pid = typeof price.product === 'string' ? price.product : price.product?.id;
  if (!pid) continue;
  if (!pricesByProduct[pid]) pricesByProduct[pid] = [];
  pricesByProduct[pid].push(price);
}

// Match Stripe products to SERVICE_MAP
const matches = [];
const unmatched = [];

for (const product of products) {
  const productNorm = norm(product.name);

  // Try exact then partial match against service names
  let matchedId = null;

  // 1. Check product metadata for service_id
  if (product.metadata?.service_id) {
    const sid = parseInt(product.metadata.service_id, 10);
    if (SERVICE_MAP[sid]) { matchedId = sid; }
  }

  // 2. Exact normalised name match
  if (!matchedId) {
    for (const [id, name] of Object.entries(SERVICE_MAP)) {
      if (norm(name) === productNorm) { matchedId = parseInt(id, 10); break; }
    }
  }

  // 3. Partial match — product name contains service name keyword or vice versa
  if (!matchedId) {
    for (const [id, name] of Object.entries(SERVICE_MAP)) {
      const sn = norm(name).split(' ')[0]; // first word as anchor
      if (productNorm.includes(sn) || sn.includes(productNorm.split(' ')[0])) {
        matchedId = parseInt(id, 10);
        break;
      }
    }
  }

  const productPrices = pricesByProduct[product.id] || [];
  const monthly = productPrices.find(p => p.type === 'recurring' && p.recurring?.interval === 'month');
  const oneTime = productPrices.find(p => p.type === 'one_time');

  if (matchedId) {
    matches.push({
      service_id: matchedId,
      service_name: SERVICE_MAP[matchedId],
      stripe_product_id: product.id,
      stripe_monthly_price_id: monthly?.id ?? null,
      stripe_setup_price_id: oneTime?.id ?? null,
    });
  } else {
    unmatched.push({ name: product.name, id: product.id, prices: productPrices.length });
  }
}

console.log(`\nMatched: ${matches.length} services`);
if (unmatched.length > 0) {
  console.log(`Unmatched Stripe products (${unmatched.length}):`);
  unmatched.forEach(u => console.log(`  - "${u.name}" [${u.id}] (${u.prices} prices)`));
}

if (matches.length === 0) {
  console.log('\nNo matches found — nothing to insert.');
  console.log('This means Stripe product names do not match the service catalog names.');
  console.log('You need to either:');
  console.log('  a) Name Stripe products to match SERVICE_MAP names exactly, OR');
  console.log('  b) Add metadata.service_id to each Stripe product');
  process.exit(0);
}

console.log('\nMatched rows to upsert:');
matches.forEach(m => console.log(
  `  service_id=${m.service_id} | "${m.service_name}"\n` +
  `    product=${m.stripe_product_id}\n` +
  `    monthly=${m.stripe_monthly_price_id ?? 'MISSING'}\n` +
  `    setup=${m.stripe_setup_price_id ?? 'MISSING'}`
));

// Upsert into layer4_revenue_logic
console.log(`\nUpserting ${matches.length} rows into layer4_revenue_logic...`);
const { status, body } = await supabaseRequest(
  'POST',
  '/rest/v1/layer4_revenue_logic?on_conflict=service_id',
  matches
);

console.log('Supabase status:', status);
if (status === 200 || status === 201) {
  let rows;
  try { rows = JSON.parse(body); } catch { rows = []; }
  console.log(`✓ Upserted ${Array.isArray(rows) ? rows.length : '?'} rows`);
} else {
  console.error('Supabase error:', body.substring(0, 500));
}
