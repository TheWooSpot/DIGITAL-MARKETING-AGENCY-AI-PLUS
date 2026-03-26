/** v12 service names + tier package definitions for AnyDoor diagnostic results */

export const SERVICE_MAP: Record<number, string> = {
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
  1001: "Socialutely Circle™",
  1002: "Momentum Vault™",
  1003: "Concierge Access™",
  1004: "AI Maturity Diagnostic & Blueprint™",
};

export type PackageTierKey = "Essentials" | "Momentum" | "Signature" | "Vanguard" | "Sovereign";

export interface PackageTierDef {
  key: PackageTierKey;
  displayName: string;
  range: string;
  bg: string;
  border: string;
  pill: string;
  serviceIds: number[];
}

/** Vanguard: curated top 12 from catalog */
const VANGUARD_12: number[] = [101, 102, 103, 104, 105, 106, 201, 202, 203, 301, 302, 401];

export const PACKAGE_TIERS: PackageTierDef[] = [
  {
    key: "Essentials",
    displayName: "Essentials",
    range: "$1,800 – $3,500/mo",
    bg: "bg-[#1a2a3a]/90",
    border: "border-blue-500/25",
    pill: "bg-blue-500/20 text-blue-300 border border-blue-500/40",
    serviceIds: [101, 105, 202, 301, 802],
  },
  {
    key: "Momentum",
    displayName: "Momentum",
    range: "$4,200 – $6,500/mo",
    bg: "bg-[#1a2e26]/90",
    border: "border-emerald-500/25",
    pill: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40",
    serviceIds: [101, 105, 201, 203, 301, 802],
  },
  {
    key: "Signature",
    displayName: "Signature",
    range: "$8,500 – $14,000/mo",
    bg: "bg-[#2a2010]/90",
    border: "border-[#c9973a]/35",
    pill: "bg-[#c9973a]/20 text-[#c9973a] border border-[#c9973a]/45",
    serviceIds: [101, 105, 201, 202, 203, 302, 401, 701, 802],
  },
  {
    key: "Vanguard",
    displayName: "Vanguard",
    range: "$18,000 – $35,000/mo",
    bg: "bg-[#221a30]/90",
    border: "border-violet-500/25",
    pill: "bg-violet-500/20 text-violet-300 border border-violet-500/40",
    serviceIds: VANGUARD_12,
  },
  {
    key: "Sovereign",
    displayName: "Sovereign",
    range: "$15,000+/mo",
    bg: "bg-[#1a2a2a]/90",
    border: "border-teal-500/25",
    pill: "bg-teal-500/20 text-teal-300 border border-teal-500/40",
    serviceIds: [601, 304, 801, 901, 701],
  },
];

export function serviceName(id: number, fallback?: string): string {
  return fallback ?? SERVICE_MAP[id] ?? `Service #${id}`;
}
