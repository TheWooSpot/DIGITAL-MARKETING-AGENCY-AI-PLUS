export type DiscoveryDomain =
  | "situation"
  | "problem"
  | "consequence"
  | "goal"
  | "solution"
  | "priority"
  | "context";

export type DiscoveryQuestion = {
  id: string;
  question: string;
  placeholder: string;
  domain: DiscoveryDomain;
  /** Short mindset line shown above the question (Claude-generated). */
  encouragement?: string;
};

export type Door3PerQuestionReflection = {
  domain: string;
  question: string;
  interpretation: string;
};

export type Door3Analysis = {
  /** Legacy single narrative; optional when structured sections are present. */
  discovery_narrative?: string;
  primary_gap: string;
  core_tension?: string;
  per_question_reflections?: Door3PerQuestionReflection[];
  grace_note?: string;
  top_gaps?: string[];
  recommended_services: Array<{
    service_id: number;
    reason: string;
    what_it_is?: string;
    benefit_for_you?: string;
  }>;
  recommended_tier: string;
  next_step: string;
  next_step_reason: string;
  industry?: string;
  business_descriptor?: string | null;
};

export type NextStepKey = "diagnostic" | "ai-iq" | "calculator" | "dream";
