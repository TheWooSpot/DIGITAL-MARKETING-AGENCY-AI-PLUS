import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { DiagnosticResults } from "@/anydoor/DiagnosticResults";
import {
  getProspectByPublicAccess,
  getProspectByShareToken,
  isProspectRowUuid,
  prospectRowToDiagnosticResult,
} from "@/anydoor/lib/supabaseProspect";
import type { DiagnosticResult } from "@/anydoor/DiagnosticForm";

/**
 * Public shared report:
 * - `/report/{share_token}` — loaded via `getProspectByShareToken` in `@/anydoor/lib/supabaseProspect.ts`
 *   using **@supabase/supabase-js** + **anon** key: `.from('layer5_prospects').select('*').eq('share_token', token).single()`.
 * - Legacy: `/report/{row_uuid}?k={report_access_key}` — `getProspectByPublicAccess` (RPC + anon).
 */
export default function SharedReportPage() {
  const { token: tokenParam } = useParams<{ token: string }>();
  /** Use React Router param as-is (no trim / decode — must match Supabase `share_token`). */
  const routeToken = tokenParam ?? "";
  const [searchParams] = useSearchParams();
  const accessKey = searchParams.get("k") ?? "";
  const usePublicAccessRpc = Boolean(routeToken && accessKey && isProspectRowUuid(routeToken));

  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [submittedUrl, setSubmittedUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!routeToken) return;

    setResult(null);
    setSubmittedUrl("");
    (async () => {
      setError(null);
      const row = usePublicAccessRpc
        ? await getProspectByPublicAccess(routeToken, accessKey)
        : await getProspectByShareToken(routeToken);
      if (cancelled) return;
      if (!row) {
        setError("Report not found or link expired.");
        return;
      }
      const r = prospectRowToDiagnosticResult(row);
      if (!r) {
        setError("Could not load this report.");
        return;
      }
      setResult(r);
      setSubmittedUrl(typeof row.url === "string" ? row.url : "");
    })();

    return () => {
      cancelled = true;
    };
  }, [routeToken, accessKey, usePublicAccessRpc]);

  if (!routeToken) {
    return (
      <div className="min-h-screen px-4 py-16 text-center" style={{ color: "#e8eef5" }}>
        <p className="text-white/70">Invalid link.</p>
        <Link to="/doors/url-diagnostic" className="mt-6 inline-block text-[#c9973a] underline">
          Run a new diagnostic →
        </Link>
      </div>
    );
  }

  if (error && !result) {
    return (
      <div className="min-h-screen px-4 py-16 text-center" style={{ color: "#e8eef5" }}>
        <p className="text-white/70">{error}</p>
        <Link to="/doors/url-diagnostic" className="mt-6 inline-block text-[#c9973a] underline">
          Run a new diagnostic →
        </Link>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ color: "#e8eef5" }}>
        <p className="text-sm text-white/50">Loading report…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-5xl px-4 py-8 sm:py-12 lg:max-w-6xl">
        <DiagnosticResults result={result} submittedUrl={submittedUrl} reportShareToken={routeToken} />
      </main>
    </div>
  );
}
