import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useSession } from "@/context/SessionContext";
import { getSupabaseBrowserClient } from "@/anydoor/lib/supabaseBrowserClient";
import { AnyDoorHero, AnyDoorPageShell } from "@/components/anydoor/AnyDoorExperience";
import { getBusinessEmailError } from "@/lib/aiIq/door4Email";
import { topGapDomains } from "@/lib/aiIq/door4GapServices";
import {
  bandLabelFromScore,
  computeScoresFromAnswers,
  DOMAIN_LABEL,
  DOMAIN_MAX,
  type DomainKey,
  parseAiqNumber,
  rungFromTotalScore,
} from "@/lib/aiIq/door4Scoring";

/** Door B1-aligned chrome (#c9973a, Cormorant heroes, anydoor-* fields) */
const BG = "#07080d";
const GOLD = "#c9973a";
const WHITE = "#e8eef5";
const DIM = "rgba(232,238,245,0.55)";

type QuestionRow = {
  question_id: string;
  domain: string;
  question: string;
  option: string;
  score: number;
};

type GroupedQuestion = {
  question_id: string;
  domain: string;
  question: string;
  options: Array<{ option: string; score: number }>;
};

function groupAndSortQuestions(rows: QuestionRow[]): GroupedQuestion[] {
  const map = new Map<string, GroupedQuestion>();
  for (const r of rows) {
    let g = map.get(r.question_id);
    if (!g) {
      g = {
        question_id: r.question_id,
        domain: r.domain,
        question: r.question,
        options: [],
      };
      map.set(r.question_id, g);
    }
    g.options.push({ option: r.option, score: Number(r.score) });
  }
  const list = Array.from(map.values());
  list.sort((a, b) => {
    const na = parseAiqNumber(a.question_id);
    const nb = parseAiqNumber(b.question_id);
    if (na === 22) return 1;
    if (nb === 22) return -1;
    return na - nb;
  });
  return list;
}

const BAND_HEADLINES: Record<string, string> = {
  "AI Absent": "AI hasn't entered the building yet",
  Experimental: "AI is present, but working in silos",
  Emerging: "AI is running — but not yet earning",
  Integrated: "AI is earning — now it needs governing",
  "Intelligent Infrastructure": "AI is embedded at the infrastructure level",
};

const RUNG2_URL =
  (import.meta.env.VITE_AI_IQ_RUNG2_URL as string | undefined)?.trim() || "/ai-readiness/rung-2";
const RUNG3_URL =
  (import.meta.env.VITE_AI_IQ_RUNG3_URL as string | undefined)?.trim() || "/ai-readiness/rung-3";
const RUNG4_URL =
  (import.meta.env.VITE_AI_IQ_DISCOVERY_CALENDAR_URL as string | undefined)?.trim() ||
  "https://cal.com/placeholder";

function domainBarColor(score: number, max: number): string {
  const r = max > 0 ? score / max : 0;
  if (r >= 0.66) return "#2ecc8a";
  if (r >= 0.33) return "#f0a030";
  return "#e05050";
}

