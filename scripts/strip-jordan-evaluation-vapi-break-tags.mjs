/**
 * Remove SSML <break time="…"/> tags from Jordan (Evaluation Specialist) Vapi assistant
 * — they are read aloud by TTS. Cleans model.messages[] and firstMessage / endCallMessage.
 *
 *   node --env-file=.env scripts/strip-jordan-evaluation-vapi-break-tags.mjs
 *
 * Uses VAPI_TOKEN or VAPI_API_KEY (private key) — never commit keys.
 */
const ASSISTANT_ID = "e48ee900-bfb0-4ee6-a645-e89a08233365";
const VAPI_API = "https://api.vapi.ai";

/** Matches SSML break elements (self-closing or not). */
const BREAK_TAG_RE = /<break\s[^>]*\/?>/gi;

function stripBreakTags(text) {
  if (typeof text !== "string") return text;
  return text.replace(BREAK_TAG_RE, "");
}

function countBreakTags(text) {
  if (typeof text !== "string") return 0;
  return (text.match(/<break\b/gi) || []).length;
}

async function main() {
  const token = (process.env.VAPI_TOKEN || process.env.VAPI_API_KEY)?.trim();
  if (!token) {
    console.error("Set VAPI_TOKEN or VAPI_API_KEY to your Vapi private API key.");
    process.exit(1);
  }

  const uri = `${VAPI_API}/assistant/${ASSISTANT_ID}`;
  const h = { Authorization: `Bearer ${token}` };

  const getRes = await fetch(uri, { headers: h });
  if (!getRes.ok) {
    console.error("GET failed", getRes.status, await getRes.text());
    process.exit(1);
  }

  const assistant = await getRes.json();
  const m = assistant.model;
  if (!m?.messages?.length) {
    console.error("Unexpected assistant shape: missing model.messages");
    process.exit(1);
  }

  let totalRemoved = 0;
  const newMsgs = JSON.parse(JSON.stringify(m.messages));
  for (let i = 0; i < newMsgs.length; i++) {
    const msg = newMsgs[i];
    if (typeof msg.content !== "string") continue;
    const before = countBreakTags(msg.content);
    if (before) {
      newMsgs[i] = { ...msg, content: stripBreakTags(msg.content) };
      totalRemoved += before;
    }
  }

  let newFirst = assistant.firstMessage;
  let newEnd = assistant.endCallMessage;
  if (typeof newFirst === "string" && countBreakTags(newFirst)) {
    newFirst = stripBreakTags(newFirst);
    totalRemoved += countBreakTags(assistant.firstMessage);
  }
  if (typeof newEnd === "string" && countBreakTags(newEnd)) {
    newEnd = stripBreakTags(newEnd);
    totalRemoved += countBreakTags(assistant.endCallMessage);
  }

  if (totalRemoved === 0) {
    console.log("No <break> tags found in model.messages, firstMessage, or endCallMessage — nothing to PATCH.");
    const sys = newMsgs.find((x) => x.role === "system") ?? newMsgs[0];
    const c = typeof sys?.content === "string" ? sys.content : "";
    console.log("Verification: <break> in system content:", countBreakTags(c));
    console.log("Verification: total '<' in system content:", (c.match(/</g) || []).length);
    process.exit(0);
  }

  console.log(`Removing ${totalRemoved} <break> tag occurrence(s).`);

  const patchBody = {
    model: {
      provider: m.provider,
      model: m.model,
      messages: newMsgs,
      ...(m.maxTokens != null ? { maxTokens: m.maxTokens } : {}),
      ...(m.temperature != null ? { temperature: m.temperature } : {}),
    },
    ...(typeof newFirst === "string" ? { firstMessage: newFirst } : {}),
    ...(typeof newEnd === "string" ? { endCallMessage: newEnd } : {}),
  };

  const patchRes = await fetch(uri, {
    method: "PATCH",
    headers: {
      ...h,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(patchBody),
  });

  const text = await patchRes.text();
  if (!patchRes.ok) {
    console.error("PATCH failed", patchRes.status, text);
    process.exit(1);
  }

  let updated;
  try {
    updated = JSON.parse(text);
  } catch {
    console.error("PATCH returned non-JSON:", text.slice(0, 500));
    process.exit(1);
  }

  const verify = (label, s) => {
    if (typeof s !== "string") return;
    const breaks = countBreakTags(s);
    const lts = (s.match(/</g) || []).length;
    console.log(`${label}: <break> tags=${breaks}, total '<' count=${lts}`);
  };

  console.log("PATCH OK. Assistant id:", updated.id);
  const um = updated.model;
  if (um?.messages) {
    um.messages.forEach((msg, i) => {
      if (typeof msg.content === "string") verify(`messages[${i}] (${msg.role})`, msg.content);
    });
  }
  verify("firstMessage", updated.firstMessage);
  verify("endCallMessage", updated.endCallMessage);

  const sysMsg = updated.model?.messages?.find((x) => x.role === "system") ?? updated.model?.messages?.[0];
  const finalContent = typeof sysMsg?.content === "string" ? sysMsg.content : "";
  if (countBreakTags(finalContent) > 0) {
    console.error("FAIL: <break> still present in system message after PATCH.");
    process.exit(1);
  }
  console.log("OK: No <break> tags remain in system prompt.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
