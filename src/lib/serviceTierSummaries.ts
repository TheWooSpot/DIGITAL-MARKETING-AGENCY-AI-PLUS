import servicesJson from "@/data/services.json";
import type { PackageTierKey } from "@/anydoor/diagnosticCatalog";
import { serviceName } from "@/anydoor/diagnosticCatalog";

type SummariesJson = {
  summariesByTier: Record<string, string>;
  serviceOverrides?: Record<string, Record<string, string>>;
};

const data = servicesJson as SummariesJson;

function fillTemplate(tpl: string, service: string, business: string, industry: string): string {
  return tpl
    .replace(/\{\{service\}\}/g, service)
    .replace(/\{\{business\}\}/g, business)
    .replace(/\{\{industry\}\}/g, industry);
}

/** Tier-specific impact line for package columns (intensity rises with tier). */
export function getServiceSummaryForTier(
  serviceId: number,
  tier: PackageTierKey,
  businessName: string,
  industry: string
): string {
  const name = serviceName(serviceId);
  const overrides = data.serviceOverrides?.[String(serviceId)];
  const tpl = overrides?.[tier] ?? data.summariesByTier?.[tier];
  if (tpl) return fillTemplate(tpl, name, businessName, industry);
  return `Supports ${name} for ${businessName} — tailored to your ${industry} motion and growth stage.`;
}

