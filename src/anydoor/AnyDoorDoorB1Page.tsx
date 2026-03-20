import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { DiagnosticForm, type DiagnosticResult } from "./DiagnosticForm";
import { DiagnosticResults } from "./DiagnosticResults";

/**
 * AnyDoor Engine · Door b1 — URL diagnostic (Session B UI).
 * Served from the Vite app at `/doors/url-diagnostic`.
 */
export default function AnyDoorDoorB1Page() {
  const [searchParams] = useSearchParams();
  const urlParam = searchParams.get("url")?.trim() ?? "";

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
    <div
      id="anydoor-door-b1"
      className="min-h-screen"
      style={{ backgroundColor: "#07080d", cursor: "crosshair" }}
    >
      <main className="mx-auto max-w-5xl px-4 py-8 sm:py-12 lg:max-w-6xl">
        <nav className="no-print mb-8 text-center">
          <Link
            to="/"
            className="text-sm text-white/45 underline decoration-[#c9973a]/50 hover:text-[#c9973a]"
          >
            ← Platform home
          </Link>
        </nav>

        <header className={`mb-10 text-center sm:mb-14${result ? " no-print" : ""}`}>
          <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-[#c9973a]">AnyDoor Engine · Door b1</p>
          <h1
            className="mt-3 text-3xl font-light leading-tight text-white sm:text-4xl md:text-5xl"
            style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}
          >
            <span className="italic text-[#c9973a]">URL diagnostic</span>
            <span className="block text-white">Socialutely | AI Marketing Platform</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/50">
            Enter your website URL for a free digital marketing diagnostic — powered by AnyDoor Engine v12.
          </p>
        </header>

        <section id="get-started" className="mx-auto w-full max-w-md">
          <DiagnosticForm
            key={urlParam || "default"}
            initialUrl={urlParam}
            onResult={(r, ctx) => {
              setError("");
              setSubmittedUrl(ctx.submittedUrl);
              setResult(r);
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
      </main>
    </div>
  );
}
