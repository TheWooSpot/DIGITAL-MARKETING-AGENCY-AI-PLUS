"use client";

import type { DiagnosticResult } from "./DiagnosticForm";

const SERVICE_MAP: Record<number, string> = {
  101: "SearchLift™ SBO Engine",
  102: "DirectAlign™ Media Engine",
  103: "Authority Amplifier™ PR System",
  104: "Signal Surge™ Paid Traffic Lab",
  105: "NearRank™ Local Discovery Engine",
  106: "AutoRank™ Search Box Optimizer",
  201: "VoiceBridge™ AI ChatLabs",
  202: "InboxIgnite™ Smart Email Engine",
  203: "TextPulse™ SMS Automation",
  205: "AI Adaptation™",
  301: "BookStream™ Smart Scheduling Hub",
  302: "CloseCraft™ Funnel Builder",
  303: "DealDrive™ Proposal Automation",
  304: "PayPortal™ Dynamic Checkout",
  401: "HubAI™ CRM Architecture",
  402: "FlowForge™ Automation Lab",
  403: "CommandDesk™ Client Portal System",
  501: "SkillSprint™ Academy",
  502: "Onboardly™ Client Activation System",
  601: "Voice & Vibe™ Production Engine",
  602: "StoryFrame™ Brand Narrative Suite",
  701: "InsightLoop™ Analytics Dashboard",
  801: "TrustGuard™ Governance Layer",
  802: "ReputationStack™ Reviews Engine",
  901: "AllianceOS™ Growth Partnerships Engine",
};

type Priority = "high" | "medium" | "low" | string;

function priorityBadgeClasses(priority: Priority): string {
  if (priority === "high") return "bg-[#ef4444]/15 text-[#ef4444] border-[#ef4444]/40";
  if (priority === "medium") return "bg-[#f59e0b]/15 text-[#f59e0b] border-[#f59e0b]/40";
  if (priority === "low") return "bg-[#22c55e]/15 text-[#22c55e] border-[#22c55e]/40";
  return "bg-[#8b9bb5]/10 text-[#8b9bb5] border-[#1e2a42]";
}

function tierBadgeClasses(tier: string | undefined): string {
  if (tier === "Essentials") return "bg-[#3b82f6]/20 text-[#3b82f6] border-[#3b82f6]/40";
  if (tier === "Momentum") return "bg-[#22c55e]/20 text-[#22c55e] border-[#22c55e]/40";
  if (tier === "Signature") return "bg-[#d4a843]/20 text-[#d4a843] border-[#d4a843]/40";
  if (tier === "Vanguard") return "bg-[#8b5cf6]/20 text-[#8b5cf6] border-[#8b5cf6]/40";
  return "bg-[#d4a843]/20 text-[#d4a843] border-[#d4a843]/40";
}

function formatMoneyPerMonth(value: number | undefined): string {
  const n = typeof value === "number" && !Number.isNaN(value) ? value : 0;
  return `$${n.toLocaleString()}/mo`;
}

function getServiceName(serviceId: number, serviceName?: string): string {
  return serviceName ?? SERVICE_MAP[serviceId] ?? `Service #${serviceId}`;
}

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
  const {
    business_name,
    industry,
    estimated_size,
    scores,
    detected_gaps,
    recommended_services,
    recommended_tier,
    prospect_summary,
    estimated_monthly_value,
  } = result;

  const normalizedDetectedGaps = (detected_gaps ?? []).map((gap) => ({
    service_id: gap.service_id,
    service_name: getServiceName(gap.service_id, gap.service_name),
    gap_description: gap.gap_description,
    priority: gap.priority,
  }));

  const normalizedRecommendedServices = ((recommended_services ?? []) as Array<
    number | { service_id: number; service_name?: string; reason?: string }
  >).slice(0, 5).map((item) => {
    if (typeof item === "number") {
      return {
        service_id: item,
        service_name: getServiceName(item),
        reason: "",
      };
    }

    return {
      service_id: item.service_id,
      service_name: getServiceName(item.service_id, item.service_name),
      reason: item.reason ?? "",
    };
  });

  return (
    <div className="w-full max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Business header */}
      <div className="text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-[#e8eef5]">{business_name}</h2>
        <p className="mt-1 text-[#8b9bb5]">
          {industry}
          {estimated_size ? ` • ${estimated_size}` : ""}
        </p>
      </div>

      {/* Three score circles */}
      <div className="grid grid-cols-3 gap-4 sm:gap-6">
        <ScoreCircle label="Visibility" value={scores?.visibility ?? 0} />
        <ScoreCircle label="Engagement" value={scores?.engagement ?? 0} />
        <ScoreCircle label="Conversion" value={scores?.conversion ?? 0} />
      </div>

      {/* Prospect narrative (highlighted) */}
      {prospect_summary && (
        <div className="rounded-lg bg-[#d4a843]/10 border border-[#d4a843]/30 p-4">
          <p className="text-[#e8eef5] leading-relaxed">{prospect_summary}</p>
        </div>
      )}

      {/* Tier badge + estimated value */}
      <div className="flex flex-wrap items-center justify-center gap-4">
        {recommended_tier && (
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${tierBadgeClasses(
              recommended_tier
            )}`}
          >
            {recommended_tier}
          </span>
        )}
        <span className="text-[#8b9bb5]">
          Est. monthly value:{" "}
          <span className="font-semibold text-[#e8eef5]">{formatMoneyPerMonth(estimated_monthly_value)}</span>
        </span>
      </div>

      {/* Detected gaps */}
      {normalizedDetectedGaps.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-[#d4a843] mb-3">Detected gaps</h3>
          <ul className="space-y-2">
            {normalizedDetectedGaps.map((gap) => (
              <li
                key={`${gap.service_id}-${gap.gap_description}`}
                className="rounded-lg bg-[#131a2b] border border-[#1e2a42] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[#e8eef5] font-semibold leading-snug">{gap.service_name}</p>
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold border ${priorityBadgeClasses(
                      gap.priority
                    )}`}
                  >
                    {gap.priority}
                  </span>
                </div>
                <p className="mt-2 text-[#8b9bb5] leading-relaxed">{gap.gap_description}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommended services */}
      <div>
        <h3 className="text-lg font-semibold text-[#d4a843] mb-3">Recommended services</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {normalizedRecommendedServices.map((svc, idx) => (
            <div
              key={`${svc.service_id}-${idx}`}
              className="rounded-lg bg-[#131a2b] border border-[#1e2a42] p-4 text-left"
            >
              <p className="text-sm font-semibold text-[#e8eef5] leading-snug">{svc.service_name}</p>
              <p className="mt-2 text-xs text-[#8b9bb5] leading-relaxed">
                {svc.reason || "Recommended based on your diagnostic results."}
              </p>
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
