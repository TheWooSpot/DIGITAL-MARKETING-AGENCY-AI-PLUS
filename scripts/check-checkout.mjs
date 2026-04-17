import https from 'https';

const SUPABASE_URL = 'aagggflwhadxjjhcaohc.supabase.co';
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function get(path) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: SUPABASE_URL,
      path,
      method: 'GET',
      headers: {
        apikey: KEY,
        Authorization: `Bearer ${KEY}`,
      },
    }, res => {
      let b = '';
      res.on('data', d => b += d);
      res.on('end', () => resolve({ status: res.statusCode, body: b }));
    });
    req.on('error', reject);
    req.end();
  });
}

const cfg = await get('/rest/v1/checkout_config?select=*');
console.log('\n=== checkout_config ===');
console.log('Status:', cfg.status);
console.log('Rows:', cfg.body);

const svc = await get('/rest/v1/layer4_revenue_logic?select=service_id,stripe_monthly_price_id,stripe_setup_price_id&limit=10');
console.log('\n=== layer4_revenue_logic (first 10) ===');
console.log('Status:', svc.status);
try {
  const rows = JSON.parse(svc.body);
  if (Array.isArray(rows)) {
    rows.forEach(r => console.log(`  service_id=${r.service_id} monthly=${r.stripe_monthly_price_id ?? 'NULL'} setup=${r.stripe_setup_price_id ?? 'NULL'}`));
    console.log(`  Total rows shown: ${rows.length}`);
  } else {
    console.log('Unexpected response:', svc.body);
  }
} catch { console.log('Raw:', svc.body); }
