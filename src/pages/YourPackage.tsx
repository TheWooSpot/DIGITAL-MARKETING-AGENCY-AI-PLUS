import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AnyDoorHero, AnyDoorPageShell } from "@/components/anydoor/AnyDoorExperience";
import type { PackageTierKey } from "@/anydoor/diagnosticCatalog";

const GOLD = "#c9973a";
const CHECKOUT_FN_PATH = "/functions/v1/create-checkout-session";

const LOAD_PACKAGE_URL = (() => {
  const base = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
  if (!base) return "/functions/v1/load-your-package";
  return `${base.replace(/\/$/, "")}/functions/v1/load-your-package`;
})();

function getCheckoutFunctionUrl(): string {
  const base = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
  if (!base) return CHECKOUT_FN_PATH;
  return `${base.replace(/\/$/, "")}${CHECKOUT_FN_PATH}`;
}

function formatMoney(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
    n
  );
}

function bundleDiscountRate(selectedCount: number): number {
  if (selectedCount >= 5) return 0.15;
  if (selectedCount >= 3) return 0.08;
  return 0;
}

function normalizeTierKey(raw: string | null): PackageTierKey {
  const normalized = (raw ?? "").trim().toLowerCase();
  if (normalized === "momentum") return "Momentum";
  if (normalized === "signature") return "Signature";
  if (normalized === "vanguard") return "Vanguard";
  if (normalized === "sovereign") return "Sovereign";
  return "Essentials";
}

type LoadYourPackageTotals = {
  a_la_carte_monthly: number;
  bundle_discount_pct: number;
  bundle_monthly: number;
  setup_total: number;
};

type LoadYourPackageResponse = {
  prospect: {
    id?: string;
    business_name?: string | null;
    url?: string | null;
    overall_score?: number | null;
    recommended_tier?: string | null;
    source?: string | null;
    call_type?: string | null;
    assigned_rung?: number | null;
  };
  services: unknown;
  totals: LoadYourPackageTotals;
};

type DisplayedService = {
  service_id: number;
  service_name: string;
  pricing_tier: string | null;
  retail_price_low: number | null;
  initiation_fee_low: number | null;
  stripe_monthly_price_id: string | null;
  stripe_setup_price_id: string | null;
  tier_summary?: string;
};

function toDisplayedServices(raw: unknown): DisplayedService[] {
  if (!Array.isArray(raw)) return [];
  const out: DisplayedService[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const id = Number(r.service_id);
    if (!Number.isFinite(id)) continue;
    out.push({
      service_id: Math.trunc(id),
      service_name: String(r.service_name ?? ""),
      pricing_tier: r.pricing_tier == null || r.pricing_tier === "" ? null : String(r.pricing_tier),
      retail_price_low: r.retail_price_low == null ? null : Number(r.retail_price_low),
      initiation_fee_low: r.initiation_fee_low == null ? null : Number(r.initiation_fee_low),
      stripe_monthly_price_id: r.stripe_monthly_price_id == null ? null : String(r.stripe_monthly_price_id),
      stripe_setup_price_id: r.stripe_setup_price_id == null ? null : String(r.stripe_setup_price_id),
      tier_summary: typeof r.tier_summary === "string" && r.tier_summary.trim() ? r.tier_summary.trim() : undefined,
    });
  }
  return out;
}

