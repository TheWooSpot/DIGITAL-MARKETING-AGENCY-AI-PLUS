import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useSession } from "@/context/SessionContext";
import { AnyDoorEntryScreen, AnyDoorPageShell } from "@/components/anydoor/AnyDoorExperience";
import { DiagnosticForm, type DiagnosticResult } from "./DiagnosticForm";
import { DiagnosticResults } from "./DiagnosticResults";

/**
 * D-2 · The Mirror — URL diagnostic (engineering id: Door B1 / Session B).
 * Routes: `/diagnostic` and `/doors/url-diagnostic` (same UI).
 */
export default function AnyDoorDoorB1Page() {
  const [searchParams] = useSearchParams();
  const urlParam = searchParams.get("url")?.trim() ?? "";
  const { url: sessionUrl, mergeSession } = useSession();

  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [submittedUrl, setSubmittedUrl] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!result) return;
    const id = window.requestAnimationFrame(() => {
      document.getElementById("diagnostic-report")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(id);
  }, [result]);

  return (
    <div id="anydoor-door-b1" className="anydoor-door-page min-h-screen">
      <AnyDoorPageShell narrow={!result}>
        <div className={result ? "no-print" : ""}>
          <AnyDoorEntryScreen
            eyebrow="ANYDOOR ENGINE · D-2 · THE MIRROR"
            heading="URL Multipoint Diagnostic"
            subtext1="You don't know what your business looks like from the outside."
            subtext2="See your digital presence clearly — strengths, gaps, and what to do first."
          />
        </div>

        <section id="get-started" className="mx-auto w-full">
          <DiagnosticForm
            key={urlParam || "default"}
            initialUrl={urlParam || sessionUrl}
            onResult={(r, ctx) => {
              setError("");
              setSubmittedUrl(ctx.submittedUrl);
              setResult(r);
              const bn = r.business_name?.trim();
              mergeSession({
                ...(bn ? { name: bn } : {}),
                ...(ctx.email?.trim() ? { email: ctx.email.trim() } : {}),
                url: ctx.submittedUrl,
                diagnostic_score: typeof r.scores?.overall === "number" ? r.scores.overall : null,
                scan_token: r.share_token ?? "",
                recommended_tier: r.recommended_tier ?? "",
              });
            }}
            onError={setError}
          />
          {error && <p className="mt-4 text-center text-sm text-red-400">{error}</p>}
        </section>

        {result && (
          <>
            <DiagnosticResults result={result} submittedUrl={submittedUrl} />
            <div className="no-print mt-12 text-center">
              <button
                type="button"
                onClick={() => {
                  setResult(null);
                  setSubmittedUrl("");
                }}
                className="text-sm text-white/45 underline decoration-[#c9973a]/50 hover:text-[#c9973a]"
              >
                Analyze another URL
              </button>
            </div>
          </>
        )}
      </AnyDoorPageShell>
    </div>
  );
}
