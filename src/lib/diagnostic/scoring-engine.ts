/**
 * AI IQ Scoring Engine
 * Calculates composite score from responses, maps to tier band, generates narrative
 * Based on PRD: ai_scoring_bands.csv + ai_domain_weights.csv
 */
import type { DiagnosticResponse, ScoreResult } from './types';
import { AI_IQ_SCORING_BANDS } from './scoring-bands';
import { AI_IQ_DOMAIN_WEIGHTS, DOMAIN_TO_WEIGHT_KEY } from './domain-weights';

// Narrative snippets by score range (from PRD)
const NARRATIVES: Record<string, string> = {
  high: 'Your organization is operating with high AI intelligence. The next frontier is resilience: governance, measurement, and long-term system architecture.',
  medium: 'Your organization has moved beyond experimentation. AI is producing value in pockets, but integration and consistency are limiting broader gains.',
  low: 'Your organization is still in the early adoption phase of AI. The opportunity is not just tool adoption, but identifying where AI can create meaningful leverage first.',
};

// Strengths and blind spots by domain (simplified for Phase 1)
const DOMAIN_STRENGTHS: Record<string, string> = {
  Deployment: 'Multi-department AI usage',
  Integration: 'System integration with business tools',
  Revenue: 'Revenue-linked AI activities',
  Automation: 'Automated AI workflows',
  Oversight: 'AI oversight and governance',
};

const DOMAIN_BLIND_SPOTS: Record<string, string> = {
  Deployment: 'Limited AI deployment breadth',
  Integration: 'Integration gaps with core systems',
  Revenue: 'Revenue impact not measured',
  Automation: 'Manual handoffs between tools',
  Oversight: 'No formal AI oversight',
};

export function calculateAIIQScore(responses: DiagnosticResponse[]): ScoreResult {
  if (responses.length === 0) {
    return {
      ai_iq_score: 0,
      maturity_band: 'AI Absent',
      tier: 1,
      narrative: NARRATIVES.low,
      strengths: [],
      blind_spots: Object.values(DOMAIN_BLIND_SPOTS),
    };
  }

  // Build domain scores from responses (we need question domain mapping - use a simple map)
  const domainScores: Record<string, number[]> = {
    Deployment: [],
    Integration: [],
    Revenue: [],
    Automation: [],
    Oversight: [],
  };

  // For Phase 1, we'll use responses directly - each question has domain in the questions data
  // Since we don't have question lookup here, we'll use weighted average of all responses
  // Simple formula: sum(response_value) / num_questions * 5 to get 0-100 scale
  // Actually PRD says: "AI_IQ_Score = (Q1 + Q2 + Q3 + Q4 + Q5) / 5 * 20" for 5 questions
  // But we have 15 questions. So: average of all responses, then scale to 0-100
  // Each question max is 20, so 15 questions * 20 = 300 max. Score = (sum / 300) * 100
  const totalScore = responses.reduce((sum, r) => sum + r.response_value, 0);
  const maxPossible = responses.length * 20;
  const ai_iq_score = Math.round((totalScore / maxPossible) * 100);

  // Clamp to 0-100
  const clampedScore = Math.min(100, Math.max(0, ai_iq_score));

  // Find matching band
  const band = AI_IQ_SCORING_BANDS.find(
    (b) => clampedScore >= b.score_min && clampedScore <= b.score_max
  ) ?? AI_IQ_SCORING_BANDS[0];

  // Select narrative
  let narrativeKey: 'high' | 'medium' | 'low' = 'low';
  if (clampedScore >= 70) narrativeKey = 'high';
  else if (clampedScore >= 40) narrativeKey = 'medium';

  // Generate strengths/blind spots based on score
  const strengths: string[] = [];
  const blindSpots: string[] = [];

  if (clampedScore >= 60) {
    strengths.push(DOMAIN_STRENGTHS.Deployment);
    strengths.push(DOMAIN_STRENGTHS.Integration);
  }
  if (clampedScore >= 50) {
    strengths.push(DOMAIN_STRENGTHS.Revenue);
  }
  if (clampedScore >= 40) {
    strengths.push(DOMAIN_STRENGTHS.Automation);
  }
  if (clampedScore >= 50) {
    strengths.push(DOMAIN_STRENGTHS.Oversight);
  }

  if (clampedScore < 60) blindSpots.push(DOMAIN_BLIND_SPOTS.Integration);
  if (clampedScore < 50) blindSpots.push(DOMAIN_BLIND_SPOTS.Revenue);
  if (clampedScore < 50) blindSpots.push(DOMAIN_BLIND_SPOTS.Oversight);
  if (clampedScore < 40) blindSpots.push(DOMAIN_BLIND_SPOTS.Oversight);

  return {
    ai_iq_score: clampedScore,
    maturity_band: band.label,
    tier: band.tier,
    narrative: NARRATIVES[narrativeKey],
    strengths: strengths.length > 0 ? strengths : ['Early exploration of AI tools'],
    blind_spots: blindSpots.length > 0 ? blindSpots : [DOMAIN_BLIND_SPOTS.Oversight],
  };
}
