import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AnyDoorHero, AnyDoorPageShell } from "@/components/anydoor/AnyDoorExperience";
import {
  PACKAGE_BUILDER_SERVICE_IDS,
  getPackageBuilderService,
  tierAssociationLabel,
} from "@/lib/packageBuilderCatalog";

const GOLD = "#c9973a";
const CHECKOUT_FN_PATH = "/functions/v1/create-checkout-session";

function getCheckoutFunctionUrl(): string {
  const base = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
  if (!base) return CHECKOUT_FN_PATH;
  return `${base.replace(/\/$/, "")}${CHECKOUT_FN_PATH}`;
}

function staticCheckoutLinkForTier(tier: string): string {
  const key = tier.trim().toLowerCase();
  if (key === "momentum") return (import.meta.env.VITE_STRIPE_PAYMENT_LINK_MOMENTUM as string | undefined)?.trim() || "/contact";
  if (key === "signature") return (import.meta.env.VITE_STRIPE_PAYMENT_LINK_SIGNATURE as string | undefined)?.trim() || "/contact";
  if (key === "vanguard") return (import.meta.env.VITE_STRIPE_PAYMENT_LINK_VANGUARD as string | undefined)?.trim() || "/contact";
  if (key === "sovereign") return "/contact";
  return (import.meta.env.VITE_STRIPE_PAYMENT_LINK_ESSENTIALS as string | undefined)?.trim() || "/contact";
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

function parseInitialSelection(servicesParam: string | null): Set<number> {
  const ids = new Set<number>();
  const raw = servicesParam ?? "";
  for (const part of raw.split(",")) {
    const n = Number(part.trim());
    if (Number.isFinite(n) && PACKAGE_BUILDER_SERVICE_IDS.includes(n)) ids.add(n);
  }
  return ids;
}

export default function YourPackage() {
  const [searchParams] = useSearchParams();
  const tierParam = searchParams.get("tier")?.trim() || "Recommended";
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

  const [selected, setSelected] = useState<Set<number>>(() => parseInitialSelection(searchParams.get("services")));
  const [view, setView] = useState<"carte" | "bundle">("bundle");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const prospectId = searchParams.get("prospect_id")?.trim() || "";
  const companySize = searchParams.get("business_size")?.trim() || "";

  const toggle = useCallback((id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectedList = useMemo(
    () => PACKAGE_BUILDER_SERVICE_IDS.filter((id) => selected.has(id)),
    [selected]
  );

  const selectedRows = useMemo(
    () => selectedList.map((id) => ({ ...getPackageBuilderService(id) })),
    [selectedList]
  );

  const aLaCarteTotal = useMemo(
    () => selectedRows.reduce((sum, s) => sum + s.monthlyPrice, 0),
    [selectedRows]
  );

  const discount = bundleDiscountRate(selectedList.length);
  const bundleMonthly = Math.round(aLaCarteTotal * (1 - discount));
  const monthlySavings = aLaCarteTotal - bundleMonthly;
  const hasBundleSavings = selectedList.length >= 3;

  async function startCheckout() {
    if (checkoutLoading) return;
    setCheckoutError(null);
    const fallbackLink = staticCheckoutLinkForTier(tierParam);

    if (!prospectId || selectedList.length === 0) {
      window.location.href = fallbackLink;
      return;
    }

    setCheckoutLoading(true);
    try {
      const res = await fetch(getCheckoutFunctionUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prospect_id: prospectId,
          selected_services: selectedList,
          company_size: companySize,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { session_url?: string; fallback?: boolean; error?: string };
      if (json.session_url) {
        window.location.href = json.session_url;
        return;
      }
      if (json.fallback) {
        window.location.href = fallbackLink;
        return;
      }
      setCheckoutError(json.error || "Could not start checkout.");
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : "Checkout request failed.");
    } finally {
      setCheckoutLoading(false);
    }
  }

  return (
    <AnyDoorPageShell backHref="/doors/url-diagnostic" backLabel="← URL diagnostic">
      <AnyDoorHero
        eyebrow="ANYDOOR ENGINE · PACKAGE BUILDER"
        titleAccent={`${businessName}'s recommended`}
        titleRest="package"
        subtitle={`Your diagnostic score of ${score} places you in the ${tierParam} tier — here's what we'd build for you.`}
      />

      <div className="pb-48 text-white">
        <p className="font-mono text-[10px] uppercase tracking-[0.35em]" style={{ color: GOLD }}>
          Configure your stack
        </p>

        <div className="no-print mt-4 inline-flex rounded-lg border border-white/[0.08] bg-[#07080d]/80 p-1">
          <button
            type="button"
            onClick={() => setView("bundle")}
            className={`rounded-md px-5 py-2.5 text-xs font-semibold uppercase tracking-widest transition-colors ${
              view === "bundle" ? "bg-[#c9973a] text-[#07080d]" : "text-white/50 hover:text-white"
            }`}
          >
            Bundle — best value
          </button>
          <button
            type="button"
            onClick={() => setView("carte")}
            className={`rounded-md px-5 py-2.5 text-xs font-semibold uppercase tracking-widest transition-colors ${
              view === "carte" ? "bg-[#c9973a] text-[#07080d]" : "text-white/50 hover:text-white"
            }`}
          >
            À la carte
          </button>
        </div>

        {view === "carte" ? (
          <>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <h2 className="text-xl font-light text-white" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
                Every capability · toggle what you want live
              </h2>
              <p className="font-mono text-sm tabular-nums text-[#c9973a]">Monthly total: {formatMoney(aLaCarteTotal)}/mo</p>
            </div>
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {PACKAGE_BUILDER_SERVICE_IDS.map((id) => {
                const svc = getPackageBuilderService(id);
                const on = selected.has(id);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => toggle(id)}
                    className={`rounded-xl border p-5 text-left transition-colors ${
                      on ? "border-[#c9973a]/60 bg-[#c9973a]/10" : "border-white/[0.08] bg-white/[0.02] hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-white/45">{svc.category}</span>
                      <span
                        className={`h-5 w-5 shrink-0 rounded border-2 ${
                          on ? "border-[#c9973a] bg-[#c9973a]" : "border-white/30"
                        }`}
                        aria-hidden
                      />
                    </div>
                    <p className="mt-3 font-semibold text-white leading-snug">{svc.name}</p>
                    {svc.description ? (
                      <p className="mt-2 text-[11px] leading-relaxed text-white/55">{svc.description}</p>
                    ) : null}
                    <p className="mt-2 text-[11px] text-white/50">{tierAssociationLabel(id)}</p>
                    <p className="mt-4 font-mono text-sm tabular-nums text-[#c9973a]">{formatMoney(svc.monthlyPrice)}/mo</p>
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <div className="mt-8 rounded-xl border border-white/[0.08] bg-white/[0.02] p-6 sm:p-8">
              {selectedList.length === 0 ? (
                <p className="text-sm text-white/60">
                  No services selected yet. Switch to <strong className="text-white/90">À la carte</strong> to turn on
                  recommendations, then return here to see your bundle.
                </p>
              ) : (
                <>
                  <h2
                    className="text-2xl font-light text-[#c9973a] sm:text-3xl"
                    style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                  >
                    Your {tierParam} package — {selectedList.length}{" "}
                    {selectedList.length === 1 ? "service" : "services"}
                  </h2>
                  <ul className="mt-6 space-y-3 border-t border-white/[0.08] pt-6">
                    {selectedRows.map((svc) => (
                      <li key={svc.id} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-medium text-white">{svc.name}</p>
                          <p className="text-xs text-white/50">{svc.category}</p>
                          {svc.description ? (
                            <p className="mt-1 max-w-xl text-xs leading-relaxed text-white/45">{svc.description}</p>
                          ) : null}
                        </div>
                        <p className="font-mono text-sm tabular-nums text-white/70">{formatMoney(svc.monthlyPrice)}/mo</p>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-8 border-t border-white/[0.08] pt-6">
                    {hasBundleSavings ? (
                      <>
                        <p className="font-mono text-xs uppercase tracking-widest text-white/45">Stack reference</p>
                        <p className="mt-2 text-lg text-white/50 line-through tabular-nums">{formatMoney(aLaCarteTotal)}/mo</p>
                        <p className="mt-4 text-xl font-semibold tabular-nums text-[#c9973a] sm:text-2xl">
                          Your bundle price: {formatMoney(bundleMonthly)}/mo
                        </p>
                        <p className="mt-2 text-sm text-emerald-400/90">
                          You save {formatMoney(monthlySavings)}/mo vs. à la carte
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-white/60">
                          À la carte reference:{" "}
                          <span className="font-mono tabular-nums text-white/80">{formatMoney(aLaCarteTotal)}/mo</span>
                        </p>
                        <p className="mt-3 text-sm text-white/55">
                          Select three or more services to activate bundle savings (8% for 3–4 items, 15% for five or more).
                        </p>
                      </>
                    )}
                    <p
                      className="mt-8 inline-flex items-center rounded-full border border-[#c9973a]/45 bg-[#c9973a]/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#c9973a]"
                      style={{ fontFamily: "var(--font-dm-mono), ui-monospace, monospace" }}
                    >
                      Included in {tierParam} and above
                    </p>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>

      <aside
        className="fixed bottom-0 left-0 right-0 z-20 border-t border-white/[0.1] px-4 py-4 sm:px-8"
        style={{ backgroundColor: "rgba(7,8,13,0.95)", backdropFilter: "blur(8px)" }}
      >
        <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#c9973a]">Summary</p>
            <p className="mt-1 text-sm text-white/80">
              Services selected: <span className="font-semibold tabular-nums text-white">{selectedList.length}</span>
            </p>
            <p className="text-sm text-white/70">
              À la carte total:{" "}
              <span className="font-mono tabular-nums text-white">{formatMoney(aLaCarteTotal)}/mo</span>
            </p>
          </div>
          <div className="text-left sm:text-right">
            {hasBundleSavings ? (
              <>
                <p className="text-sm text-emerald-400/95">
                  Bundle savings: <span className="font-mono font-semibold">{formatMoney(monthlySavings)}/mo</span>
                </p>
                <p className="mt-1 text-sm text-white/70">
                  Bundle: <span className="font-mono font-semibold text-[#c9973a]">{formatMoney(bundleMonthly)}/mo</span>
                </p>
              </>
            ) : (
              <p className="text-sm text-white/50">Bundle savings unlock at 3+ services</p>
            )}
          </div>
          <div className="sm:ml-4">
            <button
              type="button"
              disabled={checkoutLoading || selectedList.length === 0}
              onClick={() => void startCheckout()}
              className="rounded border border-[#c9973a]/50 bg-[#c9973a]/10 px-6 py-3 text-xs font-semibold uppercase tracking-widest text-[#c9973a] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {checkoutLoading ? "Starting checkout…" : "Checkout"}
            </button>
            {checkoutError ? <p className="mt-2 text-xs text-amber-300">{checkoutError}</p> : null}
          </div>
        </div>
      </aside>
    </AnyDoorPageShell>
  );
}
