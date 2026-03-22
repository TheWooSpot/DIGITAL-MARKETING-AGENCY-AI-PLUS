# Still seeing the old Next.js diagnostic on Vercel?

The **live site should come from Vite** (`pnpm run build` → `dist/`). If you still see the **old Next.js** URL diagnostic at `/`, Vercel is almost certainly still using the **Next.js builder**, not your `vercel.json` static output.

## 1. Confirm in the build log (fastest check)

1. Vercel → your project → **Deployments** → open the latest deployment.
2. Open **Building** / **Build Logs**.
3. Search the log (Ctrl+F):

| If you see… | Meaning |
|-------------|--------|
| `next build`, `Creating an optimized production build`, `.next` | **Wrong** — Next.js is building. |
| `vite build`, `VITE`, `dist/index.html` | **Right** — Vite is building. |

## 2. Why this happens

The repo **no longer** ships `next` or `next.config.*` — if you still see a Next build, the cause is almost always **Vercel dashboard overrides** or **stale cache**. Redeploy with **Clear build cache** and confirm logs show **Vite**.
- **Dashboard overrides** (Build Command, Output Directory, Framework) can **ignore** `vercel.json` if toggles are ON.

## 3. Fix in Vercel — try these in order

### A. Clear cache and rely on `vercel.json`

1. **Settings → General → Root Directory** = **empty** or **`.`** (not `app`).
2. **Settings → Build & Development Settings**  
   - Turn **OFF** overrides for **Build Command**, **Output Directory**, and **Install Command** (so [`vercel.json`](../vercel.json) applies).
3. **Deployments** → **⋯** on latest → **Redeploy** → enable **Clear build cache**.

### B. “Next.js preset” but force Vite output (works for many teams)

If Vercel **insists** on Next.js detection:

1. **Framework Preset** = **Next.js** (yes, Next.js).
2. Turn **ON** override for **Build Command**: `pnpm run build`
3. Turn **ON** override for **Output Directory**: `dist`
4. Redeploy with **Clear build cache**.

That keeps the “Next” framework slot but **runs Vite** and publishes **`dist`** as the static site.

### C. New project (last resort)

Create a **new Vercel project** linked to the same Git repo, root `.`, framework **Other**, install `pnpm install`, build `pnpm run build`, output `dist`. Point your domain to the new project when it looks correct.

## 4. What you should see when it’s fixed

- **/** — dark **platform home** (catalog, doors, grain/grid hero), not the minimal “AnyDoor Engine · Door b1”-only Next page.
- **/doors/url-diagnostic** — full Session B diagnostic (loading stages, packages, Tap to talk).

## 5. Repo change that helps detection

The **`next`** package has been **removed** from the repo so Vercel should not auto-detect Next.js from dependencies.
