# How `/report/:token` loads data from Supabase

## 1. Route handler (file)

- **React route:** `src/App.tsx` — `<Route path="/report/:token" element={<SharedReportPage />} />`
- **Page component:** `src/views/SharedReportPage.tsx` — reads `useParams().token`, calls `getProspectByShareToken(routeToken)` (or `getProspectByPublicAccess` when `?k=` is present).

## 2. Exact Supabase operations

### A) Preferred on production (Vercel): serverless API + service role

- **File:** `api/report-by-token.ts` (runs on Vercel only; **not** part of the Vite bundle).
- **HTTP:** `POST /api/report-by-token` with JSON body `{ "token": "<same string as in URL path>" }`.
- **Equivalent SQL (what PostgREST runs with the service key):**

```sql
SELECT * FROM layer5_prospects
WHERE share_token = '<token_from_request_body>'
LIMIT 1;
```

- **PostgREST URL (built server-side):**

```
GET {SUPABASE_URL}/rest/v1/layer5_prospects?share_token=eq.{urlEncodedToken}&select=*&limit=1
```

- **Auth headers:** `apikey: <SUPABASE_SERVICE_ROLE_KEY>` and `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>`.

### B) Fallback: browser → RPC + **anon** key

- **File:** `src/anydoor/lib/supabaseProspect.ts` → `getProspectByShareTokenViaRpc`.
- **HTTP:** `POST {SUPABASE_URL}/rest/v1/rpc/get_prospect_by_share_token`
- **Body:** `{ "p_token": "<token_from_url>" }`
- **Auth headers:** `apikey: <VITE_SUPABASE_ANON_KEY>` and `Authorization: Bearer <VITE_SUPABASE_ANON_KEY>`.
- **Database:** function `public.get_prospect_by_share_token(p_token text)` is `SECURITY DEFINER`, so it **does not use RLS** for the inner `SELECT`; it still requires `GRANT EXECUTE ... TO anon`.

## 3. Anon vs service role

| Path | Key |
|------|-----|
| Browser → `/api/report-by-token` | **No key in browser**; server uses `SUPABASE_SERVICE_ROLE_KEY`. |
| Browser → Supabase RPC (fallback) | **Anon key** only (`VITE_SUPABASE_ANON_KEY`). |

**Never** put the service role key in `VITE_*` or client code.

## 4. RLS

- **Direct** `GET /layer5_prospects` with the **anon** key is usually blocked by RLS unless you add a very permissive policy (not recommended).
- **RPC** with `SECURITY DEFINER` bypasses RLS for the query inside the function (runs as the function owner).
- **Service role** bypasses RLS entirely — safe only **on the server** (`api/report-by-token.ts`).

## 5. Vercel environment variables (Production)

Set in the Vercel project (serverless only):

- `SUPABASE_URL` — same project as `VITE_SUPABASE_URL` (e.g. `https://xxxx.supabase.co`)
- `SUPABASE_SERVICE_ROLE_KEY` — from Supabase Dashboard → Project Settings → API

If these are missing, the API route returns `503` and the app falls back to the anon RPC.
