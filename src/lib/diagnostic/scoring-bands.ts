/**
 * AI IQ Scoring Bands - from ai_scoring_bands.csv
 * Maps score ranges to maturity tiers
 */
import type { ScoringBand } from './types';

export const AI_IQ_SCORING_BANDS: ScoringBand[] = [
  { assessment_type: 'AI_IQ', score_min: 0, score_max: 20, tier: 1, label: 'AI Absent', description: 'Little or no meaningful AI use in operations' },
  { assessment_type: 'AI_IQ', score_min: 21, score_max: 40, tier: 2, label: 'Experimental', description: 'Isolated tools being tested; low integration' },
  { assessment_type: 'AI_IQ', score_min: 41, score_max: 60, tier: 3, label: 'Emerging', description: 'Useful AI pockets; weak orchestration' },
  { assessment_type: 'AI_IQ', score_min: 61, score_max: 80, tier: 4, label: 'Integrated', description: 'AI materially supporting core operations' },
  { assessment_type: 'AI_IQ', score_min: 81, score_max: 100, tier: 5, label: 'Intelligent Infrastructure', description: 'Coordinated; measured; strategic AI' },
];
