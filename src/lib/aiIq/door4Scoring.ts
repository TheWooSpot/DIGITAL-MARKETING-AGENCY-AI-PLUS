/**
 * AI IQ v3 — domain caps and scoring (Door 4 native assessment).
 * AIQ22 = Organizational Context — not included in totals.
 */

export const DOMAIN_MAX = {
  deployment_depth: 15,
  integration_maturity: 15,
  revenue_alignment: 20,
  automation_orchestration: 15,
  oversight_awareness: 10,
  team_human_readiness: 15,
  strategic_leadership: 10,
} as const;

export type DomainKey = keyof typeof DOMAIN_MAX;

export const DOMAIN_LABEL: Record<DomainKey, string> = {
  deployment_depth: "Deployment Depth",
  integration_maturity: "Integration Maturity",
  revenue_alignment: "Revenue Alignment",
  automation_orchestration: "Automation Orchestration",
  oversight_awareness: "Oversight Awareness",
  team_human_readiness: "Team & Human Readiness",
  strategic_leadership: "Strategic Leadership",
};

/** Map AIQ index (1–22) to domain; 22 = context only. */
export function domainForAiqIndex(n: number): DomainKey | "organizational_context" | null {
  if (n >= 1 && n <= 3) return "deployment_depth";
  if (n >= 4 && n <= 6) return "integration_maturity";
  if (n >= 7 && n <= 9) return "revenue_alignment";
  if (n >= 10 && n <= 12) return "automation_orchestration";
  if (n >= 13 && n <= 15) return "oversight_awareness";
  if (n >= 16 && n <= 18) return "team_human_readiness";
  if (n >= 19 && n <= 21) return "strategic_leadership";
  if (n === 22) return "organizational_context";
  return null;
}

export function parseAiqNumber(questionId: string): number {
  const m = /^AIQ(\d+)$/i.exec(questionId.trim());
  return m ? parseInt(m[1], 10) : -1;
}

export function bandLabelFromScore(score: number): string {
  const s = Math.min(100, Math.max(0, Math.round(score)));
  if (s <= 20) return "AI Absent";
  if (s <= 40) return "Experimental";
  if (s <= 60) return "Emerging";
  if (s <= 80) return "Integrated";
  return "Intelligent Infrastructure";
}

/** 0–40 → 2, 41–70 → 3, 71–100 → 4 */
export function rungFromTotalScore(score: number): 2 | 3 | 4 {
  const s = Math.min(100, Math.max(0, score));
  if (s <= 40) return 2;
  if (s <= 70) return 3;
  return 4;
}

export interface DomainScores {
  deployment_depth: number;
  integration_maturity: number;
  revenue_alignment: number;
  automation_orchestration: number;
  oversight_awareness: number;
  team_human_readiness: number;
  strategic_leadership: number;
}

const ZERO_DOMAINS: DomainScores = {
  deployment_depth: 0,
  integration_maturity: 0,
  revenue_alignment: 0,
  automation_orchestration: 0,
  oversight_awareness: 0,
  team_human_readiness: 0,
  strategic_leadership: 0,
};

/**
 * Sum option scores into domains; clamp each domain to DOMAIN_MAX.
 * `answers`: question_id -> chosen option score (AIQ22 excluded from totals).
 */
export function computeScoresFromAnswers(
  answers: Map<string, number>,
  questionIdsIncluding22: Set<string>
): { total: number; domains: DomainScores } {
  const raw = { ...ZERO_DOMAINS };
  for (const qid of questionIdsIncluding22) {
    const n = parseAiqNumber(qid);
    if (n === 22) continue;
    const d = domainForAiqIndex(n);
    if (!d || d === "organizational_context") continue;
    const pts = answers.get(qid) ?? 0;
    raw[d] += pts;
  }

  const domains = { ...ZERO_DOMAINS };
  let total = 0;
  (Object.keys(DOMAIN_MAX) as DomainKey[]).forEach((k) => {
    const max = DOMAIN_MAX[k];
    const v = Math.min(max, Math.max(0, Math.round(raw[k])));
    domains[k] = v;
    total += v;
  });

  return { total: Math.min(100, total), domains };
}
