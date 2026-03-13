/**
 * AI IQ Domain Weights - from ai_domain_weights.csv
 * Maps question domains to scoring weights
 */
import type { DomainWeight } from './types';

// Domain name mapping: question domain -> weight key
export const DOMAIN_TO_WEIGHT_KEY: Record<string, string> = {
  Deployment: 'Deployment Depth',
  Integration: 'Integration Maturity',
  Revenue: 'Revenue Alignment',
  Automation: 'Automation Orchestration',
  Oversight: 'Oversight Awareness',
};

export const AI_IQ_DOMAIN_WEIGHTS: DomainWeight[] = [
  { domain: 'Deployment Depth', weight: 0.2, max_score: 20 },
  { domain: 'Integration Maturity', weight: 0.2, max_score: 20 },
  { domain: 'Revenue Alignment', weight: 0.25, max_score: 20 },
  { domain: 'Automation Orchestration', weight: 0.2, max_score: 20 },
  { domain: 'Oversight Awareness', weight: 0.15, max_score: 20 },
];
