import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { DiagnosticResult } from "./DiagnosticForm";
import { PACKAGE_TIERS, type PackageTierKey, serviceName } from "./diagnosticCatalog";
import { getReportShareBaseUrl } from "./lib/diagnosticShare";
import { getServiceSummaryForTier } from "@/lib/serviceTierSummaries";
import { Download, Mic } from "lucide-react";
import { ReportVapiTapToTalk } from "./ReportVapiTapToTalk";
import { useDiagnosticVapiCall } from "./useDiagnosticVapiCall";
import { useCheckoutConfig } from "@/hooks/useCheckoutConfig";
import { getSupabaseBrowserClient } from "./lib/supabaseBrowserClient";

const GOLD = "#c9973a";
const CHECKOUT_FN_PATH = "/functions/v1/create-checkout-session";

function getCheckoutFunctionUrl(): string {
  const base = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
  if (!base) return CHECKOUT_FN_PATH;
  return `${base.replace(/\/$/, "")}${CHECKOUT_FN_PATH}`;
}

function staticCheckoutLinkForTier(tier: PackageTierKey | null, routeToDiscoveryCall: boolean): string {
  const env = import.meta.env;
  switch (tier) {
    case "Momentum":
      return (env.VITE_STRIPE_PAYMENT_LINK_MOMENTUM as string | undefined)?.trim() || "/contact";
    case "Signature":
      return (env.VITE_STRIPE_PAYMENT_LINK_SIGNATURE as string | undefined)?.trim() || "/contact";
    case "Vanguard":
      return (env.VITE_STRIPE_PAYMENT_LINK_VANGUARD as string | undefined)?.trim() || "/contact";
    case "Sovereign":
      if (routeToDiscoveryCall) return "/contact";
      return (env.VITE_STRIPE_PAYMENT_LINK_SOVEREIGN as string | undefined)?.trim() || "/contact";
    case "Essentials":
    default:
      return (env.VITE_STRIPE_PAYMENT_LINK_ESSENTIALS as string | undefined)?.trim() || "/contact";
  }
}

function clampScore(n: number): number {
  return Math.min(100, Math.max(0, Math.round(n)));
}

function scoreTone(score: number): "green" | "amber" | "red" {
  if (score >= 70) return "green";
  if (score >= 40) return "amber";
  return "red";
}

function ringColor(score: number): string {
  const t = scoreTone(score);
  if (t === "green") return "#22c55e";
  if (t === "amber") return "#f59e0b";
  return "#ef4444";
}

const PANEL_ROWS: { title: string; items: string[] }[] = [
  {
    title: "Search Visibility",
    items: ["Organic search presence", "Keyword rankings", "Search discoverability", "Brand search volume"],
  },
  {
    title: "Local Presence",
    items: ["Google Business Profile", "Local listings", "NAP consistency", "Map pack visibility"],
  },
  {
    title: "Engagement",
    items: ["Social media activity", "Content marketing", "Email engagement", "Community presence"],
  },
  {
    title: "Conversion Infrastructure",
    items: ["Lead capture", "AI chat coverage", "Booking/scheduling flow", "CTA effectiveness"],
  },
  {
    title: "Website Health",
    items: ["Page speed", "Mobile optimization", "SSL/security", "UX quality"],
  },
  {
    title: "Reputation & Trust",
    items: ["Review volume", "Review sentiment", "Response rate", "Trust signals"],
  },
  {
    title: "Paid & Amplified Presence",
    items: ["Paid search presence", "Retargeting", "Display advertising", "Social ads"],
  },
];

function panelScores(v: number, e: number, c: number): number[] {
  return [
    clampScore(v),
    clampScore(v - 5),
    clampScore(e),
    clampScore(c),
    clampScore(c - 8),
    clampScore(e - 10),
    clampScore(v - 15),
  ];
}

function rowFinding(
  label: string,
  panelScore: number,
  idx: number,
  gaps: DiagnosticResult["detected_gaps"]
): { ok: boolean; finding: string } {
  const seed = (label.length + idx + panelScore) % 7;
  const ok = panelScore >= 55 + seed || (panelScore >= 45 && idx % 2 === 0);
  const gapHit = gaps.find((g) => g.gap_description.toLowerCase().includes(label.split(" ")[0]?.toLowerCase() ?? ""));
  if (gapHit && !ok) {
    return { ok: false, finding: gapHit.gap_description };
  }
  if (ok) {
    return { ok: true, finding: `${label} looks aligned with where ${panelScore >= 70 ? "leaders" : "growth-stage brands"} in your category typically perform.` };
  }
  return {
    ok: false,
    finding: `Opportunity to strengthen ${label.toLowerCase()} — small lifts here compound across acquisition and conversion.`,
  };
}

