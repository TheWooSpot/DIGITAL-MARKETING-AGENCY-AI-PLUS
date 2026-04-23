import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Mic, PhoneOff } from "lucide-react";
import { AnyDoorHero, AnyDoorPageShell } from "@/components/anydoor/AnyDoorExperience";
import { getSupabaseBrowserClient } from "@/anydoor/lib/supabaseBrowserClient";
import { vapi } from "@/lib/vapiClient";
import { appendVapiAssistantKeyHint, extractVapiErrorMessage } from "@/lib/vapiErrors";
import { acquireVapiTapLock, releaseVapiTapLockEarly } from "@/lib/vapiTapLock";

/** Evaluation Specialist (Jordan) — Door 9 AI IQ™ Talk to Jordan strip. */
const AI_IQ_VAPI_ASSISTANT_ID = "e48ee900-bfb0-4ee6-a645-e89a08233365";

const GOLD = "#c9973a";
const BORDER = "rgba(201,151,58,0.22)";
const WHITE = "#e8eef5";
const DIM = "rgba(232,238,245,0.55)";
const GREEN = "#2ecc8a";
const AMBER = "#f0a030";
const RED = "#e05050";

/** Swap for Stripe / Labs checkout when ready. */
const CTA_AI_READINESS_LABS = "https://socialutely.com/ai-readiness-labs";
const CTA_HUBAI = "https://socialutely.com/hubai";

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

interface Door4Submission {
  id: number;
  full_name: string | null;
  business_name: string | null;
  email: string | null;
  website_url: string | null;
  ai_iq_score: number | null;
  ai_iq_band: string | null;
  recommended_rung: number | null;
  recommended_rung_label: string | null;
  recommended_rung_price?: string | null;
  recommended_rung_type?: string | null;
  deployment_depth_score: number | null;
  integration_maturity_score: number | null;
  revenue_alignment_score: number | null;
  automation_orchestration_score: number | null;
  oversight_awareness_score: number | null;
  team_human_readiness_score: number | null;
  strategic_leadership_score: number | null;
  data_foundation_score: number | null;
  customer_intelligence_score: number | null;
  investment_posture_score: number | null;
  created_at: string;
}

const BAND_HEADLINES: Record<string, string> = {
  "AI Absent": "AI hasn't entered the building yet",
  Experimental: "AI is present, but working in silos",
  Emerging: "AI is running — but not yet earning",
  Integrated: "AI is earning — now it needs governing",
  "Intelligent Infrastructure": "AI is embedded at the infrastructure level",
};

const BAND_NARRATIVES: Record<string, [string, string]> = {
  "AI Absent": [
    "Most of your workflows still depend on manual judgment, which caps speed and consistency before AI can even help.",
    "That is not a weakness — it is the cleanest starting line. Awareness is Rung 1: you now have a map, and the next steps can be deliberate rather than reactive.",
  ],
  Experimental: [
    "Your teams are trying tools and prompts, but adoption is uneven and value is hard to prove across departments.",
    "The opportunity is to connect experiments into a repeatable system — so wins stop living in individual inboxes and start compounding.",
  ],
  Emerging: [
    "AI is doing real work in pockets, but it is not yet translating cleanly into pipeline, margin, or customer experience at scale.",
    "The shift from activity to earnings is mostly workflow design, ownership, and measurement — not more model names.",
  ],
  Integrated: [
    "Revenue-adjacent workflows are benefiting from AI, which means the next risk is drift: outputs without standards, security, or review loops.",
    "Governance here is not bureaucracy — it is how you keep quality, trust, and compliance consistent as adoption grows.",
  ],
  "Intelligent Infrastructure": [
    "AI is woven into systems and operations in a way that teams can see and customers can feel — rare air for most organizations.",
    "The focus now is resilience: operating standards, vendor strategy, and continuous improvement so the stack ages gracefully.",
  ],
};

