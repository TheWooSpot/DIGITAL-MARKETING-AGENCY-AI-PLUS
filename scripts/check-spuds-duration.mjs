/**
 * GET Spuds assistant → log maxDurationSeconds & silenceTimeoutSeconds → PATCH max if needed.
 * Usage: VAPI_TOKEN=... node scripts/check-spuds-duration.mjs
 */
import https from "https";

const ASSISTANT_ID = "afec7622-84c3-418d-b4c6-9d35653d6bc5";
const TARGET_MAX = 1500;

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: "api.vapi.ai",
      path,
      method,
      headers: {
        Authorization: `Bearer ${process.env.VAPI_TOKEN}`,
        "Content-Type": "application/json",
      },
    };
    if (body != null) {
      const buf = Buffer.from(body, "utf8");
      opts.headers["Content-Length"] = buf.length;
    }
    const req = https.request(opts, (res) => {
      let b = "";
      res.on("data", (d) => (b += d));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(b) });
        } catch {
          resolve({ status: res.statusCode, body: b });
        }
      });
    });
    req.on("error", reject);
    if (body != null) req.write(body);
    req.end();
  });
}

async function main() {
  if (!process.env.VAPI_TOKEN?.trim()) {
    console.error("Set VAPI_TOKEN in the environment.");
    process.exit(1);
  }

  const getRes = await request("GET", `/assistant/${ASSISTANT_ID}`, null);
  if (getRes.status !== 200) {
    console.error("GET failed:", getRes.status, getRes.body);
    process.exit(1);
  }

  const a = getRes.body;
  const max = a.maxDurationSeconds;
  const silence = a.silenceTimeoutSeconds;

  console.log("maxDurationSeconds:", max);
  console.log("silenceTimeoutSeconds:", silence);

  if (max === TARGET_MAX) {
    console.log(`maxDurationSeconds is already ${TARGET_MAX} — no PATCH needed.`);
    return;
  }

  console.log(`PATCHing maxDurationSeconds from ${max} → ${TARGET_MAX}...`);
  const patchRes = await request(
    "PATCH",
    `/assistant/${ASSISTANT_ID}`,
    JSON.stringify({ maxDurationSeconds: TARGET_MAX })
  );

  if (patchRes.status !== 200) {
    console.error("PATCH failed:", patchRes.status, patchRes.body);
    process.exit(1);
  }

  console.log("PATCH status:", patchRes.status);
  console.log("maxDurationSeconds is now:", patchRes.body.maxDurationSeconds);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
