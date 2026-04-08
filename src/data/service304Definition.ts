import type { CatalogService } from "@/types/catalogService";

/** Canonical definition for Service ID 304 — PayNamic™ Dynamic Checkout Engine */
export const SERVICE_304_DEFINITION: CatalogService = {
  id: 304,
  name: "PayNamic™ Dynamic Checkout Engine",
  slug: "paynamic",
  category: "Appointments & Conversions",
  tier: "Momentum",
  price_monthly: 397,
  price_setup: 297,
  description:
    "Dynamic checkout, conditional pricing logic, bundle-building & payment orchestration engine",
  growth_impact: 3,
  complexity: 2,
  automation_weight: 4,
  trust_weight: 2,
  industry_bias: 1.0,
};
