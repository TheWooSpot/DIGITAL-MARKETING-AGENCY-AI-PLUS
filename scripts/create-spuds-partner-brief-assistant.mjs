/**
 * CREATE Vapi assistant "Project Partner Briefs - Socialutely" (Spuds).
 * Matches the canonical POST body used with:
 *   curl -X POST https://api.vapi.ai/assistant ...
 *
 * Private key: VAPI_TOKEN or VAPI_API_KEY (trimmed). Never commit keys.
 *
 *   node scripts/create-spuds-partner-brief-assistant.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROMPT_FILE = path.join(__dirname, "spuds-partner-brief-system-prompt.txt");
const VAPI_API = "https://api.vapi.ai";

async function main() {
  const token = (process.env.VAPI_TOKEN || process.env.VAPI_API_KEY)?.trim();
  if (!token) {
    console.error("Set VAPI_TOKEN or VAPI_API_KEY to your Vapi private API key.");
    process.exit(1);
  }

  const systemContent = fs.readFileSync(PROMPT_FILE, "utf8").trim();

  const body = {
    name: "Project Partner Briefs - Socialutely",
    voice: {
      provider: "11labs",
      voiceId: "NOpBlnGInO9m6vDvFkFC",
      stability: 0.55,
      similarityBoost: 0.8,
      useSpeakerBoost: true,
    },
    model: {
      provider: "openai",
      model: "gpt-4o",
      messages: [{ role: "system", content: systemContent }],
    },
    firstMessage:
      "Well, pull up a chair. Glad you made it. I am here to talk through where we are with Socialutely's AI Readiness Labs — what has been built, what still needs work, and most importantly, what you are thinking. Do not hold back. What is on your mind?",
    endCallMessage: "Appreciate you taking the time. Every bit of that helps. You take care now.",
    endCallPhrases: ["goodbye", "talk later", "thanks Spuds", "that is all", "we are done"],
  };

  const res = await fetch(`${VAPI_API}/assistant`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  if (!res.ok) {
    console.error("POST failed", res.status, text);
    process.exit(1);
  }

  let created;
  try {
    created = JSON.parse(text);
  } catch {
    console.log(text);
    process.exit(0);
  }

  console.log("Created assistant id:", created.id);
  console.log("Name:", created.name);
}

main();