export default function YourPackage() {
  const [searchParams] = useSearchParams();
  const queryRecommendedTier = normalizeTierKey(searchParams.get("tier"));
  const [recommendedTier, setRecommendedTier] = useState<PackageTierKey>(queryRecommendedTier);
  const [loadedProspect, setLoadedProspect] = useState<LoadYourPackageResponse["prospect"] | null>(null);
  const [packageTotals, setPackageTotals] = useState<LoadYourPackageTotals | null>(null);
  const businessName = useMemo(() => {
    const fromApi = loadedProspect?.business_name?.trim();
    if (fromApi) return fromApi;
    const raw = searchParams.get("name")?.trim();
    if (!raw) return "Your brand";
    try {
      return decodeURIComponent(raw.replace(/\+/g, " "));
    } catch {
      return raw.replace(/\+/g, " ");
    }
  }, [loadedProspect, searchParams]);

  const score = useMemo(() => {
    const s =
      loadedProspect?.overall_score != null && Number.isFinite(Number(loadedProspect.overall_score))
        ? Number(loadedProspect.overall_score)
        : Number(searchParams.get("score") ?? "0");
    return Number.isFinite(s) ? Math.round(Math.min(100, Math.max(0, s))) : 0;
  }, [loadedProspect, searchParams]);

  const [displayedServices, setDisplayedServices] = useState<DisplayedService[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [servicesError, setServicesError] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const prospectId = searchParams.get("prospect_id")?.trim() || "";
  const companySize = searchParams.get("business_size")?.trim() || "";
  const sourceFromQuery = searchParams.get("source")?.trim() || "";
  const callTypeFromQuery = searchParams.get("call_type")?.trim() || "";
  const assignedRungFromQuery = Number(searchParams.get("assigned_rung") ?? "");
  const [prospectMeta, setProspectMeta] = useState<{ source: string; call_type: string; assigned_rung: number | null } | null>(null);
  const [prospectMetaLoading, setProspectMetaLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadPackage() {
      if (!prospectId) {
        setDisplayedServices([]);
        setPackageTotals(null);
        setLoadedProspect(null);
        setServicesError("Missing prospect_id in URL.");
        setProspectMetaLoading(false);
        setServicesLoading(false);
        return;
      }
      setServicesLoading(true);
      setProspectMetaLoading(true);
      setServicesError(null);
      try {
        const res = await fetch(LOAD_PACKAGE_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prospect_id: prospectId }),
        });
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`load-your-package ${res.status}: ${errText}`);
        }
        const data = (await res.json()) as LoadYourPackageResponse;
        if (cancelled) return;

        setLoadedProspect(data.prospect);
        setProspectMeta({
          source: data.prospect?.source != null ? String(data.prospect.source).trim() : "",
          call_type: data.prospect?.call_type != null ? String(data.prospect.call_type).trim() : "",
          assigned_rung:
            data.prospect?.assigned_rung != null && typeof data.prospect.assigned_rung === "number"
              ? data.prospect.assigned_rung
              : null,
        });
        setRecommendedTier(normalizeTierKey(data.prospect?.recommended_tier ?? null));
        setPackageTotals(
          data.totals && typeof data.totals === "object"
            ? {
                a_la_carte_monthly: Number(data.totals.a_la_carte_monthly),
                bundle_discount_pct: Number(data.totals.bundle_discount_pct),
                bundle_monthly: Number(data.totals.bundle_monthly),
                setup_total: Number(data.totals.setup_total),
              }
            : null
        );
        setDisplayedServices(toDisplayedServices(data.services));

        setProspectMetaLoading(false);
        setServicesLoading(false);
      } catch (err) {
        if (cancelled) return;
        setDisplayedServices([]);
        setPackageTotals(null);
        setLoadedProspect(null);
        setProspectMeta(null);
        setServicesError(err instanceof Error ? err.message : String(err));
        setProspectMetaLoading(false);
        setServicesLoading(false);
      }
    }
    void loadPackage();
    return () => {
      cancelled = true;
    };
  }, [prospectId]);

  const source = (prospectMeta?.source || sourceFromQuery).toLowerCase();
  const callType = (prospectMeta?.call_type || callTypeFromQuery).toLowerCase();
  const assignedRung =
    typeof prospectMeta?.assigned_rung === "number"
      ? prospectMeta.assigned_rung
      : Number.isFinite(assignedRungFromQuery)
        ? assignedRungFromQuery
        : null;
  const isSovereignTier = recommendedTier === "Sovereign";
  const isAiIqEntry =
    source === "door9" || source === "ai_iq" || source === "door4-ai-iq" || callType === "ai_iq" || assignedRung === 4;
  const routeToDiscoveryCall = isSovereignTier && isAiIqEntry;
  const sovereignRoutingPending =
    isSovereignTier &&
    !!prospectId &&
    !sourceFromQuery &&
    !callTypeFromQuery &&
    !Number.isFinite(assignedRungFromQuery) &&
    prospectMetaLoading &&
    !prospectMeta;

  const selectedServiceIds = useMemo(() => displayedServices.map((service) => service.service_id), [displayedServices]);
  const discount = bundleDiscountRate(selectedServiceIds.length);
  const aLaCarteTotal = useMemo(() => {
    if (packageTotals != null && Number.isFinite(packageTotals.a_la_carte_monthly)) {
      return packageTotals.a_la_carte_monthly;
    }
    return displayedServices.reduce((sum, service) => sum + (service.retail_price_low ?? 0), 0);
  }, [packageTotals, displayedServices]);

  const bundleMonthly = useMemo(() => {
    if (packageTotals != null && Number.isFinite(packageTotals.bundle_monthly)) {
      return packageTotals.bundle_monthly;
    }
    return Math.round(aLaCarteTotal * (1 - discount));
  }, [packageTotals, aLaCarteTotal, discount]);
  const monthlySavings = aLaCarteTotal - bundleMonthly;
  const hasBundleSavings = selectedServiceIds.length >= 3;

  const startCheckout = useCallback(async () => {
    if (checkoutLoading) return;
    if (sovereignRoutingPending) {
      setCheckoutError("Preparing your checkout path. Please wait a moment and try again.");
      return;
    }
    setCheckoutError(null);
    if (routeToDiscoveryCall) {
      window.location.href = "/contact";
      return;
    }

    if (!prospectId) {
      setCheckoutError("Missing package context. Please rerun your diagnostic and try checkout again.");
      return;
    }
    if (selectedServiceIds.length === 0) {
      setCheckoutError("No services selected for checkout yet.");
      return;
    }

    setCheckoutLoading(true);
    try {
      const res = await fetch(getCheckoutFunctionUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prospect_id: prospectId,
          selected_services: displayedServices.map((service) => service.service_id),
          company_size: companySize,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { session_url?: string; fallback?: boolean; error?: string };
      if (json.session_url) {
        window.location.href = json.session_url;
        return;
      }
      setCheckoutError(json.error || "Could not start checkout.");
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : "Checkout request failed.");
    } finally {
      setCheckoutLoading(false);
    }
  }, [
    checkoutLoading,
    companySize,
    displayedServices,
    prospectId,
    recommendedTier,
    routeToDiscoveryCall,
    selectedServiceIds.length,
    sovereignRoutingPending,
  ]);

  return (
    <AnyDoorPageShell backHref="/doors/url-diagnostic" backLabel="← URL diagnostic" narrow={false}>
      <AnyDoorHero
        eyebrow="ANYDOOR ENGINE · PACKAGE BUILDER"
        titleAccent={`${businessName}'s recommended`}
        titleRest="package"
        subtitle={`Your diagnostic score of ${score} places you in the ${recommendedTier} tier — here's what we'd build for you.`}
      />

      <div className="pb-48 text-white">
        <p className="font-mono text-[10px] uppercase tracking-[0.35em]" style={{ color: GOLD }}>
          Configure your stack
        </p>
        <div className="mt-8 rounded-xl border border-white/[0.08] bg-white/[0.02] p-6 sm:p-8">
          {servicesLoading ? (
            <p className="text-sm text-white/60">Loading package recommendations...</p>
          ) : servicesError ? (
            <p className="text-sm text-amber-300">{servicesError}</p>
          ) : displayedServices.length === 0 ? (
            <p className="text-sm text-white/60">No recommended services were found for this prospect.</p>
          ) : (
            <>
              <h2
                className="text-2xl font-light text-[#c9973a] sm:text-3xl"
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
              >
                Your {recommendedTier} package — {displayedServices.length}{" "}
                {displayedServices.length === 1 ? "service" : "services"}
              </h2>
              <p className="mt-2 text-xs text-white/45">
                Recommended services come from your saved diagnostic result.
              </p>
              <ul className="mt-6 space-y-3 border-t border-white/[0.08] pt-6">
                {displayedServices.map((service) => (
                  <li key={service.service_id} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium text-white">{service.service_name}</p>
                      <p className="text-xs text-white/50">{service.pricing_tier ?? "Service"}</p>
                      {service.tier_summary ? (
                        <p className="mt-1 max-w-xl text-xs leading-relaxed text-white/45">{service.tier_summary}</p>
                      ) : null}
                    </div>
                    <p className="font-mono text-sm tabular-nums text-white/70">
                      {typeof service.retail_price_low === "number"
                        ? `${formatMoney(service.retail_price_low)}/mo`
                        : "—"}
                    </p>
                  </li>
                ))}
              </ul>
              <div className="mt-8 border-t border-white/[0.08] pt-6">
                {hasBundleSavings ? (
                  <>
                    <p className="font-mono text-xs uppercase tracking-widest text-white/45">Stack reference</p>
                    <p className="mt-2 text-lg text-white/50 line-through tabular-nums">{`${formatMoney(aLaCarteTotal)}/mo`}</p>
                    <p className="mt-4 text-xl font-semibold tabular-nums text-[#c9973a] sm:text-2xl">
                      Your bundle price: {`${formatMoney(bundleMonthly)}/mo`}
                    </p>
                    <p className="mt-2 text-sm text-emerald-400/90">
                      {`You save ${formatMoney(monthlySavings)}/mo vs. à la carte`}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-white/60">
                      À la carte reference:{" "}
                      <span className="font-mono tabular-nums text-white/80">{`${formatMoney(aLaCarteTotal)}/mo`}</span>
                    </p>
                    <p className="mt-3 text-sm text-white/55">
                      Bundle savings activate automatically (8% for 3-4 services, 15% for 5+ services).
                    </p>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <aside
        className="fixed bottom-0 left-0 right-0 z-20 border-t border-white/[0.1] px-4 py-4 sm:px-8"
        style={{ backgroundColor: "rgba(7,8,13,0.95)", backdropFilter: "blur(8px)" }}
      >
        <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#c9973a]">Summary</p>
            <p className="mt-1 text-sm text-white/80">
              Services selected: <span className="font-semibold tabular-nums text-white">{selectedServiceIds.length}</span>
            </p>
            <p className="text-sm text-white/70">
              À la carte total:{" "}
              <span className="font-mono tabular-nums text-white">
                {servicesLoading ? "Loading..." : `${formatMoney(aLaCarteTotal)}/mo`}
              </span>
            </p>
          </div>
          <div className="text-left sm:text-right">
            {hasBundleSavings ? (
              <>
                <p className="text-sm text-emerald-400/95">
                  Bundle savings:{" "}
                  <span className="font-mono font-semibold">
                    {servicesLoading ? "Loading..." : `${formatMoney(monthlySavings)}/mo`}
                  </span>
                </p>
                <p className="mt-1 text-sm text-white/70">
                  Bundle:{" "}
                  <span className="font-mono font-semibold text-[#c9973a]">
                    {servicesLoading ? "Loading..." : `${formatMoney(bundleMonthly)}/mo`}
                  </span>
                </p>
              </>
            ) : (
              <p className="text-sm text-white/50">Bundle savings unlock at 3+ services</p>
            )}
          </div>
          <div className="sm:ml-4">
            <button
              type="button"
              disabled={checkoutLoading || selectedServiceIds.length === 0 || sovereignRoutingPending || servicesLoading || !prospectId}
              onClick={() => void startCheckout()}
              className="rounded border border-[#c9973a]/50 bg-[#c9973a]/10 px-6 py-3 text-xs font-semibold uppercase tracking-widest text-[#c9973a] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sovereignRoutingPending ? "Loading route…" : checkoutLoading ? "Starting checkout…" : "Checkout"}
            </button>
            {checkoutError ? <p className="mt-2 text-xs text-amber-300">{checkoutError}</p> : null}
          </div>
        </div>
      </aside>
    </AnyDoorPageShell>
  );
}
