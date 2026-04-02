import { PACKAGE_TIERS, type PackageTierKey, SERVICE_MAP, serviceName } from "@/anydoor/diagnosticCatalog";

/** Excluded from `/your-package`: AI Readiness Labs rungs + retired tier SKUs (still in `SERVICE_MAP` for diagnostics). */
const PACKAGE_BUILDER_EXCLUDED_IDS = new Set<number>([503, 1003]);

/** Commercial catalog for the post-diagnostic builder — exactly 27 services. */
export const PACKAGE_BUILDER_SERVICE_IDS: number[] = Object.keys(SERVICE_MAP)
  .map(Number)
  .filter((id) => !PACKAGE_BUILDER_EXCLUDED_IDS.has(id))
  .sort((a, b) => a - b);

if (PACKAGE_BUILDER_SERVICE_IDS.length !== 27) {
  throw new Error(`packageBuilderCatalog: expected 27 commercial services, got ${PACKAGE_BUILDER_SERVICE_IDS.length}`);
}

export interface PackageBuilderServiceDef {
  id: number;
  name: string;
  category: string;
  monthlyPrice: number;
  /** Optional longer blurb (e.g. PayNamic™). */
  description?: string;
}

function categoryForId(id: number): string {
  if (id >= 1001) return "Circle & concierge";
  if (id === 901) return "Partnerships";
  if (id >= 801 && id <= 802) return "Trust & reputation";
  if (id === 701) return "Analytics";
  if (id >= 601 && id <= 602) return "Creative & brand";
  if (id >= 501 && id <= 502) return "Enablement";
  if (id >= 401 && id <= 403) return "CRM & automation";
  if (id >= 301 && id <= 304) return "Conversion systems";
  if (id >= 201 && id <= 203) return "Conversations & messaging";
  if (id >= 101 && id <= 106) return "Search & discovery";
  return "Services";
}

/** Per-ID copy overrides for the package builder (canonical names live in `SERVICE_MAP`). */
const BUILDER_DESCRIPTIONS: Partial<Record<number, string>> = {
  304: "Dynamic checkout, conditional pricing logic, bundle-building & payment orchestration engine",
};

/** Illustrative monthly retainers for package math (aligned loosely with tier positioning). */
const MONTHLY_PRICE: Record<number, number> = {
  101: 1200,
  102: 1400,
  103: 1800,
  104: 2200,
  105: 900,
  106: 750,
  201: 1100,
  202: 800,
  203: 650,
  301: 700,
  302: 950,
  303: 800,
  304: 1300,
  401: 1500,
  402: 1800,
  403: 1200,
  501: 600,
  502: 550,
  601: 2800,
  602: 1600,
  701: 900,
  801: 1100,
  802: 750,
  901: 2000,
  1001: 3500,
  1002: 4200,
  1004: 1500,
};

export function getPackageBuilderService(id: number): PackageBuilderServiceDef {
  return {
    id,
    name: serviceName(id),
    category: categoryForId(id),
    monthlyPrice: MONTHLY_PRICE[id] ?? 1200,
    description: BUILDER_DESCRIPTIONS[id],
  };
}

/** First tier package (in pathway order) that lists this service, or `null` if not on a tier menu. */
export function lowestTierForService(serviceId: number): PackageTierKey | null {
  for (const tier of PACKAGE_TIERS) {
    if (tier.serviceIds.includes(serviceId)) return tier.key;
  }
  return null;
}

export function tierAssociationLabel(serviceId: number): string {
  const t = lowestTierForService(serviceId);
  return t ? `Included in ${t} and above` : "Custom stack add-on";
}
