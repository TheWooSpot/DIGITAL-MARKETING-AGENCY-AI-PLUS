/** Service catalog for Socialutely platform home (Vite). 29 services · 10 canonical categories. */

export interface PlatformService {
  id: number;
  name: string;
}

export interface PlatformCategory {
  slug: string;
  number: string;
  name: string;
  services: PlatformService[];
}

export const PLATFORM_CATEGORIES: PlatformCategory[] = [
  {
    slug: "growth-visibility",
    number: "01",
    name: "Growth & Visibility",
    services: [
      { id: 101, name: "SearchLift™ SBO Engine" },
      { id: 102, name: "DirectAlign™ Media Engine" },
      { id: 103, name: "Authority Amplifier™ PR System" },
      { id: 104, name: "Signal Surge™ Paid Traffic Lab" },
      { id: 105, name: "NearRank™ Local Discovery Engine" },
      { id: 106, name: "AutoRank™ Search Box Optimizer" },
    ],
  },
  {
    slug: "engagement-communication",
    number: "02",
    name: "Engagement & Communication",
    services: [
      { id: 201, name: "VoiceBridge™ AI ChatLabs" },
      { id: 202, name: "InboxIgnite™ Smart Email Engine" },
      { id: 203, name: "TextPulse™ SMS Automation" },
    ],
  },
  {
    slug: "appointments-conversions",
    number: "03",
    name: "Appointments & Conversions",
    services: [
      { id: 301, name: "BookStream™ Smart Scheduling Hub" },
      { id: 302, name: "CloseCraft™ Funnel Builder" },
      { id: 303, name: "DealDrive™ Proposal Automation" },
      { id: 304, name: "PayNamic™ Dynamic Checkout" },
    ],
  },
  {
    slug: "systems-operations",
    number: "04",
    name: "Systems & Operations",
    services: [
      { id: 401, name: "HubAI™ CRM Architecture" },
      { id: 402, name: "FlowForge™ Automation Lab" },
      { id: 403, name: "CommandDesk™ Client Portal System" },
    ],
  },
  {
    slug: "knowledge-activation",
    number: "05",
    name: "Knowledge & Activation",
    services: [
      { id: 501, name: "SkillSprint™ Academy" },
      { id: 502, name: "Onboardly™ Client Activation System" },
      { id: 503, name: "Adaptation™ AI Readiness Rung 2" },
    ],
  },
  {
    slug: "brand-signal",
    number: "06",
    name: "Brand & Signal",
    services: [
      { id: 601, name: "Voice & Vibe™ Production Engine" },
      { id: 602, name: "StoryFrame™ Brand Narrative Suite" },
    ],
  },
  {
    slug: "performance-insights",
    number: "07",
    name: "Performance & Insights",
    services: [{ id: 701, name: "InsightLoop™ Analytics Dashboard" }],
  },
  {
    slug: "governance-guardrails",
    number: "08",
    name: "Governance & Guardrails",
    services: [
      { id: 801, name: "TrustGuard™ Governance Layer" },
      { id: 802, name: "ReputationStack™ Reviews Engine" },
    ],
  },
  {
    slug: "partnerships-expansion",
    number: "09",
    name: "Partnerships & Expansion",
    services: [{ id: 901, name: "AllianceOS™ Growth Partnerships Engine" }],
  },
  {
    slug: "membership-access",
    number: "10",
    name: "Membership & Access",
    services: [
      { id: 1001, name: "Socialutely Circle™" },
      { id: 1002, name: "Momentum Vault™" },
      { id: 1003, name: "Concierge Access™" },
      { id: 1004, name: "AI Maturity Diagnostic & Blueprint™" },
    ],
  },
];

export const PLATFORM_SERVICE_COUNT = new Set(
  PLATFORM_CATEGORIES.flatMap((c) => c.services.map((s) => s.id))
).size;
