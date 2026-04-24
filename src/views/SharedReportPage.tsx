import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { AnyDoorPageShell } from "@/components/anydoor/AnyDoorExperience";
import { DiagnosticResults } from "@/anydoor/DiagnosticResults";
import {
  getProspectByPublicAccess,
  getProspectByShareToken,
  isProspectRowUuid,
  prospectRowToDiagnosticResult,
} from "@/anydoor/lib/supabaseProspect";
import type { DiagnosticResult } from "@/anydoor/DiagnosticForm";
import { logEvent } from "@/lib/diagnosticEvents";

/**
 * Public shared report:
 * - `/report/{share_token}` — loaded via `getProspectByShareToken` in `@/anydoor/lib/supabaseProspect.ts`
 *   using **@supabase/supabase-js** + **anon** key with the public share-token RPC.
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
  const [prospectRow, setProspectRow] = useState<Record<string, unknown> | null>(null);
  const [submittedUrl, setSubmittedUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!routeToken) return;

    setResult(null);
    setProspectRow(null);
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
      setProspectRow(row);
      setSubmittedUrl(typeof row.url === "string" ? row.url : "");
    })();

    return () => {
      cancelled = true;
    };
  }, [routeToken, accessKey, usePublicAccessRpc]);

  useEffect(() => {
    if (!routeToken || !result) return;
    void logEvent("report_viewed", {
      share_token: routeToken,
      prospect_id: result.prospect_id,
      door: "door-2",
    });
  }, [routeToken, result]);

  if (!routeToken) {
    return (
      <AnyDoorPageShell backHref="/doors/url-diagnostic" backLabel="← URL diagnostic" narrow={false}>
        <div className="mx-auto max-w-md py-16 text-center">
          <p className="text-white/60">Invalid link.</p>
          <Link to="/doors/url-diagnostic" className="anydoor-exp-navlink mt-8 inline-block">
            Run a new diagnostic →
          </Link>
        </div>
      </AnyDoorPageShell>
    );
  }

  if (error && !result) {
    return (
      <AnyDoorPageShell backHref="/doors/url-diagnostic" backLabel="← URL diagnostic" narrow={false}>
        <div className="mx-auto max-w-md py-16 text-center">
          <div className="anydoor-surface-card">
            <p className="text-white/70">{error}</p>
          </div>
          <Link to="/doors/url-diagnostic" className="anydoor-exp-navlink mt-8 inline-block">
            Run a new diagnostic →
          </Link>
        </div>
      </AnyDoorPageShell>
    );
  }

  if (!result) {
    return (
      <AnyDoorPageShell backHref="/doors/url-diagnostic" backLabel="← URL diagnostic" narrow={false}>
        <div className="flex min-h-[40vh] items-center justify-center py-16">
          <div className="flex flex-col items-center gap-4">
            <div
              className="h-10 w-10 animate-spin rounded-full border-2 border-transparent"
              style={{ borderTopColor: "#c9973a", borderRightColor: "#c9973a" }}
            />
            <p className="text-sm text-white/50">Loading report…</p>
          </div>
        </div>
      </AnyDoorPageShell>
    );
  }

  return (
    <AnyDoorPageShell backHref="/doors/url-diagnostic" backLabel="← URL diagnostic" narrow={false}>
      <DiagnosticResults
        result={result}
        submittedUrl={submittedUrl}
        reportShareToken={routeToken}
        reportProspect={prospectRow}
      />
    </AnyDoorPageShell>
  );
}