function normalizeBand(raw: string | null | undefined): string {
  const s = normalizeBandKey(raw);
  if (s && BAND_HEADLINES[s]) return s;
  return "AI Absent";
}

function normalizeBandKey(raw: string | null | undefined): string {
  if (!raw) return "";
  const t = raw.trim();
  if (BAND_HEADLINES[t]) return t;
  const lower = t.toLowerCase();
  for (const k of Object.keys(BAND_HEADLINES)) {
    if (k.toLowerCase() === lower) return k;
  }
  return t;
}

function domainImplication(score: number): string {
  if (score >= 14) {
    return "This reads as a clear strength you can build on — it is creating lift for the teams who rely on it every week.";
  }
  if (score >= 8) {
    return "You have a foundation here, but it is inconsistently applied — tightening ownership and repetition would unlock the next step-change.";
  }
  return "This is an early-stage signal — small upgrades in process and accountability tend to move the number quickly and reduce downside risk.";
}

function rungBody(rung: number): string {
  if (rung === 2) {
    return "Adaptation™ is built for operators who want clarity fast: a practical path to adopt AI without boiling the ocean. You will leave with a grounded plan you can execute without waiting for a perfect stack.";
  }
  if (rung === 3) {
    return "Optimization™ is for teams ready to workshop the work: live facilitation, structured exercises, and decision support so adoption matches how your business actually runs.";
  }
  if (rung === 4) {
    return "Stewardship™ is for leaders treating AI as infrastructure: strategic sequencing, governance, and done-with-you implementation so the organization scales change safely.";
  }
  return "Your next step is to choose a rung that matches your readiness — then make one commitment you can complete in the next 30 days.";
}

function rungCtaLabel(rung: number): string {
  if (rung === 2) return "Start Adaptation™";
  if (rung === 3) return "Explore workshop packages";
  if (rung === 4) return "Discuss Stewardship™";
  return "View AI Readiness Labs™";
}

function rungSubLabel(rung: number): string {
  if (rung === 2) return "$297 one-time · Self-guided AI course — learn at your own pace";
  if (rung === 3) return "From $797 · 3 / 5 / 7 / 10 session workshop packages — live + guided";
  if (rung === 4) return "$4,997/qtr · 12-month strategic agreement — DFY tech consultancy";
  return "Pick the delivery model that matches your pace and risk tolerance.";
}

function scoreChipColor(score: number): string {
  if (score >= 14) return GREEN;
  if (score >= 8) return AMBER;
  return RED;
}

function extractVapiErr(e: unknown): string {
  return appendVapiAssistantKeyHint(extractVapiErrorMessage(e));
}

function useAiIqVapi(submission: Door4Submission | null) {
  const publicKey = (import.meta.env.VITE_VAPI_PUBLIC_KEY as string | undefined)?.trim() ?? "";
  const hasPublicKey = publicKey.length > 0;
  const [isCallActive, setIsCallActive] = useState(false);
  const [startLocked, setStartLocked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const client = vapi;
    if (!hasPublicKey || !client) return;
    const onCallStart = () => {
      setIsCallActive(true);
      setError(null);
    };
    const onCallEnd = () => setIsCallActive(false);
    const onError = (e: unknown) => {
      setError(extractVapiErr(e));
      setIsCallActive(false);
      setStartLocked(false);
      releaseVapiTapLockEarly();
    };
    const onCallStartFailed = (e: unknown) => {
      setError(extractVapiErr(e));
      setIsCallActive(false);
      setStartLocked(false);
      releaseVapiTapLockEarly();
    };
    client.on("call-start", onCallStart);
    client.on("call-end", onCallEnd);
    client.on("error", onError);
    client.on("call-start-failed", onCallStartFailed);
    return () => {
      client.removeListener("call-start", onCallStart);
      client.removeListener("call-end", onCallEnd);
      client.removeListener("error", onError);
      client.removeListener("call-start-failed", onCallStartFailed);
    };
  }, [hasPublicKey]);

  const start = useCallback(() => {
    if (!hasPublicKey) {
      setError("Add VITE_VAPI_PUBLIC_KEY to your environment and rebuild.");
      return;
    }
    if (!acquireVapiTapLock()) return;
    setStartLocked(true);
    window.setTimeout(() => setStartLocked(false), 3000);
    setError(null);
    const variableValues: Record<string, string> = {
      context: "AI_IQ_Door4_Report",
      business_name: submission?.business_name ?? "your business",
      full_name: submission?.full_name ?? "",
      ai_iq_score: String(submission?.ai_iq_score ?? 0),
      ai_iq_band: submission?.ai_iq_band ?? "",
      recommended_rung: String(submission?.recommended_rung ?? 0),
    };
    vapi?.start(AI_IQ_VAPI_ASSISTANT_ID, {
      maxDurationSeconds: 1080,
      variableValues,
    });
  }, [hasPublicKey, submission]);

  const end = useCallback(() => vapi?.stop(), []);

  return { hasPublicKey, isCallActive, startLocked, error, start, end };
}

