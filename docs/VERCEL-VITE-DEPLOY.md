# Vercel deploy — Vite platform + AnyDoor (Door b1)

## Repository check: `vercel.json` (root)

Confirm [`vercel.json`](../vercel.json) contains:

- **`$schema`:** Vercel OpenAPI (optional, for editor hints)
- **`framework`:** `vite` (forces Vite builder instead of Next.js auto-detect)
- **`buildCommand`:** `pnpm run build` (Vite → `dist/`)
- **`outputDirectory`:** `dist`
- **`installCommand`:** `pnpm install`
- **`rewrites`** (order matters):
  1. `/api/prospect-diagnostic` → `https://aagggflwhadxjjhcaohc.supabase.co/functions/v1/prospect-diagnostic`
  2. `/(.*)` → `/index.html` (SPA / React Router)

## Dashboard check (manual — cannot be changed from git)

In **Vercel → your project → Settings → General** (and **Build & Development Settings**), verify:

| Setting | Correct value |
|--------|----------------|
| **Framework Preset** | **Vite** (or leave defaults if `vercel.json` applies) |
| **Root Directory** | **`.`** (repository root — **not** `/app`) |
| **Build Command** | `pnpm run build` (or leave default if overrides are off and `vercel.json` applies) |
| **Output Directory** | `dist` |

If **Framework** is still **Next.js** or **Root** is **`app`**, the live site will build the wrong app until you fix these in the dashboard.

**Still seeing the old Next diagnostic?** See **[VERCEL-STILL-OLD-NEXT-PAGE.md](./VERCEL-STILL-OLD-NEXT-PAGE.md)** (build-log checks + dashboard workarounds).

## Where the Vite app lives in this repo

| Area | Path |
|------|------|
| Entry | [`index.html`](../index.html) → [`src/main.tsx`](../src/main.tsx) |
| Router / shell | [`src/App.tsx`](../src/App.tsx) |
| Platform home | [`src/views/PlatformHome.tsx`](../src/views/PlatformHome.tsx), [`src/views/Index.tsx`](../src/views/Index.tsx) |
| URL diagnostic (Session B) | [`src/anydoor/`](../src/anydoor/), route `/doors/url-diagnostic` |
| Styles | [`src/index.css`](../src/index.css) |
| Vite config | [`vite.config.ts`](../vite.config.ts) |

The repo **no longer includes** a Next.js `/app` tree or `next` dependency — Vercel should only detect **Vite** (`pnpm run build` → `dist/`).

## Vercel dashboard (if the old Next app still deploys)

1. **Project → Settings → General → Framework Preset:** choose **Vite** (repo [`vercel.json`](../vercel.json) sets `"framework": "vite"`).
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
| Framework          | `vite` in `vercel.json` |

## API proxy & SPA

[`vercel.json`](../vercel.json) rewrites (order matters):

1. `POST /api/prospect-diagnostic` → Supabase Edge Function (same-origin fetch from the app).
2. `/(.*)` → `/index.html` so React Router works on refresh.

## Single `package.json`

There is **one** [`package.json`](../package.json) at the **repo root**. **`pnpm run build`** runs **Vite** only (`vite build` → `dist/`). The **`next`** package has been removed so Vercel does not auto-select the Next.js builder. **Vercel should use the repo root** — no subdirectory package file.

## Local dev (`.env.local`)

Vite reads **`VITE_*`** from **`.env.local`** at the project root. Use at least:

- `VITE_DIAGNOSTIC_URL` — full Edge Function URL (local dev has no `/api` proxy).
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` — for shared reports (`/report/:token`).

[`vite.config.ts`](../vite.config.ts) uses **`loadEnv`** so these values are not overwritten by empty `process.env` during config load.

## Environment variables (Vercel → Project → Settings → Environment Variables)

Set for **Production** (and Preview if needed). Client code uses **`VITE_*`**, loaded via [`vite.config.ts`](../vite.config.ts) **`loadEnv`** + `define`.

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

Legacy Next.js code under `/app` was **removed**; production is **Vite-only**.