function normalizeRecommended(
  result: DiagnosticResult
): Array<{ service_id: number; service_name?: string; reason?: string; tier_summary?: string }> {
  const raw = result.recommended_services ?? [];
  return raw.slice(0, 6).map((item) => {
    if (typeof item === "number") {
      return { service_id: item, reason: "" };
    }
    const ts =
      typeof item.tier_summary === "string" && item.tier_summary.trim() ? item.tier_summary.trim() : undefined;
    return {
      service_id: item.service_id,
      service_name: item.service_name,
      reason: item.reason ?? "",
      tier_summary: ts,
    };
  });
}

function normalizeTier(t: string | undefined): PackageTierKey | null {
  const k = (t ?? "").trim().toLowerCase();
  if (k === "essentials") return "Essentials";
  if (k === "momentum") return "Momentum";
  if (k === "signature") return "Signature";
  if (k === "vanguard") return "Vanguard";
  if (k === "sovereign" || k.includes("ai readiness")) return "Sovereign";
  return null;
}

function buildNarrativeParts(result: DiagnosticResult): { eyebrow: string; body: string }[] {
  const { business_name, industry, prospect_summary, detected_gaps } = result;
  const sentences = (prospect_summary ?? "")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const open = sentences.slice(0, 2).join(" ") || `${business_name} is operating in ${industry} — a space where digital signals increasingly separate leaders from the pack.`;
  const gapText =
    detected_gaps.length > 0
      ? detected_gaps
          .slice(0, 3)
          .map((g) => g.gap_description)
          .join(" ")
      : "Operational focus and consistent execution across channels remain the primary growth levers.";
  return [
    {
      eyebrow: "What We Found",
      body: open,
    },
    {
      eyebrow: "Your Landscape",
      body: `In ${industry}, buyers compare you digitally before they ever call. The competitive bar for visibility, trust, and conversion clarity rises every quarter — and ${business_name} is positioned to capitalize with the right sequencing.`,
    },
    {
      eyebrow: "What's Holding You Back",
      body: `Specific gaps surfaced in this scan point to focused upgrades rather than a full reset: ${gapText}`,
    },
    {
      eyebrow: "The Path Forward",
      body: `The fastest path is to align services to the gaps that move revenue first — then layer in depth. You're one conversation away from a prioritized roadmap built for ${business_name}.`,
    },
  ];
}

