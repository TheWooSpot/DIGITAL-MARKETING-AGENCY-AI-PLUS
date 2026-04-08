/**
 * PATCH DreamScape™ Amelia assistant system prompt on Vapi.
 * Uses VAPI_TOKEN (Bearer) — never commit tokens.
 *
 *   node scripts/patch-amelia-dreamscape-prompt.mjs
 *
 * Reads system prompt from scripts/amelia-dreamscape-system-prompt.txt
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSISTANT_ID = "0693b0d9-6e89-436f-bdbd-9fe25cc1bf3c";
const PROMPT_FILE = path.join(__dirname, "amelia-dreamscape-system-prompt.txt");
const VAPI_API = "https://api.vapi.ai";

async function main() {
  const token = process.env.VAPI_TOKEN?.trim();
  if (!token) {
    console.error("Set VAPI_TOKEN to your Vapi private API key.");
    process.exit(1);
  }

  const systemContent = fs.readFileSync(PROMPT_FILE, "utf8").trim();
  const uri = `${VAPI_API}/assistant/${ASSISTANT_ID}`;
  const h = { Authorization: `Bearer ${token}` };

  const getRes = await fetch(uri, { headers: h });
  if (!getRes.ok) {
    console.error("GET failed", getRes.status, await getRes.text());
    process.exit(1);
  }
  const assistant = await getRes.json();
  const m = assistant.model;
  if (!m?.messages?.[0]) {
    console.error("Unexpected assistant shape: missing model.messages[0]");
    process.exit(1);
  }

  const newMsgs = JSON.parse(JSON.stringify(m.messages));
  newMsgs[0] = { ...newMsgs[0], role: "system", content: systemContent };

  const patchBody = {
    model: {
      provider: m.provider,
      model: m.model,
      messages: newMsgs,
      maxTokens: m.maxTokens,
      temperature: 0.75,
    },
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
    console.log("PATCH OK", patchRes.status, text.slice(0, 200));
    process.exit(0);
  }

  console.log("PATCH status:", patchRes.status);
  console.log("Assistant id:", updated.id);
  const sysMsg = updated.model?.messages?.find((x) => x.role === "system");
  const preview = typeof sysMsg?.content === "string" ? sysMsg.content.slice(0, 280) : JSON.stringify(sysMsg);
  console.log("model.messages[0] (system) preview:\n", preview, "\n...");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
