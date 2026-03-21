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

## API proxy

`POST /api/prospect-diagnostic` is rewritten to the Supabase Edge Function so the browser stays same-origin (no CORS issues).

## Environment variables (Vercel → Project → Settings → Environment Variables)

Set for **Production** (and Preview if needed). Client code reads **`VITE_*`** via [`vite.config.ts`](../vite.config.ts) `define` (which also falls back to legacy **`NEXT_PUBLIC_SUPABASE_*`** from an old Next setup at build time).

| Variable                   | Purpose                                      |
|----------------------------|----------------------------------------------|
| `VITE_SUPABASE_URL`        | Shared report page: Supabase project URL     |
| `VITE_SUPABASE_ANON_KEY`   | Shared report page: anon public key          |
| `VITE_SITE_URL`            | Optional; canonical URL for “Copy link” text |
| `NEXT_PUBLIC_SUPABASE_*`   | Optional fallback if not yet renamed to `VITE_*` |

## Routes (client-side)

- `/` — Platform home  
- `/doors/url-diagnostic` — Full URL diagnostic (Session B UI)  
- `/report/:token` — Shared report (requires Supabase RPC `get_prospect_by_share_token`)

The Next.js app under `/app` remains in the repo for local experiments or a separate deployment; it is **not** what Vercel builds by default.
