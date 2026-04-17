import https from 'https';

const ASSISTANT_ID = 'e48ee900-bfb0-4ee6-a645-e89a08233365';
const TOKEN = process.env.VAPI_TOKEN;

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.vapi.ai',
      path,
      method,
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
    }, res => {
      let b = '';
      res.on('data', d => b += d);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(b) }));
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

console.log('Fetching Jordan assistant...');
const { status, body: r } = await request('GET', `/assistant/${ASSISTANT_ID}`);
console.log('HTTP status:', status);
console.log('maxDurationSeconds:', r.maxDurationSeconds);
console.log('silenceTimeoutSeconds:', r.silenceTimeoutSeconds);
console.log('endCallMessage:', r.endCallMessage);

const patches = {};
if (!r.maxDurationSeconds || r.maxDurationSeconds < 600) {
  patches.maxDurationSeconds = 900;
  console.log(`\nmaxDurationSeconds is ${r.maxDurationSeconds ?? 'unset'} — patching to 900`);
} else {
  console.log(`\nmaxDurationSeconds OK (${r.maxDurationSeconds})`);
}

if (!r.silenceTimeoutSeconds || r.silenceTimeoutSeconds < 30) {
  patches.silenceTimeoutSeconds = 45;
  console.log(`silenceTimeoutSeconds is ${r.silenceTimeoutSeconds ?? 'unset'} — patching to 45`);
} else {
  console.log(`silenceTimeoutSeconds OK (${r.silenceTimeoutSeconds})`);
}

if (Object.keys(patches).length > 0) {
  console.log('\nPatching assistant with:', patches);
  const { status: pStatus, body: pBody } = await request('PATCH', `/assistant/${ASSISTANT_ID}`, patches);
  console.log('PATCH status:', pStatus);
  console.log('Updated maxDurationSeconds:', pBody.maxDurationSeconds);
  console.log('Updated silenceTimeoutSeconds:', pBody.silenceTimeoutSeconds);
} else {
  console.log('\nNo patches needed.');
}