function ScoreDial({ score }: { score: number }) {
  const r = 54;
  const c = 2 * Math.PI * r;
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const target = Math.min(100, Math.max(0, score));
    setDisplay(0);
    const delay = 300;
    const duration = 1600;
    let startAt: number | null = null;

    const frame = (now: number) => {
      if (startAt === null) startAt = now;
      const elapsed = now - startAt - delay;
      if (elapsed < 0) {
        rafRef.current = requestAnimationFrame(frame);
        return;
      }
      const t = Math.min(1, elapsed / duration);
      setDisplay(Math.round(target * easeOutCubic(t)));
      if (t < 1) rafRef.current = requestAnimationFrame(frame);
      else setDisplay(target);
    };
    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
  }, [score]);

  const offset = c * (1 - display / 100);

  return (
    <div className="relative flex h-[200px] w-[200px] shrink-0 items-center justify-center">
      <svg width="200" height="200" viewBox="0 0 120 120" className="absolute" aria-hidden>
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="rgba(201,151,58,0.12)"
          strokeWidth="8"
        />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke={GOLD}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform="rotate(-90 60 60)"
          style={{ transition: "stroke-dashoffset 0.05s linear" }}
        />
      </svg>
      <div className="relative z-10 text-center">
        <p
          className="text-5xl font-light tabular-nums leading-none"
          style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: WHITE }}
        >
          {display}
        </p>
        <p
          className="mt-1 text-sm tabular-nums"
          style={{ fontFamily: "'DM Mono', ui-monospace, monospace", color: DIM }}
        >
          / 100
        </p>
      </div>
    </div>
  );
}

