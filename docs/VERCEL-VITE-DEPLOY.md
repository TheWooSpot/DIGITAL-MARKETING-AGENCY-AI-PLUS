# Vercel deploy — Vite platform + AnyDoor (Door b1)

## Where the Vite app lives in this repo

| Area | Path |
|------|------|
| Entry | [`index.html`](../index.html) → [`src/main.tsx`](../src/main.tsx) |
| Router / shell | [`src/App.tsx`](../src/App.tsx) |
| Platform home | [`src/views/PlatformHome.tsx`](../src/views/PlatformHome.tsx), [`src/views/Index.tsx`](../src/views/Index.tsx) |
| URL diagnostic (Session B) | [`src/anydoor/`](../src/anydoor/), route `/doors/url-diagnostic` |
| Styles | [`src/index.css`](../src/index.css) |
| Vite config | [`vite.config.ts`](../vite.config.ts) |
| **Not deployed by this flow** | [`app/`](../app/) (Next.js — separate) |

The production site **socialutely-any-door-engine.vercel.app** should build the **Vite** app (`pnpm run build` → `dist/`), not the Next.js app in `/app`.

## Vercel dashboard (if the old Next app still deploys)

1. **Project → Settings → General → Framework Preset:** choose **Vite** (or **Other** with no Next override).
2. **Root Directory:** repository root (`.`). Do **not** point only at `app/`.
3. **Build & Development Settings:** either leave **“Override”** toggles **off** so [`vercel.json`](../vercel.json) applies, or set manually:
   - Build: `pnpm run build`
   - Output: `dist`
   - Install: `pnpm install`

## Build settings (also in `vercel.json`)

| Setting            | Value              |
|--------------------|--------------------|
| Install            | `pnpm install`     |
| Build              | `pnpm run build`   |
| Output directory   | `dist`             |
| Framework          | Vite               |

## API proxy & SPA

[`vercel.json`](../vercel.json) rewrites (order matters):

1. `POST /api/prospect-diagnostic` → Supabase Edge Function (same-origin fetch from the app).
2. `/(.*)` → `/index.html` so React Router works on refresh.

## Single `package.json`

There is **one** [`package.json`](../package.json) at the **repo root**. It includes both `pnpm run build` (Vite → `dist/`) and `pnpm run build:next` (Next). **Vercel should use the root** — no subdirectory package file.

## Local dev (`.env.local`)

Vite reads **`VITE_*`** from **`.env.local`** at the project root. Use at least:

- `VITE_DIAGNOSTIC_URL` — full Edge Function URL (local dev has no `/api` proxy).
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` — for shared reports (`/report/:token`).

[`vite.config.ts`](../vite.config.ts) uses **`loadEnv`** so these values are not overwritten by empty `process.env` during config load.

## Environment variables (Vercel → Project → Settings → Environment Variables)

Set for **Production** (and Preview if needed). Client code uses **`VITE_*`** only, inlined at build time via [`vite.config.ts`](../vite.config.ts) `define`.

| Variable                 | Purpose |
|--------------------------|---------|
| `VITE_DIAGNOSTIC_URL`    | Optional full Edge Function URL; if unset, app uses `/api/prospect-diagnostic` (rewrite above). |
| `VITE_SUPABASE_URL`      | Shared report page: Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Shared report page: anon public key |
| `VITE_SITE_URL`          | Optional; canonical URL for “Copy link” text |

## Routes (client-side)

- `/` — Platform home  
- `/doors/url-diagnostic` — Full URL diagnostic (Session B UI)  
- `/report/:token` — Shared report (requires Supabase RPC `get_prospect_by_share_token`)

The Next.js app under `/app` remains in the repo for local experiments or a separate deployment; it is **not** what Vercel builds by default.
