import https from 'https';

const ASSISTANT_ID = 'afec7622-84c3-418d-b4c6-9d35653d6bc5';

const getReq = https.request({
  hostname: 'api.vapi.ai',
  path: `/assistant/${ASSISTANT_ID}`,
  method: 'GET',
  headers: { 'Authorization': `Bearer ${process.env.VAPI_TOKEN}` }
}, res => {
  let b = '';
  res.on('data', d => b += d);
  res.on('end', () => {
    const current = JSON.parse(b);
    const currentPrompt = current.model?.messages?.[0]?.content || '';

    // Replace all Spuds references
    const updatedPrompt = currentPrompt
      .replace(/\bSpuds\b/g, 'Mr. Mackleberry')
      .replace(/\bspuds\b/g, 'Mr. Mackleberry');

    console.log('Current name:', current.name);
    console.log('Spuds occurrences in prompt:', (currentPrompt.match(/\bSpuds\b/gi) || []).length);

    const patchData = JSON.stringify({
      name: 'Mr. Mackleberry — Partner Briefs',
      model: {
        provider: 'anthropic',
        model: 'claude-sonnet-4-20250514',
        temperature: 0.55,
        messages: [{ role: 'system', content: updatedPrompt }]
      }
    });

    const patchReq = https.request({
      hostname: 'api.vapi.ai',
      path: `/assistant/${ASSISTANT_ID}`,
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${process.env.VAPI_TOKEN}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(patchData)
      }
    }, res2 => {
      let b2 = '';
      res2.on('data', d => b2 += d);
      res2.on('end', () => {
        const r = JSON.parse(b2);
        console.log('Status:', res2.statusCode);
        console.log('Name:', r.name);
        console.log('Done');
      });
    });
    patchReq.write(patchData);
    patchReq.end();
  });
});
getReq.end();
