/**
 * Prospect diagnostic → tier and service recommendations.
 * Uses tier_routing.csv and service_routing_matrix.csv logic.
 * Phase 1: only AI IQ score is available; governance/competency/risk come in Phase 3.
 */

export interface ServiceRecommendation {
  id: string;
  name: string;
  priority: 'high' | 'medium' | 'critical';
  rationale: string;
}

export interface RoutingResult {
  recommendedTier: string;
  recommendedMembership: string;
  recommendedServices: ServiceRecommendation[];
}

// Tier rules (from tier_routing.csv) — evaluated in order, first match wins.
// Phase 1: we only have ai_iq_score; governance/risk/competency simplified.
function getTierFromScore(ai_iq_score: number): { tier: string; membership: string } {
  if (ai_iq_score < 40)
    return { tier: 'Essentials', membership: 'Socialutely Circle™' };
  if (ai_iq_score <= 65)
    return { tier: 'Momentum', membership: 'Momentum Vault™' };
  return { tier: 'Signature', membership: 'Concierge Access™' };
}

// Service rules we can evaluate with only AI IQ (from service_routing_matrix.csv).
// Deployment row: AI IQ < 40 → foundation services.
// Higher bands: suggest next-step services (diagnostic, governance, analytics).
const SERVICE_RULES: Array<{
  condition: (score: number) => boolean;
  services: ServiceRecommendation[];
}> = [
  {
    condition: (s) => s < 40,
    services: [
      { id: '201', name: 'VoiceBridge™ AI ChatLabs', priority: 'high', rationale: 'Foundation for AI engagement and conversational capture' },
      { id: '106', name: 'AutoRank™ Search Box Optimizer', priority: 'high', rationale: 'Improves discovery surfaces for faster inbound qualification' },
      { id: '301', name: 'BookStream™ Smart Scheduling Hub', priority: 'high', rationale: 'Core conversion infrastructure' },
      { id: '401', name: 'HubAI™ CRM Architecture', priority: 'high', rationale: 'Foundational system clarity needed' },
    ],
  },
  {
    condition: (s) => s >= 40 && s < 65,
    services: [
      { id: '402', name: 'FlowForge™ Automation Lab', priority: 'high', rationale: 'Connect tools; reduce manual work' },
      { id: '501', name: 'SkillSprint™ Academy', priority: 'high', rationale: 'Train team on AI workflows' },
      { id: '701', name: 'InsightLoop™ Analytics Dashboard', priority: 'medium', rationale: 'Measure what\'s working; iterate' },
      { id: '205', name: 'AI Adaptation™', priority: 'high', rationale: 'Unblock scaling with tailored AI adaptation guidance' },
    ],
  },
  {
    condition: (s) => s >= 65,
    services: [
      { id: '205', name: 'AI Adaptation™', priority: 'high', rationale: 'Strategic guidance on advanced AI adaptation' },
      { id: '801', name: 'TrustGuard™ Governance Layer', priority: 'high', rationale: 'Critical when AI is customer-facing' },
      { id: '901', name: 'AllianceOS™ Growth Partnerships Engine', priority: 'medium', rationale: 'High capability; leverage partnerships' },
    ],
  },
];

/**
 * Get tier + membership + service recommendations for a prospect from their AI IQ score.
 */
export function getRecommendations(ai_iq_score: number): RoutingResult {
  const { tier, membership } = getTierFromScore(ai_iq_score);
  const clamped = Math.min(100, Math.max(0, ai_iq_score));
  const rule = SERVICE_RULES.find((r) => r.condition(clamped));
  const recommendedServices = rule?.services ?? [];
  return {
    recommendedTier: tier,
    recommendedMembership: membership,
    recommendedServices,
  };
}
