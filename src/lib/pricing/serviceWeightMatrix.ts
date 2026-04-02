/**
 * Dynamic pricing / weight matrix for calculators and tier surfacing.
 * Tier recommendations in AnyDoor reports come from the diagnostic API (maturity + context),
 * not from selecting rows in this table — see DiagnosticResults + prospect-diagnostic.
 */

import { SERVICE_CATALOG } from "@/lib/services/serviceCatalog";
import { SERVICE_304_DEFINITION } from "@/data/service304Definition";

export type DynamicPricingServiceRow = {
  id: number;
  name: string;
  cat: string;
  tier: string;
  slug?: string;
  price: number;
  priceSetup?: number;
  growth: number;
  complexity: number;
  automation: number;
  trust: number;
  industryBias: number;
  description?: string;
};

const DEFAULT_WEIGHTS = {
  growth: 2,
  complexity: 2,
  automation: 2,
  trust: 2,
  industryBias: 1.0,
  price: 0,
  priceSetup: 0,
};

function tierFromCatalog(t: string): string {
  return t !== "Unknown" ? t : "Momentum";
}

/** Full matrix (29 services): explicit weights for 304; defaults elsewhere until priced. */
export const DYNAMIC_PRICING_SERVICE_MATRIX: DynamicPricingServiceRow[] = SERVICE_CATALOG.map((s) => {
  if (s.id === 304) {
    const d = SERVICE_304_DEFINITION;
    return {
      id: d.id,
      name: "PayNamic™ Dynamic Checkout",
      cat: d.category ?? "Appointments & Conversions",
      tier: d.tier ?? "Momentum",
      slug: d.slug,
      price: d.price_monthly ?? 397,
      priceSetup: d.price_setup ?? 297,
      growth: d.growth_impact ?? 3,
      complexity: d.complexity ?? 2,
      automation: d.automation_weight ?? 4,
      trust: d.trust_weight ?? 2,
      industryBias: d.industry_bias ?? 1.0,
      description: d.description,
    };
  }
  return {
    id: s.id,
    name: s.name,
    cat: s.category,
    tier: tierFromCatalog(s.tier),
    price: DEFAULT_WEIGHTS.price,
    priceSetup: DEFAULT_WEIGHTS.priceSetup,
    growth: DEFAULT_WEIGHTS.growth,
    complexity: DEFAULT_WEIGHTS.complexity,
    automation: DEFAULT_WEIGHTS.automation,
    trust: DEFAULT_WEIGHTS.trust,
    industryBias: DEFAULT_WEIGHTS.industryBias,
  };
});

export function getDynamicPricingRow(id: number): DynamicPricingServiceRow | undefined {
  return DYNAMIC_PRICING_SERVICE_MATRIX.find((r) => r.id === id);
}
