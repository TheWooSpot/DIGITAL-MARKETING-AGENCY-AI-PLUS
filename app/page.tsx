"use client";

import { useState } from "react";
import { DiagnosticForm, type DiagnosticResult } from "./components/DiagnosticForm";
import { DiagnosticResults } from "./components/DiagnosticResults";

export default function AnyDoorPage() {
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [error, setError] = useState("");

  return (
    <div className="min-h-screen bg-[#0b0f1a]">
      <main className="container mx-auto px-4 py-8 sm:py-12 max-w-4xl">
        {/* Hero */}
        <header className="text-center mb-10 sm:mb-14">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#e8eef5] leading-tight">
            Discover What&apos;s Holding Your Business Back
          </h1>
          <p className="mt-4 text-lg sm:text-xl text-[#8b9bb5] max-w-2xl mx-auto">
            Enter your website URL for a free 30-second digital marketing diagnostic
          </p>
        </header>

        {/* Form or loading / results */}
        {!result ? (
          <>
            <DiagnosticForm
              onResult={(r) => {
                setError("");
                setResult(r);
              }}
              onError={setError}
            />
            {error && (
              <p className="mt-4 text-center text-[#ef4444] text-sm">{error}</p>
            )}
          </>
        ) : (
          <DiagnosticResults result={result} />
        )}

        {/* Optional: run again */}
        {result && (
          <div className="mt-12 text-center">
            <button
              type="button"
              onClick={() => setResult(null)}
              className="text-sm text-[#8b9bb5] hover:text-[#d4a843] underline focus:outline-none"
            >
              Analyze another URL
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
