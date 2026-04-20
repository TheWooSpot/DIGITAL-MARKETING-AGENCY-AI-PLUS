/**
 * PATCH Mr. Mackleberry assistant system prompt on Vapi.
 * Uses VAPI_TOKEN (Bearer) — never commit tokens.
 *
 * Usage:
 *   node scripts/patch-mackleberry-prompt.mjs
 *
 * Edit the system prompt in:
 *   scripts/mackleberry-system-prompt.txt
 *
 * Mackleberry architecture (matches Jordan / Amelia):
 *   Brain (prompt + behavior) → Vapi  (this script)
 *   Voice synthesis only      → ElevenLabs (TTS, configured inside Vapi)
 *   All changes go through here — never touch the ElevenLabs ConvAI dashboard.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ASSISTANT_ID = "afec7622-84c3-418d-b4c6-9d35653d6bc5";
const PROMPT_FILE  = path.join(__dirname, "mackleberry-system-prompt.txt");
const VAPI_API     = "https://api.vapi.ai";

async function main() {
  const token = process.env.VAPI_TOKEN?.trim();
  if (!token) {
    console.error("❌  Set VAPI_TOKEN to your Vapi private API key.");
    process.exit(1);
  }

  if (!fs.existsSync(PROMPT_FILE)) {
    console.error(`❌  Prompt file not found: ${PROMPT_FILE}`);
    process.exit(1);
  }

  const systemContent = fs.readFileSync(PROMPT_FILE, "utf8").trim();
  console.log(`✔  Prompt loaded  (${systemContent.length} chars)`);

  const uri = `${VAPI_API}/assistant/${ASSISTANT_ID}`;
  const h   = { Authorization: `Bearer ${token}` };

  // 1. GET current config so we preserve model/voice/tools shape
  const getRes = await fetch(uri, { headers: h });
  if (!getRes.ok) {
    console.error("❌  GET failed", getRes.status, await getRes.text());
    process.exit(1);
  }
  const assistant = await getRes.json();
  const m = assistant.model;
  if (!m?.messages?.[0]) {
    console.error("❌  Unexpected assistant shape — missing model.messages[0]");
    process.exit(1);
  }

  // 2. Build patch — replace system message only, keep everything else intact
  const newMsgs    = JSON.parse(JSON.stringify(m.messages));
  newMsgs[0]       = { ...newMsgs[0], role: "system", content: systemContent };

  const patchBody  = {
    model: {
      provider:    m.provider,
      model:       m.model,
      messages:    newMsgs,
      maxTokens:   m.maxTokens,
      temperature: m.temperature,
    },
  };

  // 3. PATCH
  const patchRes = await fetch(uri, {
    method:  "PATCH",
    headers: { ...h, "Content-Type": "application/json" },
    body:    JSON.stringify(patchBody),
  });

  const text = await patchRes.text();
  if (!patchRes.ok) {
    console.error("❌  PATCH failed", patchRes.status, text);
    process.exit(1);
  }

  let updated;
  try {
    updated = JSON.parse(text);
  } catch {
    console.log("✔  PATCH OK", patchRes.status, text.slice(0, 200));
    process.exit(0);
  }

  const sysMsg  = updated.model?.messages?.find((x) => x.role === "system");
  const preview = typeof sysMsg?.content === "string"
    ? sysMsg.content.slice(0, 300)
    : JSON.stringify(sysMsg);

  console.log(`✔  PATCH status : ${patchRes.status}`);
  console.log(`✔  Assistant id : ${updated.id}`);
  console.log(`✔  Model        : ${updated.model?.provider} / ${updated.model?.model} @ temp ${updated.model?.temperature}`);
  console.log(`✔  Prompt chars : ${typeof sysMsg?.content === "string" ? sysMsg.content.length : "?"}`);
  console.log(`\nSystem prompt preview (first 300 chars):\n${preview}\n...`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
