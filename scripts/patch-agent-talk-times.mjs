// Node v18+ has built-in fetch — no imports needed

const VAPI_TOKEN = process.env.VAPI_TOKEN;

if (!VAPI_TOKEN) {
  console.error('❌ VAPI_TOKEN not found in .env.local');
  process.exit(1);
}

const WIND_DOWN_BLOCK = `

---

## GRACEFUL WIND-DOWN PROTOCOL — NON-NEGOTIABLE

You must NEVER end a call abruptly. Every call ends with dignity, warmth, and a clear sense of completion for the user — regardless of how the conversation went.

### Trigger this wind-down when ANY of the following is true:

1. **Standstill detected** — The user is circling the same concern, expressing repeated uncertainty, or the conversation has stalled with no forward movement for 2+ exchanges.
2. **Agreement reached** — Both you and the user have naturally arrived at a shared understanding of next steps, and the conversation has found its natural conclusion.
3. **One clear path forward** — The options have narrowed to a single obvious next action and the user has acknowledged it (verbally or through silence/agreement).

### Wind-Down Rules:

- **Begin winding down at least 60 seconds before you would naturally close the call.** Do not wait until you sense the very end — ease into it.
- Use warm, unhurried language. The user should feel the conversation is completing, not being cut off.
- Always confirm the next step out loud before closing — even if it is simply "take some time to think about it."
- If the user goes quiet during wind-down, offer one gentle check-in before closing. Never interpret silence as permission to hang up immediately.
- End every call with the user's name if known, a specific next step, and a warm close.

### Wind-Down Language Templates (adapt naturally — do not read robotically):

**Standstill / Circular concern:**
"I hear you — and honestly, that kind of careful thinking is exactly what this decision deserves. Here's what I'd suggest: let's not rush this. [Recap the one clearest next step]. Whenever you're ready, that door is open. I appreciate you taking the time today."

**Agreement / Aligned close:**
"I love where we landed. [Restate what was agreed]. That's a strong next move. I'll make sure everything is ready on our end. You're in good hands — take care."

**Single path forward:**
"It really does come down to one thing at this point — [state it clearly]. That's actually a great sign. It means the path is clear. [Confirm next step]. I'm glad we got here together."

### Final Close — Always end with:
"Take care of yourself. Looking forward to what's next for [business name / you]."

---`;

const agents = [
  {
    name: 'Jordan — Evaluation Specialist',
    id: 'e48ee900-bfb0-4ee6-a645-e89a08233365',
    maxDurationSeconds: 1020,
  },
  {
    name: 'Mr. Mackleberry — Partner Brief',
    id: 'afec7622-84c3-418d-b4c6-9d35653d6bc5',
    maxDurationSeconds: 1020,
  },
  {
    name: 'Aria — Reception',
    id: '4fa66663-1e58-416f-a137-5b0547300e05',
    maxDurationSeconds: 420,
  },
  {
    name: 'Amelia — DreamScape™',
    id: '0693b0d9-6e89-436f-bdbd-9fe25cc1bf3c',
    maxDurationSeconds: 1020,
  },
];

async function getAgent(agent) {
  const res = await fetch(`https://api.vapi.ai/assistant/${agent.id}`, {
    headers: { Authorization: `Bearer ${VAPI_TOKEN}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`GET failed: ${JSON.stringify(err)}`);
  }
  return res.json();
}

async function patchAgent(agent) {
  // 1. Fetch current assistant to get existing system prompt
  let current;
  try {
    current = await getAgent(agent);
  } catch (e) {
    console.error(`❌ ${agent.name} — could not fetch current config: ${e.message}`);
    return;
  }

  const existingPrompt = current?.model?.messages?.find(m => m.role === 'system')?.content
    ?? current?.model?.systemPrompt
    ?? '';

  // 2. Skip appending if wind-down block already present
  const alreadyHasWindDown = existingPrompt.includes('GRACEFUL WIND-DOWN PROTOCOL');
  const newPrompt = alreadyHasWindDown ? existingPrompt : existingPrompt + WIND_DOWN_BLOCK;

  if (alreadyHasWindDown) {
    console.log(`⏭️  ${agent.name} — wind-down already present, skipping prompt update`);
  }

  // 3. Build PATCH body — always carry forward provider so Vapi doesn't reject the request
  const body = { maxDurationSeconds: agent.maxDurationSeconds };

  if (current?.model) {
    if (current.model.messages) {
      const messages = current.model.messages.map(m =>
        m.role === 'system' ? { ...m, content: newPrompt } : m
      );
      if (!messages.find(m => m.role === 'system')) {
        messages.unshift({ role: 'system', content: newPrompt });
      }
      body.model = { provider: current.model.provider, model: current.model.model, messages };
    } else if (typeof current.model.systemPrompt === 'string') {
      body.model = { provider: current.model.provider, model: current.model.model, systemPrompt: newPrompt };
    }
  }

  // 4. PATCH
  const res = await fetch(`https://api.vapi.ai/assistant/${agent.id}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${VAPI_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (res.ok) {
    const promptStatus = alreadyHasWindDown ? '(prompt unchanged)' : '+ wind-down appended';
    console.log(`✅ ${agent.name} → ${agent.maxDurationSeconds}s (${agent.maxDurationSeconds / 60} min) ${promptStatus}`);
  } else {
    console.error(`❌ ${agent.name} FAILED:`, JSON.stringify(data, null, 2));
  }
}

console.log('🎙️  Patching Vapi agent talk times + wind-down protocol...\n');
for (const agent of agents) {
  await patchAgent(agent);
}
console.log('\n✅ Done — verify at dashboard.vapi.ai → Assistants → each agent → Settings tab.');
