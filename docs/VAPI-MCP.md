# Vapi MCP connection (Cursor & others)

**What this is:** MCP lets the AI in your editor call **Vapi tools** (list assistants, create calls, phone numbers, etc.) through a standard protocol.

**This is separate from your website:** The app uses **`VITE_VAPI_PUBLIC_KEY`** + `@vapi-ai/web` for the voice widget. MCP uses your **private Vapi API key** from the dashboard (same area as “API keys” / org keys — **not** the same as “public” keys used in the browser).

---

## 1. Get your private API key

1. Open **[Vapi dashboard → API keys](https://dashboard.vapi.ai/org/api-keys)**.
2. Copy your **private / secret** API key (the one you’d use for server-side API calls).

---

## 2. Cursor — `.cursor/mcp.json`

This repo includes a **`vapi`** entry in **`.cursor/mcp.json`**.

1. Open **`.cursor/mcp.json`**.
2. Replace **`REPLACE_WITH_VAPI_PRIVATE_API_KEY`** with your real private key (keep it inside the quotes).
3. **Do not commit** your real key. If this file is tracked, either:
   - use a personal local override, or  
   - run `git update-index --assume-unchanged .cursor/mcp.json` after editing (advanced), or  
   - store the key in Cursor’s MCP UI if your Cursor version supports env vars there.

4. **Restart Cursor** (fully quit and reopen).

5. Check **Cursor Settings → MCP** (or Features → MCP): **`vapi`** should show as connected.

---

## 3. One-command setup (alternative — needs Vapi CLI on PATH)

If the **`vapi`** command is installed, you can auto-wire Cursor:

```bash
vapi mcp setup cursor
```

**Windows note:** The npm package **`@vapi-ai/cli`** often fails to install its binary here (installer looks for a `.zip` release asset, but Vapi currently ships **`cli_Windows_x86_64.tar.gz`**). Prefer the **official installer**:

```powershell
iex ((New-Object System.Net.WebClient).DownloadString('https://vapi.ai/install.ps1'))
```

Then open a **new** terminal and run `vapi mcp setup cursor`. If `vapi` is still not found, use **section 2** (manual `.cursor/mcp.json`) — it works without the CLI.

See: [Vapi CLI — MCP](https://docs.vapi.ai/cli/mcp)

---

## 4. Official endpoints

| Transport        | URL                         |
|------------------|-----------------------------|
| Streamable HTTP  | `https://mcp.vapi.ai/mcp`   |
| SSE              | `https://mcp.vapi.ai/sse`   |

Auth: header **`Authorization: Bearer <YOUR_PRIVATE_API_KEY>`**.

---

## 5. Tools you get over MCP (examples)

- `list_assistants`, `get_assistant`, `create_assistant`
- `list_calls`, `create_call`, `get_call`
- `list_phone_numbers`, `get_phone_number`
- `list_tools`, `get_tool`

Full reference: **[Vapi MCP Server](https://docs.vapi.ai/sdk/mcp-server)**.

---

## 6. Claude Desktop

Same idea: add an `mcpServers` block using `npx mcp-remote https://mcp.vapi.ai/mcp` and `VAPI_TOKEN` — see the same doc under **Quickstart: Claude Desktop Config**.

---

## Troubleshooting

- **`mcp-remote` not found** — the config uses `npx -y mcp-remote` so it should download on first run; ensure Node/npm is installed.
- **401 / unauthorized** — wrong key type: use **private** dashboard API key, not the web **public** key from `VITE_VAPI_PUBLIC_KEY` unless Vapi documents them as the same for your account (usually they are not).
- **Still disconnected** — restart Cursor after saving `mcp.json`.
