# How `/report/:token` loads data from Supabase

## 1. Route handler (file)

- **React route:** `src/App.tsx` — `<Route path="/report/:token" element={<SharedReportPage />} />`
- **Page component:** `src/views/SharedReportPage.tsx` — reads `useParams().token` as **`routeToken`** (raw, no decoding), calls `getProspectByShareToken(routeToken)` unless legacy `?k=` public-access mode is used.

## 2. Share-token lookup (current)

- **Files:**
  - `src/anydoor/lib/supabaseBrowserClient.ts` — `createClient` with **`VITE_SUPABASE_URL`** + **`VITE_SUPABASE_ANON_KEY`** (**anon** key only).
  - `src/anydoor/lib/supabaseProspect.ts` — `getProspectByShareToken`.

- **Exact client call (Supabase JS):**

```ts
const { data, error } = await supabase
  .from("layer5_prospects")
  .select("*")
  .eq("share_token", token)
  .single();
```

- **`token`:** same string as the URL path segment from `useParams()` (no `decodeURIComponent` / trim).

- **Errors:** logged with `console.error("[getProspectByShareToken] Supabase error", { message, code, details, hint })`.

- **RLS:** `anon` must be allowed to `SELECT` the row (e.g. policy on `layer5_prospects` for `share_token IS NOT NULL`).

## 3. Legacy: `/report/{uuid}?k={key}`

- **Function:** `getProspectByPublicAccess` in `supabaseProspect.ts`
- **Mechanism:** PostgREST RPC `get_prospect_by_public_access` with **anon** key (unchanged).

## 4. Optional: `api/report-by-token.ts`

- Serverless route using **service role** still exists for emergencies / tooling but is **not** used by the share-link UI anymore.

## 5. Environment (Vite / Vercel)

Required in the **browser** build:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

**Never** put the service role key in `VITE_*`.
