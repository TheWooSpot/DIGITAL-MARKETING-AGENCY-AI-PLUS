/**
 * AI Diagnostic System - Type definitions
 * Based on Cursor_PRD_AI_Diagnostic_Dashboard.md
 */

export interface DiagnosticResponse {
  question_id: string;
  response_value: number;
}

export interface ScoreResult {
  assessment_id?: string;
  ai_iq_score: number;
  maturity_band: string;
  tier: number;
  narrative: string;
  strengths: string[];
  blind_spots: string[];
}

export interface QuestionOption {
  label: string;
  score: number;
}

export interface DiagnosticQuestion {
  id: string;
  assessment_type: string;
  domain: string;
  question_text: string;
  response_type: 'multiple_choice' | 'boolean' | 'scale';
  options: QuestionOption[];
}

export interface ScoringBand {
  assessment_type: string;
  score_min: number;
  score_max: number;
  tier: number;
  label: string;
  description: string;
}

export interface DomainWeight {
  domain: string;
  weight: number;
  max_score: number;
}
