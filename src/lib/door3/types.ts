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
};

export type Door3Analysis = {
  discovery_narrative: string;
  primary_gap: string;
  recommended_services: Array<{ service_id: number; reason: string }>;
  recommended_tier: string;
  next_step: string;
  next_step_reason: string;
  industry?: string;
  business_descriptor?: string | null;
};

export type NextStepKey = "diagnostic" | "ai-iq" | "calculator" | "dream";
