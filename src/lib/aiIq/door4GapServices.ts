import type { DomainKey } from "./door4Scoring";
import { DOMAIN_LABEL, DOMAIN_MAX } from "./door4Scoring";

/** Low domain → infrastructure service IDs (product catalog). */
export const DOMAIN_TO_SERVICE_IDS: Record<DomainKey, number[]> = {
  deployment_depth: [201],
  integration_maturity: [402, 403],
  revenue_alignment: [302],
  automation_orchestration: [402],
  oversight_awareness: [801],
  team_human_readiness: [501],
  strategic_leadership: [901],
};

export const SERVICE_LABELS: Record<number, string> = {
  201: "VoiceBridge™",
  402: "FlowForge™",
  403: "CommandDesk™",
  302: "CloseCraft™",
  801: "TrustGuard™",
  501: "SkillSprint™",
  901: "AllianceOS™",
};

export interface GapDomainBlock {
  domain: string;
  services: Array<{ serviceId: number; label: string }>;
}

/**
 * Two weakest domains (by score / max). Each domain lists its mapped services.
 */
export function topGapDomains(domains: Record<DomainKey, number>): GapDomainBlock[] {
  const entries = (Object.keys(domains) as DomainKey[]).map((k) => ({
    key: k,
    ratio: DOMAIN_MAX[k] > 0 ? domains[k] / DOMAIN_MAX[k] : 1,
  }));
  entries.sort((a, b) => a.ratio - b.ratio);

  const out: GapDomainBlock[] = [];
  for (const e of entries) {
    if (out.length >= 2) break;
    const ids = DOMAIN_TO_SERVICE_IDS[e.key];
    out.push({
      domain: DOMAIN_LABEL[e.key],
      services: ids.map((serviceId) => ({
        serviceId,
        label: SERVICE_LABELS[serviceId] ?? `Service ${serviceId}`,
      })),
    });
  }
  return out;
}
