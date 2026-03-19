"use client";

import type { DiagnosticResult } from "./DiagnosticForm";

function scoreColor(score: number): string {
  if (score >= 70) return "text-[#22c55e]"; // green
  if (score >= 40) return "text-[#f59e0b]"; // amber
  return "text-[#ef4444]"; // red
}

function scoreRingColor(score: number): string {
  if (score >= 70) return "border-[#22c55e]";
  if (score >= 40) return "border-[#f59e0b]";
  return "border-[#ef4444]";
}

function ScoreCircle({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  const color = scoreColor(value);
  const ring = scoreRingColor(value);
  return (
    <div className="flex flex-col items-center">
      <div
        className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 ${ring} flex items-center justify-center bg-[#131a2b]`}
      >
        <span className={`text-xl sm:text-2xl font-bold ${color}`}>{value}</span>
      </div>
      <span className="mt-2 text-sm font-medium text-[#8b9bb5]">{label}</span>
    </div>
  );
}

interface DiagnosticResultsProps {
  result: DiagnosticResult;
}

const STRATEGY_CALL_URL = "#book-call";
const FULL_PROPOSAL_URL = "#proposal";

export function DiagnosticResults({ result }: DiagnosticResultsProps) {
  const { scores, detected_gaps, recommended_services, recommended_tier, estimated_monthly_value } =
    result;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Business name + industry */}
      <div className="text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-[#e8eef5]">
          {result.business_name}
        </h2>
        <p className="mt-1 text-[#8b9bb5]">{result.industry}</p>
        {result.estimated_size && (
          <p className="mt-0.5 text-sm text-[#6b7280]">Size: {result.estimated_size}</p>
        )}
      </div>

      {/* Three score circles */}
      <div className="grid grid-cols-3 gap-4 sm:gap-6">
        <ScoreCircle label="Visibility" value={scores?.visibility ?? 0} />
        <ScoreCircle label="Engagement" value={scores?.engagement ?? 0} />
        <ScoreCircle label="Conversion" value={scores?.conversion ?? 0} />
      </div>

      {/* Summary */}
      {result.prospect_summary && (
        <div className="rounded-lg bg-[#131a2b] border border-[#1e2a42] p-4">
          <p className="text-[#e8eef5] leading-relaxed">{result.prospect_summary}</p>
        </div>
      )}

      {/* Tier badge + estimated value */}
      <div className="flex flex-wrap items-center justify-center gap-4">
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-[#d4a843]/20 text-[#d4a843] border border-[#d4a843]/40">
          {recommended_tier}
        </span>
        <span className="text-[#8b9bb5]">
          Est. monthly value:{" "}
          <span className="font-semibold text-[#e8eef5]">
            ${estimated_monthly_value?.toLocaleString() ?? 0}
          </span>
        </span>
      </div>

      {/* Detected gaps */}
      {detected_gaps && detected_gaps.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-[#d4a843] mb-3">Detected gaps</h3>
          <ul className="space-y-2">
            {detected_gaps.map((gap, i) => (
              <li
                key={i}
                className="flex items-start gap-2 rounded-lg bg-[#131a2b] border border-[#1e2a42] p-3"
              >
                <span className="text-xs font-mono text-[#8b9bb5] shrink-0">
                  #{gap.service_id}
                </span>
                <span className="text-[#e8eef5]">{gap.gap_description}</span>
                <span
                  className={`shrink-0 text-xs font-medium ${
                    gap.priority === "high"
                      ? "text-[#ef4444]"
                      : gap.priority === "medium"
                        ? "text-[#f59e0b]"
                        : "text-[#8b9bb5]"
                  }`}
                >
                  {gap.priority}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 5 recommended service cards */}
      <div>
        <h3 className="text-lg font-semibold text-[#d4a843] mb-3">Recommended services</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {(recommended_services ?? []).slice(0, 5).map((id, i) => (
            <div
              key={i}
              className="rounded-lg bg-[#131a2b] border border-[#1e2a42] p-4 text-center"
            >
              <span className="font-mono text-[#d4a843]">Service #{id}</span>
            </div>
          ))}
        </div>
      </div>

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
        <a
          href={STRATEGY_CALL_URL}
          className="inline-flex items-center justify-center py-3 px-6 rounded-lg bg-[#d4a843] text-[#0b0f1a] font-semibold hover:bg-[#b8923a] focus:outline-none focus:ring-2 focus:ring-[#d4a843] focus:ring-offset-2 focus:ring-offset-[#0b0f1a] transition-colors"
        >
          Book a Strategy Call
        </a>
        <a
          href={FULL_PROPOSAL_URL}
          className="inline-flex items-center justify-center py-3 px-6 rounded-lg bg-transparent border-2 border-[#d4a843] text-[#d4a843] font-semibold hover:bg-[#d4a843]/10 focus:outline-none focus:ring-2 focus:ring-[#d4a843] focus:ring-offset-2 focus:ring-offset-[#0b0f1a] transition-colors"
        >
          Get Full Proposal
        </a>
      </div>
    </div>
  );
}