export default function AiIqReport() {
  const [searchParams] = useSearchParams();
  const submissionId = searchParams.get("id")?.trim() ?? "";

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [row, setRow] = useState<Door4Submission | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!submissionId) {
      setLoading(false);
      setNotFound(true);
      setRow(null);
      return;
    }
    setLoading(true);
    setNotFound(false);
    setFetchError(null);

    (async () => {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        if (!cancelled) {
          setFetchError("Missing Supabase configuration (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).");
          setLoading(false);
        }
        return;
      }
      const idAsNumber = Number(submissionId);
      if (!Number.isFinite(idAsNumber)) {
        setNotFound(true);
        setRow(null);
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("door4_submissions")
        .select("*")
        .eq("id", idAsNumber)
        .maybeSingle();

      if (cancelled) return;
      if (error) {
        console.error("[AiIqReport]", error);
        setFetchError(error.message || "Could not load this report.");
        setLoading(false);
        return;
      }
      if (!data) {
        setNotFound(true);
        setRow(null);
        setLoading(false);
        return;
      }
      setRow(data as Door4Submission);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [submissionId]);

  const vapiHook = useAiIqVapi(row);

  const band = useMemo(() => normalizeBand(row?.ai_iq_band), [row?.ai_iq_band]);
  const headline = BAND_HEADLINES[band] ?? BAND_HEADLINES["AI Absent"];
  const narrative = BAND_NARRATIVES[band] ?? BAND_NARRATIVES["AI Absent"];

  const domains = useMemo(() => {
    if (!row) return [];
    const items = [
      { key: "Deployment Depth", score: row.deployment_depth_score },
      { key: "Integration Maturity", score: row.integration_maturity_score },
      { key: "Revenue Alignment", score: row.revenue_alignment_score },
      { key: "Automation Orchestration", score: row.automation_orchestration_score },
      { key: "Oversight Awareness", score: row.oversight_awareness_score },
      { key: "Team & Human Readiness", score: row.team_human_readiness_score },
      { key: "Strategic Leadership", score: row.strategic_leadership_score },
      { key: "Data Foundation", score: row.data_foundation_score },
      { key: "Customer Intelligence", score: row.customer_intelligence_score },
      { key: "Investment Posture", score: row.investment_posture_score },
    ];
    return items.map((d) => ({
      ...d,
      score: Math.min(20, Math.max(0, Math.round(Number(d.score ?? 0)))),
    }));
  }, [row]);

  const rung = Math.min(4, Math.max(2, Math.round(Number(row?.recommended_rung ?? 2))));
  const rungLabel = row?.recommended_rung_label?.trim() || (rung === 3 ? "Optimization" : rung === 4 ? "Stewardship" : "Adaptation");
  const priceLine =
    row?.recommended_rung_price?.trim() ||
    (rung === 2 ? "$297 one-time" : rung === 3 ? "From $797" : "$4,997/quarter");

  const completedDate = row?.created_at
    ? new Date(row.created_at).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  const shareReport = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(
      () => console.log("[AiIqReport] Share link copied:", url),
      () => console.warn("[AiIqReport] Clipboard failed")
    );
  };

  if (loading) {
    return (
      <AnyDoorPageShell backHref="/ai-iq" backLabel="← AI IQ™ assessment" narrow={false}>
        <div className="flex min-h-[45vh] flex-col items-center justify-center gap-4 py-16">
          <div
            className="h-10 w-10 animate-spin rounded-full border-2 border-transparent"
            style={{ borderTopColor: GOLD, borderRightColor: GOLD }}
          />
          <p className="text-white/50">Loading your report...</p>
        </div>
      </AnyDoorPageShell>
    );
  }

  if (fetchError) {
    return (
      <AnyDoorPageShell backHref="/ai-iq" backLabel="← AI IQ™ assessment" narrow={false}>
        <div className="mx-auto max-w-md text-center">
          <div className="anydoor-surface-card">
            <p className="text-lg font-medium text-white">Something went wrong</p>
            <p className="mt-2 text-sm text-white/50">{fetchError}</p>
          </div>
          <Link to="/ai-iq" className="anydoor-exp-navlink mt-8 inline-block">
            Take the AI IQ™ assessment →
          </Link>
        </div>
      </AnyDoorPageShell>
    );
  }

  if (notFound || !row) {
    return (
      <AnyDoorPageShell backHref="/ai-iq" backLabel="← AI IQ™ assessment" narrow={false}>
        <div className="mx-auto max-w-md text-center">
          <div className="anydoor-surface-card">
            <p className="text-lg font-medium text-white">Report not found</p>
            <p className="mt-2 text-sm text-white/50">This link may have expired or the ID is invalid.</p>
          </div>
          <Link to="/ai-iq" className="anydoor-exp-navlink mt-8 inline-block">
            Take the AI IQ™ assessment →
          </Link>
        </div>
      </AnyDoorPageShell>
    );
  }

  const iq = Math.min(100, Math.max(0, Math.round(Number(row.ai_iq_score ?? 0))));
  const biz = row.business_name?.trim() || row.full_name?.trim() || "your organization";

  return (
    <AnyDoorPageShell backHref="/ai-iq" backLabel="← AI IQ™ assessment" narrow={false}>
      <AnyDoorHero
        eyebrow="SOCIALUTELY · AI IQ™ REPORT"
        titleAccent="Your AI IQ™ Report"
        titleRest={biz}
        subtitle={`Completed ${completedDate} · 22 questions across 11 domains · Rung 1 complete`}
      />

      <div className="mx-auto max-w-3xl pb-16 text-[#e8eef5]">
        {/* 3. Score Hero Card */}
        <div className="anydoor-surface-card mt-2 flex flex-col gap-8 border sm:flex-row sm:items-center" style={{ borderColor: BORDER }}>
          <ScoreDial score={iq} />
          <div className="min-w-0 flex-1 space-y-4">
            <div
              className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest"
              style={{
                fontFamily: "'DM Mono', monospace",
                backgroundColor: "rgba(240,160,48,0.15)",
                color: AMBER,
              }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: AMBER }} aria-hidden />
              {band}
            </div>
            <p
              className="text-xl font-light leading-snug sm:text-2xl"
              style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: WHITE }}
            >
              {headline}
            </p>
            <p className="text-sm leading-relaxed text-white/55">{narrative[0]}</p>
            <p className="text-sm leading-relaxed text-white/55">{narrative[1]}</p>
          </div>
        </div>

        {/* 4. RUNG 1 badge strip */}
        <div
          className="mt-8 rounded-lg py-3 text-center text-xs font-bold uppercase tracking-[0.25em] text-[#07080d]"
          style={{
            fontFamily: "var(--font-dm-mono), ui-monospace, monospace",
            backgroundColor: GOLD,
          }}
        >
          ✓ Rung 1: Awareness — Complete
        </div>

        {/* 5. Domain breakdown */}
        <section className="mt-12">
          <p className="anydoor-exp-eyebrow text-left">Score by Domain · 10 Scored Areas</p>
          <div className="mt-6 grid gap-4">
            {domains.map((d) => {
              const chip = scoreChipColor(d.score);
              const pct = (d.score / 20) * 100;
              return (
                <div key={d.key} className="anydoor-surface-card border p-4" style={{ borderColor: BORDER }}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-[#e8eef5]">{d.key}</span>
                    <span
                      className="rounded px-2 py-0.5 text-xs font-semibold tabular-nums"
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        backgroundColor: `${chip}22`,
                        color: chip,
                      }}
                    >
                      {d.score}/20
                    </span>
                  </div>
                  <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: "rgba(240,242,248,0.08)" }}>
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: chip }} />
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-white/55">{domainImplication(d.score)}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* 6. Recommended Rung Card */}
        <section className="mt-14">
          <p className="anydoor-exp-eyebrow text-left">Your Recommended Next Rung · AI Readiness Labs™</p>
          <div
            className="anydoor-surface-card mt-6 border-2 p-6 sm:p-8"
            style={{
              borderColor: GOLD,
              boxShadow: "0 0 40px rgba(201,151,58,0.12)",
            }}
          >
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
              <div
                className="shrink-0 rounded-lg border px-4 py-3 text-center sm:text-left"
                style={{ borderColor: GOLD, color: GOLD, fontFamily: "var(--font-dm-mono), ui-monospace, monospace" }}
              >
                <div className="text-[10px] font-bold uppercase tracking-widest opacity-80">Rung</div>
                <div className="text-3xl font-light tabular-nums" style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}>
                  {rung}
                </div>
              </div>
              <div className="min-w-0 flex-1 space-y-4">
                <h2 className="text-2xl font-light text-white" style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}>
                  {rungLabel}
                </h2>
                <p className="text-sm text-white/55">
                  {row.recommended_rung_type === "one_time"
                    ? "One-time delivery — learn at your own pace."
                    : row.recommended_rung_type === "quarterly_contract"
                      ? "Quarterly strategic partnership — done-with-you execution."
                      : "Tiered live workshops — choose depth and cadence."}
                </p>
                <p className="text-sm leading-relaxed text-[#e8eef5]/90">{rungBody(rung)}</p>
                <p className="text-3xl font-light tabular-nums text-[#c9973a]" style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}>
                  {priceLine}
                </p>
                <a
                  href={CTA_AI_READINESS_LABS}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="anydoor-btn-gold inline-block w-full text-center sm:w-auto sm:min-w-[240px]"
                >
                  {rungCtaLabel(rung)}
                </a>
                <p className="text-xs text-white/45">{rungSubLabel(rung)}</p>
              </div>
            </div>
          </div>
        </section>

        {/* 7. HubAI */}
        <section className="mt-10">
          <div className="anydoor-surface-card border" style={{ borderColor: "rgba(201,151,58,0.15)" }}>
            <h3 className="text-lg font-light text-white" style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}>
              Start applying what you learned — today.
            </h3>
            <p className="mt-2 text-sm text-white/55">HubAI™ platform access · $97/month</p>
            <a
              href={CTA_HUBAI}
              target="_blank"
              rel="noopener noreferrer"
              className="anydoor-btn-outline mt-4 inline-block"
            >
              Get HubAI Access →
            </a>
            <p className="mt-3 text-xs text-white/45">White-labeled CRM + automation + workflow tools</p>
          </div>
        </section>

        {/* 8. Talk to Jordan */}
        <section className="anydoor-surface-card mt-10 border px-6 py-8 text-center sm:px-8" style={{ borderColor: BORDER }}>
          <p className="text-base font-light text-white" style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}>
            Prefer to talk through your results?
          </p>
          {!vapiHook.hasPublicKey ? (
            <p className="mt-4 text-xs text-white/45">
              Voice unavailable: add <span className="font-mono text-[#c9973a]">VITE_VAPI_PUBLIC_KEY</span> and rebuild.
            </p>
          ) : (
            <>
              {vapiHook.error ? (
                <p className="mt-4 text-sm text-red-400" role="alert">
                  {vapiHook.error}
                </p>
              ) : null}
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                {!vapiHook.isCallActive ? (
                  <button
                    type="button"
                    disabled={vapiHook.startLocked}
                    onClick={vapiHook.start}
                    className="anydoor-btn-outline inline-flex items-center gap-2 border-[#c9973a]/50 bg-[#c9973a]/10 text-[#c9973a] hover:border-[#c9973a] disabled:pointer-events-none disabled:opacity-50"
                  >
                    <Mic className="h-4 w-4" aria-hidden />
                    Tap to Talk — Jordan
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={vapiHook.end}
                    className="inline-flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-5 py-3 text-sm font-semibold text-red-400"
                  >
                    <PhoneOff className="h-4 w-4" aria-hidden />
                    End call
                  </button>
                )}
              </div>
              <p className="mt-3 text-[11px] text-white/45">
                Microphone required · same Evaluation Specialist as your diagnostic reports.
              </p>
            </>
          )}
        </section>

        {/* 9. Footer */}
        <footer className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 sm:flex-row">
          <p className="text-center text-xs text-white/45 sm:text-left" style={{ fontFamily: "var(--font-dm-mono), ui-monospace, monospace" }}>
            Socialutely | AI Marketing Platform · AI IQ™ v1 · Door 4
          </p>
          <button
            type="button"
            onClick={shareReport}
            className="text-xs font-semibold text-[#c9973a] underline decoration-[#c9973a]/50 hover:opacity-90"
          >
            Share this report
          </button>
        </footer>

        <p className="mt-8 text-center text-[10px] text-white/30">
          <Link to="/" className="anydoor-exp-navlink !no-underline hover:!underline">
            ← Platform home
          </Link>
        </p>
      </div>
    </AnyDoorPageShell>
  );
}
