/**
 * Door 5 — Calculator uplift (projected return, not costs).
 * 90-day total = (visibility + automation + retention monthly components) × 3
 */

export type BusinessSize = "solo" | "small" | "mid" | "enterprise";

export const BUSINESS_SIZE_LABEL: Record<BusinessSize, string> = {
  solo: "Solo",
  small: "Small (2–25)",
  mid: "Mid (26–250)",
  enterprise: "Enterprise (250+)",
};

export function sizeMultiplier(size: BusinessSize): number {
  const m: Record<BusinessSize, number> = {
    solo: 0.8,
    small: 1.0,
    mid: 1.2,
    enterprise: 1.5,
  };
  return m[size];
}

export type UpliftDimension = "visibility" | "automation" | "retention";

export type MonthlyBreakdown = {
  visibility: number;
  automation: number;
  retention: number;
  totalMonthly: number;
  total90Day: number;
};

/** monthly_spend collected for notes / analytics — not used in uplift formula per product spec. */
export function computeMonthlyBreakdown(
  monthlyRevenue: number,
  avgCustomerValue: number,
  customersPerMonth: number,
  businessSize: BusinessSize
): MonthlyBreakdown {
  const sm = sizeMultiplier(businessSize);
  const visibility = monthlyRevenue * 0.15 * sm;
  const automation = customersPerMonth * avgCustomerValue * 0.08;
  const retention = monthlyRevenue * 0.05;
  const totalMonthly = visibility + automation + retention;
  const total90Day = totalMonthly * 3;
  return {
    visibility,
    automation,
    retention,
    totalMonthly,
    total90Day,
  };
}

export function dimensionAmounts(b: MonthlyBreakdown): Record<UpliftDimension, number> {
  return {
    visibility: b.visibility,
    automation: b.automation,
    retention: b.retention,
  };
}

/** Service catalog ids — outcome copy only; no pricing. */
export const DIMENSION_SERVICES: Record<UpliftDimension, Array<{ id: number; name: string; benefit: string }>> = {
  visibility: [
    { id: 105, name: "NearRank™", benefit: "Stronger local and organic discovery where buyers already search." },
    { id: 106, name: "AutoRank™", benefit: "Structured visibility signals that compound week over week." },
  ],
  automation: [
    { id: 402, name: "FlowForge™", benefit: "Repeatable workflows so leads and handoffs don’t stall." },
    { id: 201, name: "VoiceBridge™", benefit: "Responsive AI touchpoints that keep conversations moving." },
  ],
  retention: [
    { id: 302, name: "CloseCraft™", benefit: "Clearer path from interest to commitment with less leakage." },
    { id: 301, name: "BookStream™", benefit: "Frictionless scheduling that protects momentum after the first yes." },
  ],
};

/** Pick up to 3 service ids: prioritize lowest monthly uplift buckets, then next. */
export function recommendedServiceIds(b: MonthlyBreakdown): number[] {
  const rows: Array<{ dimension: UpliftDimension; amount: number; ids: number[] }> = [
    { dimension: "visibility", amount: b.visibility, ids: DIMENSION_SERVICES.visibility.map((s) => s.id) },
    { dimension: "automation", amount: b.automation, ids: DIMENSION_SERVICES.automation.map((s) => s.id) },
    { dimension: "retention", amount: b.retention, ids: DIMENSION_SERVICES.retention.map((s) => s.id) },
  ];
  rows.sort((a, c) => a.amount - c.amount);
  const out: number[] = [];
  for (const row of rows) {
    for (const id of row.ids) {
      if (out.length >= 3) break;
      if (!out.includes(id)) out.push(id);
    }
    if (out.length >= 3) break;
  }
  return out.slice(0, 3);
}

export function servicesForResults(lowest: UpliftDimension): Array<{ id: number; name: string; benefit: string }> {
  return DIMENSION_SERVICES[lowest];
}

export function lowestDimension(b: MonthlyBreakdown): UpliftDimension {
  if (b.visibility <= b.automation && b.visibility <= b.retention) return "visibility";
  if (b.automation <= b.visibility && b.automation <= b.retention) return "automation";
  return "retention";
}
