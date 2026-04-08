/** Catalog names for Door 3 recommended service IDs (Stripe / platform alignment). */
export const DOOR3_SERVICE_NAMES: Record<number, string> = {
  101: "SearchLift™",
  105: "NearRank™",
  106: "AutoRank™",
  201: "VoiceBridge™",
  202: "InboxIgnite™",
  203: "TextPulse™",
  301: "BookStream™",
  302: "CloseCraft™",
  303: "DealDrive™",
  401: "HubAI™",
  402: "FlowForge™",
  502: "Onboardly™",
  601: "Voice & Vibe™",
  701: "InsightLoop™",
  801: "TrustGuard™",
  901: "AllianceOS™",
};

export function door3ServiceName(id: number): string {
  return DOOR3_SERVICE_NAMES[id] ?? `Service ${id}`;
}
