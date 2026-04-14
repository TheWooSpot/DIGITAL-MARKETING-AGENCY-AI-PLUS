import https from 'https';

const firstMessage =
  'Well, well, well \u2014 pull up a chair, {{partner_name}}. Glad you made it. I am Spuds. I was asked to reach out to share more about the good stuff being built and learn about the ways we can collaborate. My plan is to share a general outline of the program as it is now. I would like to ask for your reflection at times \u2014 your perspective matters, as there are many directions the program can go. With that said, we can begin now if you are ready.';

const data = JSON.stringify({ firstMessage });

const req = https.request(
  {
    hostname: 'api.vapi.ai',
    path: '/assistant/afec7622-84c3-418d-b4c6-9d35653d6bc5',
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${process.env.VAPI_TOKEN}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data),
    },
  },
  (res) => {
    let b = '';
    res.on('data', (d) => (b += d));
    res.on('end', () => {
      const r = JSON.parse(b);
      console.log('status:', res.statusCode);
      console.log('firstMessage:', r.firstMessage);
      if (r.message) console.log('error:', r.message);
    });
  }
);
req.write(data);
req.end();
