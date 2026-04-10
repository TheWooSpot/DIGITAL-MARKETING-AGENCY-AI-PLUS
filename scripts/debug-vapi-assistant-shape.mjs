/**
 * Print assistant model shape (no secrets). VAPI_TOKEN required.
 *   node --env-file=.env scripts/debug-vapi-assistant-shape.mjs [assistantId]
 */
const VAPI_API = "https://api.vapi.ai";
const id = process.argv[2] || "e48ee900-bfb0-4ee6-a645-e89a08233365";

async function main() {
  const token = (process.env.VAPI_TOKEN || process.env.VAPI_API_KEY)?.trim();
  if (!token) {
    console.error("Set VAPI_TOKEN");
    process.exit(1);
  }
  const res = await fetch(`${VAPI_API}/assistant/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const j = await res.json();
  if (!res.ok) {
    console.error(res.status, j);
    process.exit(1);
  }
  console.log("top keys:", Object.keys(j));
  console.log("has instructions:", typeof j.instructions, j.instructions?.length ?? 0);
  const m = j.model;
  console.log("model keys:", m ? Object.keys(m) : null);
  if (m?.messages?.length) {
    m.messages.forEach((msg, i) => {
      const c = msg.content;
      const len = typeof c === "string" ? c.length : JSON.stringify(c).length;
      const breaks = typeof c === "string" ? (c.match(/<break\b/gi) || []).length : 0;
      const lts = typeof c === "string" ? (c.match(/</g) || []).length : 0;
      console.log(`messages[${i}] role=${msg.role} contentLen=${len} <break count=${breaks} < count=${lts}`);
      if (typeof c === "string" && breaks) {
        const sample = c.match(/<break[^>]{0,80}/gi);
        console.log("  break samples:", sample?.slice(0, 3));
      }
    });
  } else {
    console.log("no model.messages");
  }

  function scan(label, s) {
    if (typeof s !== "string") {
      console.log(`${label}:`, typeof s);
      return;
    }
    const breaks = (s.match(/<break\b/gi) || []).length;
    const lts = (s.match(/</g) || []).length;
    console.log(`${label}: len=${s.length} <break=${breaks} < count=${lts}`);
  }
  scan("firstMessage", j.firstMessage);
  scan("endCallMessage", j.endCallMessage);

  const raw = JSON.stringify(j);
  const br = /<break[^>]*/gi;
  const breakMatches = raw.match(br);
  console.log("<break...> tags in full JSON:", breakMatches ? breakMatches.length : 0);
  if (breakMatches?.length) console.log("samples:", breakMatches.slice(0, 5));
}

main().catch(console.error);
