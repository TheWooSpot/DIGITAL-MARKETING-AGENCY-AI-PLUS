import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSession } from "@/context/SessionContext";
import { getSupabaseBrowserClient } from "@/anydoor/lib/supabaseBrowserClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const BG = "#070d1a";
const CARD = "#0e1829";
const GOLD = "#c9a227";
const BORDER = "rgba(201,162,39,0.25)";
const WHITE = "#f0f2f8";
const DIM = "rgba(240,242,248,0.55)";

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

    const orgJson =
      n22 && optLabel
        ? { question: n22.question, selected_option: optLabel }
        : null;

    const submissionRow = {
      name: name.trim(),
      email: email.trim(),
      url: url.trim() || null,
      total_score: total,
      org_context: orgJson ? JSON.stringify(orgJson) : null,
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
    const notes = `Recommended Rung ${rung} (${rung === 2 ? "Adaptation" : rung === 3 ? "Optimization" : "Stewardship"}). ${orgJson ? `Org context: ${JSON.stringify(orgJson)}` : ""}`;

    const prospectRow: Record<string, unknown> = {
      business_name: name.trim(),
      email: email.trim(),
      url: url.trim() || null,
      overall_score: total,
      source: "door4-ai-iq",
      notes,
      industry: "Unknown",
      share_token: crypto.randomUUID(),
      prospect_summary: `AI IQ™ Door 4 — ${bandLabelFromScore(total)} (${total}/100).`,
      estimated_value: 0,
      visibility_score: 0,
      engagement_score: 0,
      conversion_score: 0,
      recommended_tier: "Essentials",
      recommended_services: [],
      detected_gaps: [],
    };

    const { error: pErr } = await supabase.from("layer5_prospects").insert(prospectRow);

    const parts: string[] = [];
    if (d9Err) parts.push(`door9_submissions: ${d9Err.message}`);
    if (pErr) parts.push(`layer5_prospects: ${pErr.message}`);
    if (parts.length > 0) setPersistError(parts.join(" · "));

    setSubmitting(false);
  }, [answers, email, mergeSession, name, questions, selectedOptionByQuestion, url]);

  const goNext = useCallback(() => {
    if (!current) return;
    if (!answers.has(current.question_id)) return;
    if (step >= totalSteps - 1) {
      void finishQuiz();
      return;
    }
    setStep((s) => s + 1);
  }, [answers, current, finishQuiz, step, totalSteps]);

  const goBack = useCallback(() => {
    if (step <= 0) {
      setPhase("gate");
      return;
    }
    setStep((s) => s - 1);
  }, [step]);

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
      <div
        className="flex min-h-screen flex-col items-center justify-center gap-4"
        style={{ backgroundColor: BG, color: WHITE }}
      >
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-transparent"
          style={{ borderTopColor: GOLD, borderRightColor: GOLD }}
        />
        <p style={{ color: DIM }}>Loading assessment…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-16" style={{ backgroundColor: BG, color: WHITE }}>
      <header
        className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-4 sm:px-8"
        style={{ borderBottomWidth: 1, borderBottomColor: GOLD }}
      >
        <Link to="/" className="text-sm font-semibold tracking-tight" style={{ color: GOLD }}>
          ← Home
        </Link>
        <span className="text-xs font-mono uppercase tracking-[0.2em]" style={{ color: DIM }}>
          AI IQ™ · Door 4
        </span>
      </header>

      {phase === "gate" && (
        <main className="mx-auto max-w-lg px-4 pt-12">
          <p className="font-mono text-[10px] uppercase tracking-[0.35em]" style={{ color: GOLD }}>
            Socialutely · AI Readiness Labs™
          </p>
          <h1 className="mt-3 text-3xl font-bold" style={{ fontFamily: "'Syne', system-ui, sans-serif" }}>
            AI IQ™ Assessment
          </h1>
          <p className="mt-2 text-sm" style={{ color: DIM }}>
            A few details, then one question at a time. Takes about 8–12 minutes.
          </p>
          {loadError && (
            <p className="mt-4 rounded border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
              {loadError}
            </p>
          )}
          <div className="mt-8 space-y-5 rounded-xl border p-6" style={{ backgroundColor: CARD, borderColor: BORDER }}>
            <div>
              <Label htmlFor="aiq-name" className="text-white">
                Name
              </Label>
              <Input
                id="aiq-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5 border-white/10 bg-black/20 text-white"
                placeholder="Your name"
                autoComplete="name"
              />
            </div>
            <div>
              <Label htmlFor="aiq-email" className="text-white">
                Business email
              </Label>
              <Input
                id="aiq-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 border-white/10 bg-black/20 text-white"
                placeholder="you@company.com"
                autoComplete="email"
              />
            </div>
            <div>
              <Label htmlFor="aiq-url" className="text-white">
                Business URL <span style={{ color: DIM }}>(optional)</span>
              </Label>
              <Input
                id="aiq-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="mt-1.5 border-white/10 bg-black/20 text-white"
                placeholder="https://"
                autoComplete="url"
              />
            </div>
            {gateError && <p className="text-sm text-red-400">{gateError}</p>}
            <Button
              type="button"
              className="w-full font-semibold"
              style={{ backgroundColor: GOLD, color: BG }}
              onClick={startQuiz}
              disabled={questions.length === 0}
            >
              Begin assessment
            </Button>
          </div>
        </main>
      )}

      {phase === "quiz" && current && (
        <main className="mx-auto max-w-2xl px-4 pt-8">
          <div className="mb-6">
            <div className="mb-2 flex justify-between text-xs font-mono" style={{ color: DIM }}>
              <span>Progress</span>
              <span>{Math.min(100, Math.round(((step + 1) / totalSteps) * 100))}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: "rgba(240,242,248,0.08)" }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${((step + 1) / totalSteps) * 100}%`,
                  backgroundColor: GOLD,
                }}
              />
            </div>
          </div>

          <p className="font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: GOLD }}>
            {current.domain}
          </p>
          <h2 className="mt-2 text-xl font-semibold leading-snug sm:text-2xl" style={{ fontFamily: "'Syne', sans-serif" }}>
            {current.question}
          </h2>
          <p className="mt-1 text-xs" style={{ color: DIM }}>
            {current.question_id}
          </p>

          <div className="mt-8 grid gap-3">
            {current.options.map((opt) => {
              const selected = selectedOptionByQuestion.get(current.question_id) === opt.option;
              return (
                <button
                  key={opt.option}
                  type="button"
                  onClick={() => selectOption(current.question_id, opt.option, opt.score)}
                  className="rounded-lg border p-4 text-left text-sm transition hover:border-[#c9a227]/50"
                  style={{
                    backgroundColor: selected ? "rgba(201,162,39,0.12)" : CARD,
                    borderColor: selected ? GOLD : BORDER,
                    color: WHITE,
                  }}
                >
                  {opt.option}
                </button>
              );
            })}
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <Button type="button" variant="outline" className="border-white/20 bg-transparent text-white" onClick={goBack}>
              Back
            </Button>
            <Button
              type="button"
              disabled={!answers.has(current.question_id)}
              className="font-semibold"
              style={{ backgroundColor: GOLD, color: BG }}
              onClick={goNext}
            >
              {step >= totalSteps - 1 ? "See results" : "Next"}
            </Button>
          </div>
        </main>
      )}

      {phase === "results" && resultDomains && (
        <main className="mx-auto max-w-3xl px-4 pt-10 sm:px-6">
          <div
            className="rounded-xl border p-6 sm:p-8"
            style={{ backgroundColor: CARD, borderColor: BORDER }}
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: GOLD }}>
              Your score
            </p>
            <div className="mt-4 flex flex-col gap-6 sm:flex-row sm:items-end">
              <div>
                <span className="text-5xl font-extrabold tabular-nums" style={{ fontFamily: "'Syne', sans-serif" }}>
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

          <div
            className="mt-6 py-3 text-center text-xs font-bold uppercase tracking-[0.25em]"
            style={{ fontFamily: "'DM Mono', monospace", backgroundColor: GOLD, color: BG }}
          >
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
                  <div key={key} className="rounded-lg border p-4" style={{ backgroundColor: CARD, borderColor: BORDER }}>
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
              className="mt-4 rounded-xl border-2 p-6"
              style={{ borderColor: GOLD, backgroundColor: CARD, boxShadow: `0 0 40px rgba(201,162,39,0.12)` }}
            >
              <p className="text-3xl font-extrabold tabular-nums" style={{ fontFamily: "'Syne', sans-serif", color: GOLD }}>
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
                  <div key={block.domain} className="rounded-lg border p-4" style={{ borderColor: BORDER, backgroundColor: CARD }}>
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
                className="inline-block rounded-lg px-6 py-3 text-center text-sm font-bold uppercase tracking-wide"
                style={{ backgroundColor: GOLD, color: BG }}
              >
                {cta.label}
              </Link>
            ) : (
              <a
                href={cta.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block rounded-lg px-6 py-3 text-center text-sm font-bold uppercase tracking-wide"
                style={{ backgroundColor: GOLD, color: BG }}
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
        </main>
      )}
    </div>
  );
}