function ScrollSection({
  children,
  className = "",
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setOn(true), { threshold: 0.08, rootMargin: "0px 0px -8% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <section
      id={id}
      ref={ref}
      className={`transition-all duration-700 ease-out ${on ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"} ${className}`}
    >
      {children}
    </section>
  );
}

interface DiagnosticResultsProps {
  result: DiagnosticResult;
  submittedUrl: string;
  /** When viewing `/report/[token]`, pass the token from the URL for the share link. */
  reportShareToken?: string;
}

export function DiagnosticResults({ result, submittedUrl, reportShareToken }: DiagnosticResultsProps) {
  const navigate = useNavigate();
  const { variant: checkoutVariant = "A" } = useCheckoutConfig();
  const diagnosticVapi = useDiagnosticVapiCall(result);
  const [tab, setTab] = useState<"summary" | "full">("summary");
  const [openPanels, setOpenPanels] = useState<Record<number, boolean>>(() => ({ 0: true, 1: true }));
  const [showFiveCta, setShowFiveCta] = useState(false);
  const [packagesExpanded, setPackagesExpanded] = useState(false);
  const [tapReady, setTapReady] = useState(false);
  const [footerEmail, setFooterEmail] = useState("");
  const [shareCopied, setShareCopied] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [prospectMeta, setProspectMeta] = useState<{ source: string; call_type: string } | null>(null);
  const [prospectMetaLoading, setProspectMetaLoading] = useState(false);

  const { scores, business_name, industry, estimated_size, business_descriptor, tier_statement } = result;
  const marketDescriptor = business_descriptor?.trim() ?? "";
  const v = scores?.visibility ?? 0;
  const e = scores?.engagement ?? 0;
  const c = scores?.conversion ?? 0;
  const overall = scores?.overall ?? clampScore((v + e + c) / 3);

  const panels = useMemo(() => {
    const vals = panelScores(v, e, c);
    return PANEL_ROWS.map((p, i) => ({ ...p, score: vals[i] }));
  }, [v, e, c]);

  const recommendedNorm = useMemo(() => normalizeRecommended(result), [result]);
  /** Tier highlight comes from the diagnostic outcome (`recommended_tier`), not a static package dropdown. */
  const recTier = normalizeTier(result.recommended_tier);
  const isSovereign = recTier === "Sovereign";
  const source = (prospectMeta?.source ?? "").toLowerCase();
  const callType = (prospectMeta?.call_type ?? "").toLowerCase();
  const isAiIqEntry = source === "door9" || source === "door4-ai-iq" || callType === "ai_iq";
  const showSovereignDiscoveryCta = isSovereign && isAiIqEntry;
  const sovereignRoutingPending = isSovereign && !!result.prospect_id && prospectMetaLoading && !prospectMeta;
  const sovereignTierCopy = "Custom engagement — pricing scoped to your organization";

  const displayUrl = submittedUrl.startsWith("http") ? submittedUrl : `https://${submittedUrl}`;
  const shareToken = reportShareToken ?? result.share_token;
  /** Prefer API-provided canonical URL; fallback for older responses / shared rows without share_url. */
  const shareReportUrl = useMemo(() => {
    const fromApi = result.share_url?.trim();
    if (fromApi) return fromApi;
    if (typeof shareToken === "string" && shareToken.length > 0) {
      /** Path segment must match DB share_token exactly — no encode/decode round-trip. */
      return `${getReportShareBaseUrl().replace(/\/$/, "")}/report/${shareToken}`;
    }
    return "";
  }, [result.share_url, shareToken]);
  const scanTime = new Date().toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const benchmarkX = Math.min(100, clampScore(overall + 8));
  const benchmarkLine = `Businesses in ${industry} with scores above ${benchmarkX} consistently outperform their local competitors.`;

  useEffect(() => {
    const t = window.setTimeout(() => setShowFiveCta(true), 10_000);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    const el = document.getElementById("section-packages");
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          window.setTimeout(() => setTapReady(true), 500);
          io.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadProspectMeta() {
      if (!result.prospect_id) {
        setProspectMeta(null);
        setProspectMetaLoading(false);
        return;
      }
      const supabase = getSupabaseBrowserClient();
      if (!supabase) return;
      setProspectMetaLoading(true);
      const { data, error } = await supabase
        .from("layer5_prospects")
        .select("source, call_type")
        .eq("id", result.prospect_id)
        .maybeSingle<{ source: string | null; call_type: string | null }>();
      if (!cancelled) {
        if (!error && data) {
          setProspectMeta({
            source: data.source?.trim() ?? "",
            call_type: data.call_type?.trim() ?? "",
          });
        }
        setProspectMetaLoading(false);
      }
    }
    void loadProspectMeta();
    return () => {
      cancelled = true;
    };
  }, [result.prospect_id]);

  const togglePanel = (i: number) => setOpenPanels((s) => ({ ...s, [i]: !s[i] }));

  const impactForService = useCallback(
    (id: number, name: string, columnTier: PackageTierKey) => {
      const hit = recommendedNorm.find((r) => r.service_id === id);
      if (hit?.tier_summary && (recTier == null || recTier === columnTier)) return hit.tier_summary;
      if (hit?.reason?.trim()) return hit.reason;
      return getServiceSummaryForTier(id, columnTier, business_name, industry);
    },
    [recommendedNorm, business_name, industry, recTier]
  );

  const visibleTiers = packagesExpanded ? PACKAGE_TIERS : PACKAGE_TIERS.slice(0, 3);

  const handlePrint = () => window.print();

  const scrollToPackages = () => {
    document.getElementById("section-packages")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const goYourPackage = () => {
    const tier = encodeURIComponent((result.recommended_tier ?? "").trim());
    const services = recommendedNorm.map((r) => r.service_id).join(",");
    const name = encodeURIComponent(business_name ?? "");
    const scoreStr = String(Math.round(overall));
    const prospectId = encodeURIComponent(result.prospect_id ?? "");
    navigate(`/your-package?tier=${tier}&services=${services}&name=${name}&score=${scoreStr}&prospect_id=${prospectId}`);
  };

  const beginCheckout = useCallback(async () => {
    if (checkoutLoading) return;
    if (sovereignRoutingPending) {
      setCheckoutError("Loading offer routing. Please wait a moment and retry.");
      return;
    }
    setCheckoutError(null);
    const fallbackLink = staticCheckoutLinkForTier(recTier, showSovereignDiscoveryCta);
    if (!result.prospect_id) {
      window.location.href = fallbackLink;
      return;
    }
    const selectedServices = recommendedNorm.map((r) => r.service_id);
    if (selectedServices.length === 0) {
      window.location.href = fallbackLink;
      return;
    }

    setCheckoutLoading(true);
    try {
      const res = await fetch(getCheckoutFunctionUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prospect_id: result.prospect_id,
          selected_services: selectedServices,
          company_size: estimated_size ?? business_descriptor ?? "",
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        session_url?: string;
        fallback?: boolean;
        error?: string;
      };
      if (json.session_url) {
        window.location.href = json.session_url;
        return;
      }
      if (json.fallback) {
        window.location.href = fallbackLink;
        return;
      }
      // Missing Stripe price IDs means checkout isn't configured yet — fall back
      // to static payment link silently rather than showing a confusing error.
      if (json.error?.includes("Missing Stripe IDs") || json.missing_service_ids) {
        window.location.href = fallbackLink;
        return;
      }
      setCheckoutError(json.error || "Unable to start checkout right now.");
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : "Checkout request failed.");
    } finally {
      setCheckoutLoading(false);
    }
  }, [business_descriptor, checkoutLoading, estimated_size, recTier, recommendedNorm, result.prospect_id, showSovereignDiscoveryCta, sovereignRoutingPending]);

  return (
    <div
      id="diagnostic-report"
      className="mt-12 space-y-16 print:mt-6"
      style={{ fontFamily: "'Archivo', system-ui, sans-serif", cursor: "crosshair" }}
    >
      {/* SECTION 1 — Header band */}
      <header className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-6 sm:px-8 sm:py-8 print:border print:bg-white">
        <div className="no-print absolute right-4 top-4 sm:right-8 sm:top-6">
          <button
            type="button"
            onClick={handlePrint}
            className="rounded border border-[#c9973a]/50 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#c9973a] hover:bg-[#c9973a]/10"
          >
            <span className="inline-flex items-center gap-2">
              <Download className="h-3.5 w-3.5" aria-hidden />
              Download PDF
            </span>
          </button>
        </div>

        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between lg:pr-36">
          <div className="min-w-0 flex-1 space-y-4">
            <h1
              className="font-light leading-tight text-white print:text-black"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "42px" }}
            >
              {business_name}
            </h1>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-white/15 bg-white/[0.04] px-3 py-1 text-xs text-white/80 print:border-gray-300 print:text-black">
                {industry}
              </span>
              {(marketDescriptor || estimated_size) && (
                <span className="rounded-full border border-white/15 bg-white/[0.04] px-3 py-1 text-xs text-white/80 print:border-gray-300 print:text-black">
                  {marketDescriptor || estimated_size}
                </span>
              )}
            </div>
            <p className="font-mono text-xs tracking-wide text-[#c9973a] print:text-amber-800 break-all">{displayUrl}</p>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40 print:text-gray-600">
              {scanTime} · Powered by AnyDoor Engine v12
            </p>

            {shareReportUrl && (
              <div className="no-print mt-4 w-full max-w-full rounded-lg border border-white/[0.08] bg-[#07080d]/90 px-3 py-3 sm:flex sm:items-center sm:gap-3 sm:px-4">
                <p
                  className="shrink-0 text-[10px] uppercase tracking-[0.2em] text-[#c9973a]"
                  style={{ fontFamily: "var(--font-dm-mono), ui-monospace, monospace" }}
                >
                  Share this report:
                </p>
                <p
                  className="mt-2 min-w-0 flex-1 break-all text-[11px] text-white/70 sm:mt-0"
                  style={{ fontFamily: "var(--font-dm-mono), ui-monospace, monospace" }}
                >
                  {shareReportUrl}
                </p>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(shareReportUrl);
                      setShareCopied(true);
                      window.setTimeout(() => setShareCopied(false), 2000);
                    } catch {
                      setShareCopied(false);
                    }
                  }}
                  className="no-print mt-3 w-full shrink-0 rounded border border-[#c9973a]/60 px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-[#c9973a] hover:bg-[#c9973a]/10 sm:mt-0 sm:w-auto"
                >
                  {shareCopied ? "Copied!" : "Copy Link"}
                </button>
              </div>
            )}

            {typeof reportShareToken === "string" && reportShareToken.length > 0 ? (
              <ReportVapiTapToTalk vapi={diagnosticVapi} />
            ) : null}
          </div>

          <div className="flex flex-col items-center gap-3 lg:items-end">
            <div
              className="flex h-28 w-28 items-center justify-center rounded-full border-4 bg-[#07080d] print:border-gray-400 print:bg-white sm:h-32 sm:w-32"
              style={{ borderColor: ringColor(overall) }}
            >
              <span className="text-4xl font-semibold tabular-nums text-white print:text-black" style={{ color: ringColor(overall) }}>
                {overall}
              </span>
            </div>
            <p className="max-w-xs text-center text-xs leading-relaxed text-white/55 print:text-gray-700 lg:text-right">{benchmarkLine}</p>
          </div>
        </div>

        <div className="no-print mt-8 flex rounded-lg border border-white/[0.08] bg-[#07080d]/80 p-1 sm:inline-flex">
          <button
            type="button"
            onClick={() => setTab("summary")}
            className={`rounded-md px-5 py-2.5 text-xs font-semibold uppercase tracking-widest transition-colors ${
              tab === "summary" ? "bg-[#c9973a] text-[#07080d]" : "text-white/50 hover:text-white"
            }`}
          >
            Summary
          </button>
          <button
            type="button"
            onClick={() => setTab("full")}
            className={`rounded-md px-5 py-2.5 text-xs font-semibold uppercase tracking-widest transition-colors ${
              tab === "full" ? "bg-[#c9973a] text-[#07080d]" : "text-white/50 hover:text-white"
            }`}
          >
            Full Report
          </button>
        </div>
      </header>

      {/* SECTION 2 — 7 panels (Full Report only) */}
      {tab === "full" && (
        <ScrollSection>
          <h2
            className="mb-6 font-mono text-[11px] uppercase tracking-[0.35em] text-[#c9973a]"
            style={{ fontFamily: "'DM Mono', ui-monospace, monospace" }}
          >
            Diagnostic panels
          </h2>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-6">
            {panels.map((panel, i) => {
              const tone = scoreTone(panel.score);
              const border =
                tone === "green" ? "border-emerald-500/40" : tone === "amber" ? "border-amber-500/40" : "border-red-500/40";
              const open = openPanels[i] ?? false;
              const colSpan = i < 3 ? "lg:col-span-2" : "lg:col-span-3";
              return (
                <div
                  key={panel.title}
                  className={`rounded-lg border ${border} bg-white/[0.02] print:break-inside-avoid ${colSpan}`}
                  style={{ borderLeftWidth: "4px" }}
                >
                  <button
                    type="button"
                    onClick={() => togglePanel(i)}
                    className="flex w-full items-center justify-between gap-3 p-4 text-left"
                  >
                    <div>
                      <p className="text-[10px] font-mono uppercase tracking-widest text-white/40">{panel.title}</p>
                      <p
                        className={`mt-1 text-3xl font-light tabular-nums ${
                          tone === "green" ? "text-emerald-400" : tone === "amber" ? "text-amber-400" : "text-red-400"
                        } print:text-black`}
                      >
                        {panel.score}
                      </p>
                    </div>
                    <span className="text-xs text-white/40">{open ? "−" : "+"}</span>
                  </button>
                  {open && (
                    <ul className="space-y-3 border-t border-white/[0.06] px-4 py-4">
                      {panel.items.map((label, idx) => {
                        const { ok, finding } = rowFinding(label, panel.score, idx, result.detected_gaps ?? []);
                        return (
                          <li key={label} className="flex gap-3 text-sm">
                            <span
                              className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                              style={{ backgroundColor: ok ? "#22c55e" : "#ef4444" }}
                            />
                            <div>
                              <p className="font-medium text-white/90 print:text-black">{label}</p>
                              <p className="mt-0.5 text-xs text-white/50 print:text-gray-700">{finding}</p>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollSection>
      )}

      {/* SECTION 3 — Narrative */}
      <ScrollSection>
        <div className="rounded-xl border border-white/[0.08] border-l-4 bg-white/[0.02] pl-6 pr-6 py-8 print:border-gray-300" style={{ borderLeftColor: GOLD }}>
          {buildNarrativeParts(result).map((block) => (
            <div key={block.eyebrow} className="mb-8 last:mb-0">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#c9973a]">{block.eyebrow}</p>
              <p className="mt-3 text-sm leading-relaxed text-white/75 print:text-gray-800 sm:text-base">{block.body}</p>
            </div>
          ))}
          <button
            type="button"
            onClick={scrollToPackages}
            className="no-print mt-4 w-full rounded border border-[#c9973a] bg-[#c9973a] py-4 text-xs font-semibold uppercase tracking-[0.2em] text-[#07080d] hover:bg-[#c9973a]/90"
          >
            See Your Recommended Solutions →
          </button>
        </div>
      </ScrollSection>

      {/* Recommended services — tier_summary from API */}
      {recommendedNorm.length > 0 && (
        <ScrollSection>
          <h2
            className="mb-4 font-mono text-[11px] uppercase tracking-[0.35em] text-[#c9973a]"
            style={{ fontFamily: "'DM Mono', ui-monospace, monospace" }}
          >
            Recommended services
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {recommendedNorm.map((r) => (
              <div
                key={r.service_id}
                className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5 print:break-inside-avoid"
              >
                <p className="font-semibold text-white print:text-black">{r.service_name?.trim() || serviceName(r.service_id)}</p>
                {r.tier_summary ? (
                  <p className="mt-3 text-sm leading-relaxed text-white/70 print:text-gray-800">{r.tier_summary}</p>
                ) : r.reason?.trim() ? (
                  <p className="mt-3 text-sm leading-relaxed text-white/70 print:text-gray-800">{r.reason}</p>
                ) : (
                  <p className="mt-3 text-sm leading-relaxed text-white/50 print:text-gray-700">
                    {getServiceSummaryForTier(r.service_id, recTier ?? "Essentials", business_name, industry)}
                  </p>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={goYourPackage}
            className="no-print mt-6 w-full rounded border border-[#c9973a] bg-[#c9973a] py-4 text-xs font-semibold uppercase tracking-[0.2em] text-[#07080d] hover:bg-[#c9973a]/90"
          >
            See Your Custom Package →
          </button>
        </ScrollSection>
      )}

      {/* Checkout CTA — after service list, before packages and Jordan */}
      <ScrollSection className="no-print">
        {sovereignRoutingPending ? (
          <div
            data-slot="checkout-cta"
            className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-6 py-8 sm:px-8"
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-[#c9973a]">Routing</p>
            <p className="mt-3 text-sm text-white/60">Finalizing your checkout path…</p>
          </div>
        ) : showSovereignDiscoveryCta ? (
          <div
            data-slot="checkout-cta"
            className="sovereign-cta"
          >
            <p className="sovereign-label">Sovereign</p>
            <p className="sovereign-descriptor">Custom engagement</p>
            <p className="sovereign-description">
              Your organization&apos;s scale and complexity warrants a dedicated discovery conversation — not a
              checkout form. Let&apos;s talk about what a strategic engagement looks like for you.
            </p>
            <a href="/contact" className="sovereign-button">
              Schedule a discovery call →
            </a>
            <p className="sovereign-note">No commitment required. We&apos;ll scope your engagement together.</p>
          </div>
        ) : (
          <div
            data-slot="checkout-cta"
            className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-6 py-8 sm:px-8"
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-[#c9973a]">Checkout</p>
            <h3
              className="mt-3 text-xl font-light text-white sm:text-2xl"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
            >
              Continue when you&apos;re ready
            </h3>
            <p className="mt-2 text-sm text-white/55">
              You&apos;ll complete checkout securely on Stripe. After payment, you&apos;ll land on a confirmation page
              and we&apos;ll follow up to get things moving.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              {checkoutVariant === "A" ? (
                <button
                  type="button"
                  disabled={checkoutLoading || sovereignRoutingPending}
                  onClick={() => void beginCheckout()}
                  className="rounded border border-[#c9973a]/50 bg-[#c9973a]/10 px-6 py-3 text-xs font-semibold uppercase tracking-widest text-[#c9973a]"
                >
                  {checkoutLoading ? "Starting checkout…" : "Checkout"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    window.location.href = staticCheckoutLinkForTier(recTier, showSovereignDiscoveryCta);
                  }}
                  className="rounded border border-[#c9973a]/50 bg-[#c9973a]/10 px-6 py-3 text-xs font-semibold uppercase tracking-widest text-[#c9973a]"
                >
                  Go to payment link
                </button>
              )}
            </div>
            {checkoutError ? <p className="mt-3 text-center text-sm text-amber-300">{checkoutError}</p> : null}
          </div>
        )}
      </ScrollSection>

      {/* SECTION 4 — Packages */}
      <ScrollSection id="section-packages" className="scroll-mt-28">
        <div>
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#c9973a]">
                Tier pathways (diagnostic outcomes, not fixed menus)
              </p>
              <h2
                className="mt-2 text-3xl font-light italic text-[#c9973a] sm:text-4xl"
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
              >
                Five ways to execute
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setPackagesExpanded(true)}
              className={`no-print self-start rounded border border-white/15 px-4 py-2 text-xs text-white/60 transition-opacity hover:border-[#c9973a]/40 hover:text-[#c9973a] sm:self-auto ${
                showFiveCta && !packagesExpanded ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
            >
              See all 5 packages ↓
            </button>
          </div>

          {/* Desktop: equal-height grid — 3 cols initially, 5 when expanded */}
          <div
            className={`hidden lg:grid lg:items-stretch lg:gap-4 ${packagesExpanded ? "lg:grid-cols-5" : "lg:grid-cols-3"}`}
          >
            {visibleTiers.map((tier) => (
              <PackageColumn
                key={tier.key}
                tier={tier}
                recTier={recTier}
                impactForService={impactForService}
                tierStatement={recTier === tier.key ? tier_statement?.trim() : undefined}
                sovereignTierCopy={sovereignTierCopy}
              />
            ))}
          </div>

          {/* Mobile: horizontal carousel */}
          <div className="flex gap-4 overflow-x-auto pb-4 pt-1 snap-x snap-mandatory lg:hidden scrollbar-thin">
            {visibleTiers.map((tier) => (
              <div key={tier.key} className="min-w-[min(100%,320px)] shrink-0 snap-center">
                <PackageColumn
                  tier={tier}
                  recTier={recTier}
                  impactForService={impactForService}
                  tierStatement={recTier === tier.key ? tier_statement?.trim() : undefined}
                  sovereignTierCopy={sovereignTierCopy}
                />
              </div>
            ))}
          </div>
        </div>
      </ScrollSection>

      {/* SECTION 5 — Tap to talk (fade in 0.5s after packages enter view) */}
      <section
        className={`w-full transition-opacity duration-500 ease-out ${tapReady ? "opacity-100" : "pointer-events-none opacity-0"}`}
      >
        <div className="w-full rounded-xl border border-white/[0.08] bg-[#07080d] px-6 py-10 text-center sm:px-10">
          <p
            className="text-[10px] uppercase tracking-[0.35em] text-[#c9973a]"
            style={{ fontFamily: "var(--font-dm-mono), ui-monospace, monospace" }}
          >
            READY TO GO DEEPER?
          </p>
          <h3
            className="mt-4 font-light italic leading-tight text-white"
            style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "42px" }}
          >
            Talk to our AI advisor
          </h3>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/55">
            Discuss the services, understand the impact, and get answers to your specific questions — in a real conversation.
          </p>
          {diagnosticVapi.error ? (
            <p className="no-print mx-auto mt-4 max-w-md text-xs text-red-400" role="alert">
              {diagnosticVapi.error}
            </p>
          ) : null}
          <button
            type="button"
            disabled={
              !diagnosticVapi.hasPublicKey ||
              (!diagnosticVapi.isCallActive && diagnosticVapi.startLocked)
            }
            onClick={() => (diagnosticVapi.isCallActive ? diagnosticVapi.end() : diagnosticVapi.start())}
            title={
              diagnosticVapi.hasPublicKey
                ? diagnosticVapi.isCallActive
                  ? "End voice call"
                  : "Start voice call with Socialutely Evaluation Specialist (Jordan)"
                : "Configure VITE_VAPI_PUBLIC_KEY"
            }
            className={`no-print mx-auto mt-8 flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-full border-2 border-[#c9973a] bg-[#c9973a]/10 text-[#c9973a] transition enabled:cursor-pointer enabled:hover:bg-[#c9973a]/20 disabled:cursor-not-allowed disabled:opacity-40 ${diagnosticVapi.isCallActive ? "ring-2 ring-[#c9973a]/60" : ""} ${!diagnosticVapi.isCallActive && diagnosticVapi.hasPublicKey ? "anydoor-tap-pulse" : ""}`}
          >
            <Mic className="h-7 w-7 shrink-0" aria-hidden />
            <span
              className="text-[8px] font-bold uppercase leading-tight tracking-widest"
              style={{ fontFamily: "var(--font-dm-mono), ui-monospace, monospace" }}
            >
              {diagnosticVapi.isCallActive ? "END CALL" : "TAP TO TALK"}
            </span>
          </button>
          {!diagnosticVapi.hasPublicKey ? (
            <p className="no-print mx-auto mt-3 max-w-sm text-[11px] text-white/45">
              Voice requires <span className="font-mono text-[#c9973a]/80">VITE_VAPI_PUBLIC_KEY</span> in env (rebuild after adding).
            </p>
          ) : null}
          <p
            className="mt-8 text-[10px] text-white/35"
            style={{ fontFamily: "var(--font-dm-mono), ui-monospace, monospace" }}
          >
            Powered by VoiceBridge™ AI ChatLabs
          </p>
        </div>
      </section>

      {/* SECTION 6 — Footer */}
      <footer className="border-t border-white/[0.08] pt-10 print:border-gray-300">
        <p className="text-center text-sm text-white/70 print:text-black">Not ready to talk? We&apos;ll follow up.</p>
        <form
          className="no-print mx-auto mt-6 flex max-w-md flex-col gap-3 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            console.log("Send My Report", footerEmail);
          }}
        >
          <input
            type="email"
            value={footerEmail}
            onChange={(e) => setFooterEmail(e.target.value)}
            placeholder="you@company.com"
            className="min-h-[48px] flex-1 rounded border border-white/10 bg-[#07080d] px-4 text-sm text-white placeholder:text-white/30 focus:border-[#c9973a]/50 focus:outline-none"
          />
          <button
            type="submit"
            className="min-h-[48px] rounded border border-[#c9973a] bg-[#c9973a] px-6 text-xs font-semibold uppercase tracking-widest text-[#07080d] hover:bg-[#c9973a]/90"
          >
            Send My Report
          </button>
        </form>
        <p className="mt-6 text-center text-xs text-white/45 print:text-gray-600">
          Your diagnostic has been saved to our system. A Socialutely advisor will reach out within 24 hours.
        </p>
      </footer>

    </div>
  );
}

function PackageColumn({
  tier,
  recTier,
  impactForService,
  tierStatement,
  sovereignTierCopy,
}: {
  tier: (typeof PACKAGE_TIERS)[number];
  recTier: PackageTierKey | null;
  impactForService: (id: number, name: string, columnTier: PackageTierKey) => string;
  /** Shown under recommended tier name instead of price range when present. */
  tierStatement?: string;
  sovereignTierCopy: string;
}) {
  const isRec = recTier === tier.key;
  const showSovereignCopy = tier.key === "Sovereign";
  return (
    <div
      className={`flex h-full min-h-[480px] flex-col rounded-xl border ${tier.border} ${tier.bg} p-5 print:break-inside-avoid`}
    >
      <span className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${tier.pill}`}>
        {tier.key}
      </span>
      <h4
        className="mt-4 text-xl font-light italic text-white print:text-black"
        style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
      >
        {tier.displayName}
      </h4>
      {showSovereignCopy ? (
        <p className="mt-1 text-sm leading-snug text-white/60">{sovereignTierCopy}</p>
      ) : isRec && tierStatement ? (
        <p className="mt-1 text-sm italic leading-snug text-[#c9973a]/80 print:text-amber-900">{tierStatement}</p>
      ) : null}
      {isRec && (
        <span className="mt-3 inline-flex w-fit rounded border border-[#c9973a]/50 bg-[#c9973a]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[#c9973a]">
          ★ Recommended
        </span>
      )}
      <div className="my-4 border-t border-white/10" />
      <ul className="space-y-2 text-xs text-white/80 print:text-gray-800">
        {tier.serviceIds.map((id) => (
          <li key={id} className="leading-snug">
            · {serviceName(id)}
          </li>
        ))}
      </ul>
      <div className="mt-4 border-t border-white/10 pt-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#c9973a]">Positive impact</p>
        <ul className="mt-3 space-y-2 text-[11px] leading-relaxed text-white/60 print:text-gray-700">
          {tier.serviceIds.map((id) => (
            <li key={`imp-${id}`}>— {impactForService(id, serviceName(id), tier.key)}</li>
          ))}
        </ul>
      </div>
      <div className="mt-auto pt-6">
        <a
          href="#get-started"
          className={`block w-full rounded border py-2.5 text-center text-xs font-semibold uppercase tracking-widest text-white/90 hover:bg-white/5 print:text-black ${tier.border}`}
        >
          Get Started →
        </a>
      </div>
    </div>
  );
}
