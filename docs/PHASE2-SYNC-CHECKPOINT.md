# Phase 2 sync checkpoint

Last run: git commit **`chore: phase 2 sync checkpoint`**. Re-verify SHAs and Supabase dashboard after pull.

## Sync status table

| Platform | Expected state | Actual state (last check) | Status |
|----------|----------------|---------------------------|--------|
| **GitHub** | `main` clean, all commits pushed | Run `git status` / `git rev-parse HEAD` after this checkpoint | ✅ |
| **Vercel** | Production deployment built from current `main` HEAD | Latest **Production** deployment **Ready** (e.g. `socialutely-any-door-engine-bo925g7vg`); CLI `inspect` does not always include `gitCommitSha` for CLI-triggered deploys — confirm commit in **Vercel → Deployment → Source** if connected to GitHub | ⚠️ |
| **Supabase** | Edge Function `prospect-diagnostic` at **v16**; `layer5_prospects.share_token` present; policy **`anon_select_by_share_token`** for anon `SELECT` where `share_token IS NOT NULL` | **Repo:** `share_token` migrations + new migration `20250325180000_layer5_anon_select_share_token.sql`. **Edge function version** is not readable from this repo alone — open **Supabase Dashboard → Edge Functions → prospect-diagnostic** and confirm version **v16**. **Remote DB:** run pending migrations / compare policies to migration file | ⚠️ |
| **Notion** | Layer 2 content complete | **~425 KB** of articles still **pending import** to Layer 2 (no code action) | ⚠️ |
| **Vapi** | Documented | **Zero config / not wired in Phase 2** — public key may exist in local `.env` only; no production voice flow in this checkpoint. **TODO:** define assistant IDs, webhooks, and env strategy before go-live | ⚠️ |
| **CodeSpring MCP** | MCP endpoint live | `https://mcp.codespring.app/mcp` responds (plain HTTP GET may return **400** — MCP expects an MCP client). **Activation:** install/configure in **Claude Desktop** (or other MCP host), not from the browser alone | ⚠️ |

## Follow-up commands

```bash
# Re-check git
git status && git log -1 --oneline && git rev-parse origin/main

# Supabase (if CLI linked)
supabase db push
supabase functions deploy prospect-diagnostic
```

## Vapi TODO (Phase 2+)

- [ ] Confirm `VITE_VAPI_PUBLIC_KEY` (or server key strategy) in Vercel for any voice surfaces
- [ ] Create assistants / tools in Vapi dashboard; document IDs in `.env.example` only (never commit secrets)
- [ ] Smoke-test one assistant from the app when a door ships

## CodeSpring MCP TODO

- [ ] Add MCP server URL `https://mcp.codespring.app/mcp` in **Claude Desktop** config
- [ ] Restart Claude Desktop and verify tools list
