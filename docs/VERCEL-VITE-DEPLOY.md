# Vercel deploy — Vite platform + AnyDoor (Door b1)

The production site **socialutely-any-door-engine.vercel.app** is configured to build the **Vite** app (`pnpm run build` → `dist/`), not the Next.js app in `/app`.

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

Set for **Production** (and Preview if needed). Vite only exposes variables prefixed with **`VITE_`**:

| Variable                 | Purpose                                      |
|--------------------------|----------------------------------------------|
| `VITE_SUPABASE_URL`      | Shared report page: Supabase project URL     |
| `VITE_SUPABASE_ANON_KEY` | Shared report page: anon public key         |
| `VITE_SITE_URL`          | Optional; canonical URL for “Copy link” text |

## Routes (client-side)

- `/` — Platform home  
- `/doors/url-diagnostic` — Full URL diagnostic (Session B UI)  
- `/report/:token` — Shared report (requires Supabase RPC `get_prospect_by_share_token`)

The Next.js app under `/app` remains in the repo for local experiments or a separate deployment; it is **not** what Vercel builds by default.