export default function AiIqAssessmentPage() {
  const { mergeSession, ...sessionSnapshot } = useSession();
  const [phase, setPhase] = useState<"loading" | "gate" | "quiz" | "results">("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<GroupedQuestion[]>([]);

  const [name, setName] = useState(sessionSnapshot.name);
  const [email, setEmail] = useState(sessionSnapshot.email);
  const [url, setUrl] = useState(sessionSnapshot.url);
  const [gateError, setGateError] = useState<string | null>(null);

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Map<string, number>>(new Map());
  const [selectedOptionByQuestion, setSelectedOptionByQuestion] = useState<Map<string, string>>(new Map());
  /** Set when user taps an option; used to auto-advance without an extra "Next" click. */
  const pendingQuizAdvanceRef = useRef(false);
  const quizAdvanceTimeoutRef = useRef<number | null>(null);

  const [resultTotal, setResultTotal] = useState(0);
  const [resultDomains, setResultDomains] = useState<Record<DomainKey, number> | null>(null);
  const [resultBand, setResultBand] = useState("");
  const [resultRung, setResultRung] = useState<2 | 3 | 4>(2);
  const [orgContext, setOrgContext] = useState<{ option: string; question: string } | null>(null);
  const [persistError, setPersistError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        if (!cancelled) {
          setLoadError("Missing Supabase configuration (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).");
          setPhase("gate");
        }
        return;
      }
      const { data, error } = await supabase
        .from("door9_ai_iq_questions")
        .select("question_id, domain, question, option, score");
      if (cancelled) return;
      if (error) {
        setLoadError(error.message);
        setPhase("gate");
        return;
      }
      const rows = (data ?? []) as QuestionRow[];
      rows.sort((a, b) => {
        const na = parseAiqNumber(a.question_id);
        const nb = parseAiqNumber(b.question_id);
        if (na === 22) return 1;
        if (nb === 22) return -1;
        return na - nb;
      });
      const grouped = groupAndSortQuestions(rows);
      setQuestions(grouped);
      setLoadError(rows.length === 0 ? "No questions loaded. Seed `door9_ai_iq_questions` in Supabase." : null);
      setPhase("gate");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const totalSteps = questions.length;
  const current = questions[step];

  const startQuiz = useCallback(() => {
    setGateError(null);
    const em = getBusinessEmailError(email);
    if (em) {
      setGateError(em);
      return;
    }
    if (!name.trim()) {
      setGateError("Enter your name.");
      return;
    }
    if (questions.length === 0) {
      setGateError("Questions are not available yet.");
      return;
    }
    mergeSession({
      name: name.trim(),
      email: email.trim(),
      url: url.trim(),
    });
    setStep(0);
    setAnswers(new Map());
    setSelectedOptionByQuestion(new Map());
    setPhase("quiz");
  }, [email, mergeSession, name, questions.length, url]);

  const selectOption = useCallback((qid: string, optionLabel: string, score: number) => {
    setSelectedOptionByQuestion((prev) => {
      if (prev.get(qid) === optionLabel) return prev;
      pendingQuizAdvanceRef.current = true;
      const next = new Map(prev);
      next.set(qid, optionLabel);
      return next;
    });
    setAnswers((prev) => {
      const next = new Map(prev);
      next.set(qid, score);
      return next;
    });
  }, []);

  const finishQuiz = useCallback(async () => {
    const ids = new Set(questions.map((q) => q.question_id));
    const { total, domains } = computeScoresFromAnswers(answers, ids);
    const n22 = questions.find((q) => parseAiqNumber(q.question_id) === 22);
    const optLabel = n22 ? selectedOptionByQuestion.get(n22.question_id) : undefined;
    setOrgContext(n22 && optLabel ? { option: optLabel, question: n22.question } : null);
    setResultTotal(total);
    setResultDomains(domains);
    setResultBand(bandLabelFromScore(total));
    setResultRung(rungFromTotalScore(total));
    setPhase("results");
    setSubmitting(true);
    setPersistError(null);

    mergeSession({
      name: name.trim(),
      email: email.trim(),
      url: url.trim(),
      diagnostic_score: total,
    });

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setPersistError("Could not save — Supabase is not configured.");
      setSubmitting(false);
      return;
    }

    const orgContextText = optLabel?.trim() || null;

    const submissionRow = {
      name: name.trim(),
      email: email.trim(),
      url: url.trim() || null,
      total_score: total,
      org_context: orgContextText,
      deployment_depth_score: domains.deployment_depth,
      integration_maturity_score: domains.integration_maturity,
      revenue_alignment_score: domains.revenue_alignment,
      automation_orchestration_score: domains.automation_orchestration,
      oversight_awareness_score: domains.oversight_awareness,
      team_human_readiness_score: domains.team_human_readiness,
      strategic_leadership_score: domains.strategic_leadership,
      recommended_rung: rungFromTotalScore(total),
      source: "door4-ai-iq",
    };

    const { error: d9Err } = await supabase.from("door9_submissions").insert(submissionRow);

    const rung = rungFromTotalScore(total);
    const notes = `Rung ${rung} · ${orgContextText ?? "No org context provided"}`;

    const { error: pErr } = await supabase.from("layer5_prospects").upsert(
      {
        email: email.trim(),
        name: name.trim(),
        business_name: name.trim(),
        url: url.trim() || null,
        overall_score: total,
        source: "door4-ai-iq",
        notes,
      },
      { onConflict: "email" }
    );

    const parts: string[] = [];
    if (d9Err) parts.push(`door9_submissions: ${d9Err.message}`);
    if (pErr) parts.push(`layer5_prospects: ${pErr.message}`);
    if (parts.length > 0) setPersistError(parts.join(" · "));

    setSubmitting(false);
  }, [answers, email, mergeSession, name, questions, selectedOptionByQuestion, url]);

  const goBack = useCallback(() => {
    pendingQuizAdvanceRef.current = false;
    if (step <= 0) {
      setPhase("gate");
      return;
    }
    setStep((s) => s - 1);
  }, [step]);

  /** After a choice is registered for the current step, move on (or finish) without a separate Next click. */
  useEffect(() => {
    if (phase !== "quiz" || !current || !pendingQuizAdvanceRef.current) return;
    if (!answers.has(current.question_id)) return;
    pendingQuizAdvanceRef.current = false;
    if (quizAdvanceTimeoutRef.current !== null) {
      window.clearTimeout(quizAdvanceTimeoutRef.current);
    }
    quizAdvanceTimeoutRef.current = window.setTimeout(() => {
      quizAdvanceTimeoutRef.current = null;
      if (step >= totalSteps - 1) {
        void finishQuiz();
      } else {
        setStep((s) => s + 1);
      }
    }, 160);
    return () => {
      if (quizAdvanceTimeoutRef.current !== null) {
        window.clearTimeout(quizAdvanceTimeoutRef.current);
        quizAdvanceTimeoutRef.current = null;
      }
    };
  }, [answers, phase, current, step, totalSteps, finishQuiz]);

  const gapBlocks = useMemo(() => (resultDomains ? topGapDomains(resultDomains) : []), [resultDomains]);

  const cta = useMemo(() => {
    if (resultRung === 2)
      return { href: RUNG2_URL, label: "Enroll in Rung 2 — Adaptation" };
    if (resultRung === 3)
      return { href: RUNG3_URL, label: "Enroll in Rung 3 — Optimization" };
    return { href: RUNG4_URL, label: "Book a discovery call" };
  }, [resultRung]);

  const headline = BAND_HEADLINES[resultBand] ?? BAND_HEADLINES["AI Absent"];

  if (phase === "loading") {
    return (
      <AnyDoorPageShell>
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4" style={{ color: WHITE }}>
          <div
            className="h-10 w-10 animate-spin rounded-full border-2 border-transparent"
            style={{ borderTopColor: GOLD, borderRightColor: GOLD }}
          />
          <p style={{ color: DIM }}>Loading assessment…</p>
        </div>
      </AnyDoorPageShell>
    );
  }

  return (
    <AnyDoorPageShell>
      {phase === "gate" && (
        <>
          <AnyDoorHero
            eyebrow="Socialutely · AI Readiness Labs™"
            titleAccent="AI IQ™"
            titleRest="Assessment"
            subtitle="A few details, then one question at a time. Takes about 8–12 minutes."
          />
          {loadError && (
            <p className="mx-auto mb-6 max-w-md rounded border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-center text-sm text-amber-200">
              {loadError}
            </p>
          )}
          <section className="mx-auto w-full max-w-md space-y-4">
            <div>
              <label htmlFor="aiq-name" className="anydoor-field-label--primary">
                Name
              </label>
              <input
                id="aiq-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="anydoor-field-input"
                placeholder="Your name"
                autoComplete="name"
              />
            </div>
            <div>
              <label htmlFor="aiq-email" className="anydoor-field-label--primary">
                Business email
              </label>
              <input
                id="aiq-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="anydoor-field-input"
                placeholder="you@company.com"
                autoComplete="email"
              />
            </div>
            <div>
              <label htmlFor="aiq-url" className="anydoor-field-label--muted">
                Business URL <span className="text-white/35">(optional)</span>
              </label>
              <input
                id="aiq-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="anydoor-field-input"
                placeholder="https://"
                autoComplete="url"
              />
            </div>
            {gateError && <p className="text-center text-sm text-red-400">{gateError}</p>}
            <button
              type="button"
              className="anydoor-btn-gold"
              onClick={startQuiz}
              disabled={questions.length === 0}
            >
              Begin assessment
            </button>
          </section>
        </>
      )}

      {phase === "quiz" && current && (
        <div className="mx-auto max-w-2xl">
          <div className="mb-8">
            <div className="mb-2 flex justify-between text-xs font-mono" style={{ color: DIM }}>
              <span>Progress</span>
              <span>{Math.min(100, Math.round(((step + 1) / totalSteps) * 100))}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.08]">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${((step + 1) / totalSteps) * 100}%`,
                  backgroundColor: GOLD,
                }}
              />
            </div>
          </div>

          <div className="mb-8 text-center">
            <p className="anydoor-exp-eyebrow">{current.domain}</p>
            <h2
              className="mt-6 font-light leading-snug text-white sm:text-3xl"
              style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}
            >
              {current.question}
            </h2>
            <p className="mt-2 font-mono text-[10px] text-white/35">{current.question_id}</p>
          </div>

          <div className="grid gap-3">
            {current.options.map((opt) => {
              const selected = selectedOptionByQuestion.get(current.question_id) === opt.option;
              return (
                <button
                  key={opt.option}
                  type="button"
                  onClick={() => selectOption(current.question_id, opt.option, opt.score)}
                  className={`anydoor-option-tile ${selected ? "anydoor-option-tile--selected" : ""}`}
                >
                  {opt.option}
                </button>
              );
            })}
          </div>

          <div className="mt-10 flex flex-wrap justify-center gap-3 sm:justify-start">
            <button type="button" className="anydoor-btn-outline" onClick={goBack}>
              Back
            </button>
            <p className="w-full text-center text-xs text-white/40 sm:w-auto sm:text-left">Tap an answer to continue.</p>
          </div>
        </div>
      )}

      {phase === "results" && resultDomains && (
        <div className="mx-auto max-w-3xl">
          <div className="anydoor-surface-card">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: GOLD }}>
              Your score
            </p>
            <div className="mt-4 flex flex-col gap-6 sm:flex-row sm:items-end">
              <div>
                <span
                  className="text-5xl font-light tabular-nums text-white"
                  style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}
                >
                  {resultTotal}
                </span>
                <span className="text-lg text-white/50"> / 100</span>
              </div>
              <div>
                <p className="text-lg font-semibold" style={{ color: WHITE }}>
                  {resultBand}
                </p>
                <p className="mt-1 text-sm" style={{ color: DIM }}>
                  {headline}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 bg-[#c9973a] py-3 text-center font-[family-name:var(--font-dm-mono)] text-xs font-bold uppercase tracking-[0.25em] text-[#07080d]">
            ✓ Rung 1: Awareness — complete
          </div>

          <section className="mt-10">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.3em]" style={{ color: GOLD }}>
              Score by domain
            </p>
            <div className="mt-4 grid gap-4">
              {(Object.keys(DOMAIN_MAX) as DomainKey[]).map((key) => {
                const max = DOMAIN_MAX[key];
                const score = resultDomains[key];
                const pct = max > 0 ? (score / max) * 100 : 0;
                const chip = domainBarColor(score, max);
                return (
                  <div key={key} className="anydoor-surface-card p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span style={{ color: WHITE }}>{DOMAIN_LABEL[key]}</span>
                      <span
                        className="rounded px-2 py-0.5 text-xs font-semibold tabular-nums"
                        style={{ backgroundColor: `${chip}22`, color: chip }}
                      >
                        {score}/{max}
                      </span>
                    </div>
                    <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: "rgba(240,242,248,0.08)" }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: chip }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="mt-12">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.3em]" style={{ color: GOLD }}>
              Recommended next rung
            </p>
            <div
              className="mt-4 rounded-xl border-2 border-[#c9973a]/50 bg-[#07080d]/90 p-6 shadow-[0_0_40px_rgba(201,151,58,0.12)]"
            >
              <p
                className="text-3xl font-light tabular-nums text-[#c9973a]"
                style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}
              >
                Rung {resultRung}
              </p>
              <p className="mt-2 text-lg font-semibold">
                {resultRung === 2 ? "Adaptation™" : resultRung === 3 ? "Optimization™" : "Stewardship™"}
              </p>
              <p className="mt-3 text-sm leading-relaxed" style={{ color: DIM }}>
                {resultRung === 2 &&
                  "Practical path to adopt AI without boiling the ocean — clarity and a plan you can execute."}
                {resultRung === 3 &&
                  "Workshop-style facilitation so adoption matches how your business actually runs."}
                {resultRung === 4 &&
                  "Strategic sequencing and done-with-you implementation as AI becomes infrastructure."}
              </p>
            </div>
          </section>

          {gapBlocks.length > 0 && (
            <section className="mt-10">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.3em]" style={{ color: GOLD }}>
                Infrastructure focus areas
              </p>
              <p className="mt-2 text-sm" style={{ color: DIM }}>
                Where scores are relatively lowest, these Socialutely services close the gap:
              </p>
              <div className="mt-4 grid gap-3">
                {gapBlocks.map((block) => (
                  <div key={block.domain} className="anydoor-surface-card p-4">
                    <p className="text-sm font-semibold text-white">{block.domain}</p>
                    <p className="mt-1 text-sm" style={{ color: DIM }}>
                      {block.services.map((s) => s.label).join(" · ")}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="mt-10 flex flex-col items-start gap-3">
            {cta.href.startsWith("/") ? (
              <Link
                to={cta.href}
                className="inline-block rounded-lg bg-[#c9973a] px-6 py-3 text-center text-sm font-semibold uppercase tracking-wide text-[#07080d] transition-colors hover:bg-[#c9973a]/90"
              >
                {cta.label}
              </Link>
            ) : (
              <a
                href={cta.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block rounded-lg bg-[#c9973a] px-6 py-3 text-center text-sm font-semibold uppercase tracking-wide text-[#07080d] transition-colors hover:bg-[#c9973a]/90"
              >
                {cta.label}
              </a>
            )}
            {submitting && <p className="text-xs" style={{ color: DIM }}>Saving results…</p>}
            {persistError && <p className="text-xs text-amber-400">{persistError}</p>}
          </div>

          {orgContext && (
            <p className="mt-8 text-xs" style={{ color: DIM }}>
              Context captured for your report: {orgContext.option}
            </p>
          )}
        </div>
      )}
    </AnyDoorPageShell>
  );
}
