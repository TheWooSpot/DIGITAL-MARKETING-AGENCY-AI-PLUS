/**
 * Optional serverless lookup (service role). The `/report/:token` UI uses the browser
 * Supabase client + anon key instead — see `src/anydoor/lib/supabaseProspect.ts`.
 *
 * Vercel serverless: public report lookup by share_token.
 * Runs the equivalent of:
 *   SELECT * FROM layer5_prospects WHERE share_token = $1 LIMIT 1
 * using the service role (server-only — never exposed to the browser).
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const token = typeof req.body?.token === "string" ? req.body.token : "";
  if (!token) {
    return res.status(400).json({ error: "Missing token" });
  }

  const base = (process.env.SUPABASE_URL ?? "").replace(/\/$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  if (!base || !serviceKey) {
    console.error("report-by-token: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on Vercel");
    return res.status(503).json({ error: "Server misconfigured" });
  }

  const filter = encodeURIComponent(token);
  const url = `${base}/rest/v1/layer5_prospects?share_token=eq.${filter}&select=*&limit=1`;

  const upstream = await fetch(url, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
  });

  const text = await upstream.text();
  if (!upstream.ok) {
    console.error("report-by-token upstream", upstream.status, text.slice(0, 400));
    return res.status(502).json({ error: "Upstream error", detail: text.slice(0, 200) });
  }

  let rows: unknown;
  try {
    rows = JSON.parse(text) as unknown;
  } catch {
    return res.status(502).json({ error: "Invalid upstream JSON" });
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(200).json({ row: null });
  }

  return res.status(200).json({ row: rows[0] });
}
