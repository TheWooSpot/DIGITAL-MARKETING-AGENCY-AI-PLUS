import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AnyDoorHero, AnyDoorPageShell } from "@/components/anydoor/AnyDoorExperience";
import { getSupabaseBrowserClient } from "@/anydoor/lib/supabaseBrowserClient";
import type { PackageTierKey } from "@/anydoor/diagnosticCatalog";

const GOLD = "#c9973a";
const CHECKOUT_FN_PATH = "/functions/v1/create-checkout-session";

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

type ProspectRecommendedService = {
  service_id: number;
  tier_summary?: string;
};

type RevenueServiceRow = {
  service_id: number;
  service_name: string;
  pricing_tier: string | null;
  retail_price_low: number | null;
  initiation_fee_low: number | null;
  stripe_monthly_price_id: string | null;
  stripe_setup_price_id: string | null;
};

type DisplayedService = RevenueServiceRow & {
  tier_summary?: string;
};

function parseRecommendedServices(raw: unknown): ProspectRecommendedService[] {
  if (!Array.isArray(raw)) return [];
  const out: ProspectRecommendedService[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const serviceId = Number((row as { service_id?: unknown }).service_id);
    if (!Number.isFinite(serviceId)) continue;
    const tierSummaryRaw = (row as { tier_summary?: unknown }).tier_summary;
    out.push({
      service_id: Math.trunc(serviceId),
      tier_summary: typeof tierSummaryRaw === "string" ? tierSummaryRaw.trim() : undefined,
    });
  }
  return out;
}

export default function YourPackage() {
  const [searchParams] = useSearchParams();
  const queryRecommendedTier = normalizeTierKey(searchParams.get("tier"));
  const [recommendedTier, setRecommendedTier] = useState<PackageTierKey>(queryRecommendedTier);
  const businessName = useMemo(() => {
    const raw = searchParams.get("name")?.trim();
    if (!raw) return "Your brand";
    try {
      return decodeURIComponent(raw.replace(/\+/g, " "));
    } catch {
      return raw.replace(/\+/g, " ");
    }
  }, [searchParams]);

  const score = useMemo(() => {
    const s = Number(searchParams.get("score") ?? "0");
    return Number.isFinite(s) ? Math.round(Math.min(100, Math.max(0, s))) : 0;
  }, [searchParams]);

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
    async function loadPackageFromProspect() {
      if (!prospectId) {
        setDisplayedServices([]);
        setServicesError("Missing prospect_id in URL.");
        setProspectMetaLoading(false);
        setServicesLoading(false);
        return;
      }
      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        if (!cancelled) {
          setServicesError("Supabase is not configured in this environment.");
          setProspectMetaLoading(false);
          setServicesLoading(false);
        }
        return;
      }
      setServicesLoading(true);
      setProspectMetaLoading(true);
      setServicesError(null);

      const { data: prospect, error: prospectError } = await supabase
        .from("layer5_prospects")
        .select("recommended_services, recommended_tier, source, call_type, assigned_rung")
        .eq("id", prospectId)
        .maybeSingle<{
          recommended_services: unknown;
          recommended_tier: string | null;
          source: string | null;
          call_type: string | null;
          assigned_rung: number | null;
        }>();

      if (cancelled) return;
      if (prospectError || !prospect) {
        setDisplayedServices([]);
        setProspectMeta(null);
        setServicesError(prospectError?.message ?? "Prospect not found.");
        setProspectMetaLoading(false);
        setServicesLoading(false);
        return;
      }

      setProspectMeta({
        source: prospect.source?.trim() ?? "",
        call_type: prospect.call_type?.trim() ?? "",
        assigned_rung: typeof prospect.assigned_rung === "number" ? prospect.assigned_rung : null,
      });
      setProspectMetaLoading(false);
      setRecommendedTier(normalizeTierKey(prospect.recommended_tier ?? queryRecommendedTier));

      const recommended = parseRecommendedServices(prospect.recommended_services);
      if (recommended.length === 0) {
        setDisplayedServices([]);
        setServicesLoading(false);
        return;
      }

      const recommendedIds = Array.from(new Set(recommended.map((service) => service.service_id)));
      const { data: revenueRows, error: revenueError } = await supabase
        .from("layer4_revenue_logic")
        .select(
          "service_id, service_name, pricing_tier, retail_price_low, initiation_fee_low, stripe_monthly_price_id, stripe_setup_price_id"
        )
        .in("service_id", recommendedIds.map(String))
        .returns<RevenueServiceRow[]>();

      if (cancelled) return;
      if (revenueError) {
        setDisplayedServices([]);
        setServicesError(revenueError.message);
        setServicesLoading(false);
        return;
      }

      const detailsById = new Map((revenueRows ?? []).map((row) => [row.service_id, row]));
      const joined: DisplayedService[] = recommended
        .map((service) => {
          const details = detailsById.get(service.service_id);
          if (!details) return null;
          return {
            ...details,
            tier_summary: service.tier_summary,
          };
        })
        .filter((row): row is DisplayedService => !!row);

      setDisplayedServices(joined);
      setServicesLoading(false);
    }
    void loadPackageFromProspect();
    return () => {
      cancelled = true;
    };
  }, [prospectId, queryRecommendedTier]);

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
  const aLaCarteTotal = useMemo(
    () => displayedServices.reduce((sum, service) => sum + (service.retail_price_low ?? 0), 0),
    [displayedServices]
  );

  const discount = bundleDiscountRate(selectedServiceIds.length);
  const bundleMonthly = Math.round(aLaCarteTotal * (1 - discount));
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
