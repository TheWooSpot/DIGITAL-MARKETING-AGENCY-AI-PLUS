/**
 * Clean DreamScape™ Amelia Vapi system prompt: remove ACT labels, SSML breaks,
 * markdown act headers, and stage-direction markup so TTS does not speak them.
 *
 *   node --env-file=.env scripts/clean-amelia-vapi-system-prompt.mjs
 *
 * Uses VAPI_TOKEN or VAPI_API_KEY — never commit keys.
 */
const ASSISTANT_ID = "0693b0d9-6e89-436f-bdbd-9fe25cc1bf3c";
const VAPI_API = "https://api.vapi.ai";

const BREAK_RE = /<break\s[^>]*\/?>/gi;

/**
 * @param {string} raw
 * @returns {string}
 */
function cleanSystemPrompt(raw) {
  let s = raw;

  // SSML <break .../>
  s = s.replace(BREAK_RE, "");

  // Markdown headers: ## ACT / ### ACT (whole line)
  s = s.replace(/^\s*#{1,6}\s*ACT[^\n]*$/gim, "");

  // Line starts: ACT 1 / ACT 2 — …
  s = s.replace(/^\s*ACT\s*[1-4]\b[^\n]*$/gim, "");

  // Inline clause: ACT N — … (rest of line)
  s = s.replace(/\bACT\s+[1-4]\s*[—–-][^\n]*/gi, "");

  // "AI BEHAVIOR IN ACT …"
  s = s.replace(/\bAI\s+BEHAVIOR\s+IN\s+ACT[^\n.]*/gi, "");

  // Phase labels: MOVEMENT N — …
  s = s.replace(/^\s*MOVEMENT\s+[1-9]\s*[—–-][^\n]*$/gim, "");

  // Framework banner lines
  s = s.replace(/^\s*CONVERSATION\s+STRUCTURE[^\n]*$/gim, "");

  // Running text: "from Act 1" / "Act 3" (title case framework refs)
  s = s.replace(/\bAct\s+[1-4]\b/gi, "this part of the conversation");

  // Asterisk stage bits
  s = s.replace(/\*\s*(pause|beat|nod|warm tone|soft tone|slow)\s*\*/gi, "");
  s = s.replace(/\*\([^)]+\)\*/g, "");

  // Bracket stage directions (common TTS leaks)
  s = s.replace(
    /\[(pause|warm tone|nodding|beat|soft|slow|quiet|smiling|whisper|reading|sigh)[^\]]*\]/gi,
    ""
  );

  // Collapse excessive blank lines
  s = s.replace(/\n{3,}/g, "\n\n");
  return s.trim();
}

/**
 * Fix awkward gaps after tag/bracket stripping (readable instructions, no TTS leaks).
 * @param {string} s
 */
function repairArtifacts(s) {
  let t = s;
  // Broken lines after [pause] / <break> stripped from CRITICAL block
  t = t.replace(
    /- NEVER output stage directions like , \(nodding\),?\s*\n- NEVER use asterisks, brackets, parentheses for directions\s*\n- Use\s+for natural pauses — these are\s*\n\s*the ONLY formatting tags allowed/g,
    `- NEVER output stage directions, parenthetical asides, or spoken markup.
- NEVER use asterisks, brackets, or parentheses for directions.
- Do not use SSML or tags in speech. Pauses come from punctuation and natural rhythm.`
  );
  t = t.replace(
    /NEVER output stage directions like , \(nodding\)/g,
    "NEVER output stage directions or parenthetical asides"
  );
  t = t.replace(
    /- Use\s+for natural pauses — these are\s*\n\s*the ONLY formatting tags allowed/g,
    "- Do not use SSML or markup in speech. Pauses come from punctuation and rhythm."
  );
  t = t.replace(/\binitiate Movement 1 regardless\b/gi, "begin the warm close sequence regardless");
  t = t.replace(/\bMovement\s+[1-9]\b/gi, "that step");
  t = t.replace(
    /(CRITICAL VOICE RULES[\s\S]*?)(Speak only words[^\n]*)\n(Open with warmth)/,
    "$1$2\n\nOPENING\n$3"
  );
  return t.trim();
}

function countActSpace(s) {
  const m = s.match(/\bACT\s+/gi);
  return m ? m.length : 0;
}

async function main() {
  const token = (process.env.VAPI_TOKEN || process.env.VAPI_API_KEY)?.trim();
  if (!token) {
    console.error("Set VAPI_TOKEN or VAPI_API_KEY.");
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
  if (!m?.messages?.[0] || typeof m.messages[0].content !== "string") {
    console.error("Missing model.messages[0].content");
    process.exit(1);
  }

  const raw = m.messages[0].content;
  const cleaned = repairArtifacts(cleanSystemPrompt(raw));

  if (cleaned === raw) {
    console.log("No changes after cleaning rules — PATCH skipped.");
    console.log('Count of "ACT " (word boundary):', countActSpace(raw));
    console.log("Count of <break tags:", (raw.match(/<break\b/gi) || []).length);
    if (countActSpace(raw) > 0) process.exit(1);
    process.exit(0);
  }

  console.log("Bytes before:", raw.length, "after:", cleaned.length);
  console.log('Before: occurrences of "ACT ":', countActSpace(raw));

  const newMsgs = JSON.parse(JSON.stringify(m.messages));
  newMsgs[0] = { ...newMsgs[0], role: "system", content: cleaned };

  const patchBody = {
    model: {
      provider: m.provider,
      model: m.model,
      messages: newMsgs,
      ...(m.maxTokens != null ? { maxTokens: m.maxTokens } : {}),
      ...(m.temperature != null ? { temperature: m.temperature } : {}),
    },
  };

  const patchRes = await fetch(uri, {
    method: "PATCH",
    headers: { ...h, "Content-Type": "application/json" },
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
    console.error("PATCH response not JSON:", text.slice(0, 400));
    process.exit(1);
  }

  const sys = updated.model?.messages?.find((x) => x.role === "system") ?? updated.model?.messages?.[0];
  const finalContent = typeof sys?.content === "string" ? sys.content : "";
  const actCount = countActSpace(finalContent);

  console.log("PATCH OK. Assistant:", updated.id);
  console.log('After PATCH: occurrences of "ACT ":', actCount);

  if (actCount > 0) {
    console.error("FAIL: Still found ACT + space in system prompt. Inspect manually.");
    const idx = finalContent.search(/\bACT\s+/i);
    if (idx >= 0) console.error("Snippet:", finalContent.slice(Math.max(0, idx - 40), idx + 80));
    process.exit(1);
  }

  console.log('OK: 0 instances of "ACT " remain.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
