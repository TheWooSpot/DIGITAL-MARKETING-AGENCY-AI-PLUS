export interface ServiceDetail {
  id: string;
  name: string;
  tagline: string;
  description: string;
  howItWorks: string[];
  businessImpact: string[];
  infrastructure: string;
  tier: 1 | 2 | 3;
  cta: string;
  slug?: string;
  price_monthly?: number;
  price_setup?: number;
  growth_impact?: number;
  complexity?: number;
  automation_weight?: number;
  trust_weight?: number;
  industry_bias?: number;
  checkout_variant?: "A" | "B";
}
