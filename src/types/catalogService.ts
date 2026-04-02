/**
 * Extended catalog fields for pricing / weight matrix and checkout experiments.
 * Base rows may omit optional fields; Service 304 is fully specified in code.
 */

export interface CatalogService {
  id: number;
  name: string;
  category: string;
  tier: string;
  slug?: string;
  price_monthly?: number;
  price_setup?: number;
  description?: string;
  growth_impact?: number;
  complexity?: number;
  automation_weight?: number;
  trust_weight?: number;
  industry_bias?: number;
  checkout_variant?: "A" | "B";
}
