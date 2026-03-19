/**
 * Canonical service catalog used by the AnyDoor engine UI.
 * Keep in sync with the Supabase service catalog (28 services).
 *
 * Note: the Supabase catalog can change (deprecated IDs, renamed brands, new IDs),
 * and this mapping is what prevents the UI from showing `Service #<id>`.
 */

export interface ServiceCatalogEntry {
  id: number;
  category: string;
  name: string;
  tier: string;
}

export const SERVICE_CATALOG: readonly ServiceCatalogEntry[] = [
  { id: 101, category: "Growth & Visibility", name: "SearchLift™ SBO Engine", tier: "Unknown" },
  { id: 102, category: "Growth & Visibility", name: "DirectAlign™ Media Engine", tier: "Unknown" },
  { id: 103, category: "Growth & Visibility", name: "Authority Amplifier™ PR System", tier: "Unknown" },
  { id: 104, category: "Growth & Visibility", name: "Signal Surge™ Paid Traffic Lab", tier: "Unknown" },
  { id: 105, category: "Growth & Visibility", name: "NearRank™ Local Discovery Engine", tier: "Unknown" },
  { id: 106, category: "Growth & Visibility", name: "AutoRank™ Search Box Optimizer", tier: "Unknown" },

  { id: 201, category: "Engagement & Communication", name: "VoiceBridge™ AI ChatLabs", tier: "Unknown" },
  { id: 202, category: "Engagement & Communication", name: "InboxIgnite™ Smart Email Engine", tier: "Unknown" },
  { id: 203, category: "Engagement & Communication", name: "TextPulse™ SMS Automation", tier: "Unknown" },
  // Supabase backend may still emit deprecated legacy IDs during rollout.
  { id: 204, category: "Engagement & Communication", name: "VoiceBridge™ AI Receptionist (Deprecated)", tier: "Unknown" },
  { id: 205, category: "Knowledge & Activation", name: "AI Adaptation™", tier: "Unknown" },

  { id: 301, category: "Appointments & Conversions", name: "BookStream™ Smart Scheduling Hub", tier: "Unknown" },
  { id: 302, category: "Appointments & Conversions", name: "CloseCraft™ Funnel Builder", tier: "Unknown" },
  { id: 303, category: "Appointments & Conversions", name: "DealDrive™ Proposal Automation", tier: "Unknown" },
  { id: 304, category: "Appointments & Conversions", name: "PayPortal™ Dynamic Checkout", tier: "Unknown" },

  { id: 401, category: "Systems & Operations", name: "HubAI™ CRM Architecture", tier: "Unknown" },
  { id: 402, category: "Systems & Operations", name: "FlowForge™ Automation Lab", tier: "Unknown" },
  { id: 403, category: "Systems & Operations", name: "CommandDesk™ Client Portal System", tier: "Unknown" },

  { id: 501, category: "Knowledge & Activation", name: "SkillSprint™ Academy", tier: "Unknown" },
  { id: 502, category: "Knowledge & Activation", name: "Onboardly™ Client Activation System", tier: "Unknown" },

  { id: 601, category: "Brand & Signal", name: "Voice & Vibe™ Production Engine", tier: "Unknown" },
  { id: 602, category: "Brand & Signal", name: "StoryFrame™ Brand Narrative Suite", tier: "Unknown" },

  { id: 701, category: "Performance & Insights", name: "InsightLoop™ Analytics Dashboard", tier: "Unknown" },

  { id: 801, category: "Governance & Guardrails", name: "TrustGuard™ Governance Layer", tier: "Unknown" },
  { id: 802, category: "Governance & Guardrails", name: "ReputationStack™ Reviews Engine", tier: "Unknown" },

  { id: 901, category: "Partnerships & Expansion", name: "AllianceOS™ Growth Partnerships Engine", tier: "Unknown" },

  { id: 1001, category: "Membership & Access Layer", name: "Socialutely Circle™", tier: "Unknown" },
  { id: 1002, category: "Membership & Access Layer", name: "Momentum Vault™", tier: "Unknown" },
  { id: 1003, category: "Membership & Access Layer", name: "Concierge Access™", tier: "Unknown" },
  // Legacy catalog compatibility (if the backend still emits it).
  { id: 1004, category: "Membership & Access Layer", name: "AI Maturity Diagnostic & Blueprint™ (Legacy)", tier: "Unknown" },
] as const;

export const ALLOWED_SERVICE_IDS: readonly number[] = SERVICE_CATALOG.map((s) => s.id);

const byId = new Map<number, ServiceCatalogEntry>(
  SERVICE_CATALOG.map((s) => [s.id, s])
);

export function getServiceById(id: number): ServiceCatalogEntry | undefined {
  return byId.get(id);
}

/** Short label for UI (AnyDoor results, etc.) */
export function serviceDisplayName(id: number): string {
  return getServiceById(id)?.name ?? `Service #${id}`;
}

/** Category line for grouping in diagnostic UI */
export function serviceCategory(id: number): string | undefined {
  return getServiceById(id)?.category;
}
