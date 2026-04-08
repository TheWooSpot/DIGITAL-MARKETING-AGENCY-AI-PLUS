import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getSupabaseBrowserClient } from "@/anydoor/lib/supabaseBrowserClient";
import { AnyDoorPageShell } from "@/components/anydoor/AnyDoorExperience";
import { useSession } from "@/context/SessionContext";
import { invokeSupabaseEdgeFunction } from "@/lib/door3/invokeEdge";
import { door3ServiceName } from "@/lib/door3/serviceNames";
import type { DiscoveryQuestion, Door3Analysis, NextStepKey } from "@/lib/door3/types";
import { getEvaluationSpecialistAssistantId } from "@/anydoor/useDiagnosticVapiCall";
import { vapi } from "@/lib/vapiClient";
import { appendVapiAssistantKeyHint, extractVapiErrorMessage } from "@/lib/vapiErrors";
import { Mic, PhoneOff } from "lucide-react";

/** Aligned with AiIqAssessmentPage / AnyDoor tokens */
const GOLD = "#c9973a";
const WHITE = "#e8eef5";
const DIM = "rgba(232,238,245,0.55)";

type Stage = "gate" | "welcome" | "loading" | "questions" | "processing" | "results" | "rate_limited";
interface IntroContent {
  address: string;
  nuggets: string[];
  frame: string;
}

const FALLBACK_INTRO: IntroContent = {
  address: "Thanks for being here.",
  nuggets: [
    "Most businesses don't have a marketing problem first — they have a clarity problem that makes every tactic feel harder.",
    "What feels like inconsistent demand is often inconsistent positioning; when the message is sharp, the right buyers self-identify faster.",
  ],
  frame: "Seven questions. Honest answers. We'll reflect back exactly what we hear.",
};

const FALLBACK_QUESTIONS: DiscoveryQuestion[] = [
  { id: "Q1", domain: "situation", question: "Walk me through how new customers typically find you right now.", placeholder: "Describe your current reality..." },
  { id: "Q2", domain: "problem", question: "What part of growth feels hardest to solve consistently today?", placeholder: "Name the hardest part..." },
  { id: "Q3", domain: "consequence", question: "If nothing changes in the next year, what does that cost you?", placeholder: "What does staying the same mean?" },
  { id: "Q4", domain: "goal", question: "If 18 months went remarkably well, what would look meaningfully different?", placeholder: "Describe your best-case future..." },
  { id: "Q5", domain: "solution", question: "What becomes possible for you when this finally works as it should?", placeholder: "What unlocks for you?" },
  { id: "Q6", domain: "priority", question: "What single issue in the next 90 days would make everything else easier?", placeholder: "Pick the one thing..." },
  { id: "Q7", domain: "context", question: "What have you already tried, and what blocked it from working?", placeholder: "Share what you've already tested..." },
];

const PRIMING_TEXT_BY_NEXT_INDEX: Record<number, string> = {
  1: "Most people can describe what they do. Very few have named what's actually getting in the way.",
  2: "The cost of an unsolved problem is rarely just financial. Take your time with this one.",
  3: "Businesses that can articulate a specific 18-month vision make decisions 3x faster than those that can't.",
  4: "The next question isn't about strategy. It's about permission — what you'd allow yourself to do differently.",
  5: "Clarity on the single most urgent thing is worth more than a perfect plan for ten things.",
  6: "What you've already tried tells us more about your situation than almost anything else.",
};

function validEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

function nextStepHref(step: NextStepKey): string {
  switch (step) {
    case "diagnostic":
      return "/doors/url-diagnostic";
    case "ai-iq":
      return "/ai-iq";
    case "calculator":
      return "/calculator";
    case "dream":
      return "/dream";
    default:
      return "/doors/url-diagnostic";
  }
}

function nextStepLabel(step: NextStepKey): { title: string; body: string } {
  switch (step) {
    case "diagnostic":
      return {
        title: "Run your free URL diagnostic",
        body: "See your business from the outside — clear, objective, actionable.",
      };
    case "ai-iq":
      return {
        title: "Take the AI IQ™",
        body: "Find out where you actually stand on the AI adoption curve.",
      };
    case "calculator":
      return {
        title: "See what this could be worth",
        body: "Model projected return — not line-item pricing.",
      };
    case "dream":
      return {
        title: "Talk to Amelia",
        body: "Explore the future you're building — voice-led Dreamscape™.",
      };
    default:
      return { title: "Next step", body: "" };
  }
}

export default function SelfDiscoveryPage() {
  const { mergeSession, ...sessionSnap } = useSession();
  const [stage, setStage] = useState<Stage>("gate");
  const [firstName, setFirstName] = useState(sessionSnap.name.split(/\s+/)[0] || sessionSnap.name || "");
  const [email, setEmail] = useState(sessionSnap.email);
  const [url, setUrl] = useState(sessionSnap.url);
  const [gateError, setGateError] = useState<string | null>(null);

  const [questions, setQuestions] = useState<DiscoveryQuestion[]>([]);
  const [industryCtx, setIndustryCtx] = useState<string>("");
  const [businessDescriptorCtx, setBusinessDescriptorCtx] = useState<string>("");
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [fadeKey, setFadeKey] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [showPriming, setShowPriming] = useState(false);
  const [primingText, setPrimingText] = useState("");
  const [questionVisible, setQuestionVisible] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [intro, setIntro] = useState<IntroContent | null>(null);
  const [questionsReady, setQuestionsReady] = useState(false);
  const [welcomeMinTimeMet, setWelcomeMinTimeMet] = useState(false);
  const [questionLoadFailed, setQuestionLoadFailed] = useState(false);

  const [analysis, setAnalysis] = useState<Door3Analysis | null>(null);
  const [vapiErr, setVapiErr] = useState<string | null>(null);
  const [callActive, setCallActive] = useState(false);

  const currentQ = questions[qIndex];
  const totalSteps = 7;
  const progressPct = questions.length > 0 ? Math.min(100, Math.round(((qIndex + 1) / totalSteps) * 100)) : 0;
  const currentAnswer = answers[qIndex] ?? "";

  const minutesElapsed = useMemo(() => {
    if (!startedAt) return 1;
    return Math.max(1, Math.round((Date.now() - startedAt) / 60000));
  }, [startedAt, stage]);

  useEffect(() => {
    const n = sessionSnap.name.trim();
    if (n && !firstName) {
      const first = n.split(/\s+/)[0];
      setFirstName(first);
    }
    if (sessionSnap.email && !email) setEmail(sessionSnap.email);
    if (sessionSnap.url && !url) setUrl(sessionSnap.url);
  }, [sessionSnap.name, sessionSnap.email, sessionSnap.url, firstName, email, url]);

  const fetchQuestionsInBackground = useCallback(async (fullName: string, nextEmail: string, nextUrl: string) => {
    const res = await invokeSupabaseEdgeFunction("door3-questions", {
      name: fullName,
      email: nextEmail,
      url: nextUrl || undefined,
    });
    const json = (await res.json().catch(() => ({}))) as {
      questions?: DiscoveryQuestion[];
      context?: {
        industry?: string;
        business_descriptor?: string;
        name?: string;
      };
      intro?: IntroContent;
      industry?: string;
      business_descriptor?: string;
      error?: string;
    };
    if (!res.ok || !json.questions || json.questions.length !== 7) {
      setQuestionLoadFailed(true);
      setQuestions(FALLBACK_QUESTIONS);
      setIndustryCtx(typeof json.context?.industry === "string" ? json.context.industry : "");
      setBusinessDescriptorCtx(
        typeof json.context?.business_descriptor === "string" ? json.context.business_descriptor : ""
      );
      setIntro({
        ...FALLBACK_INTRO,
        address: `${fullName} — thanks for being here.`,
      });
      setQuestionsReady(true);
      return true;
    }
    setQuestions(json.questions);
    setIndustryCtx(
      typeof json.context?.industry === "string"
        ? json.context.industry
        : typeof json.industry === "string"
          ? json.industry
          : ""
    );
    setBusinessDescriptorCtx(
      typeof json.context?.business_descriptor === "string"
        ? json.context.business_descriptor
        : typeof json.business_descriptor === "string"
          ? json.business_descriptor
          : ""
    );
    setIntro(
      json.intro && Array.isArray(json.intro.nuggets)
        ? {
            address: String(json.intro.address ?? `${fullName} — thanks for being here.`).trim(),
            nuggets: json.intro.nuggets.map((n) => String(n ?? "").trim()).filter(Boolean).slice(0, 3),
            frame: String(json.intro.frame ?? FALLBACK_INTRO.frame).trim(),
          }
        : { ...FALLBACK_INTRO, address: `${fullName} — thanks for being here.` }
    );
    setAnswers(Array(7).fill(""));
    setQIndex(0);
    setFadeKey((k) => k + 1);
    setQuestionVisible(true);
    setShowPriming(false);
    setPrimingText("");
    setQuestionsReady(true);
    return true;
  }, []);

  const runRateLimitAndStart = useCallback(async () => {
    setGateError(null);
    if (!firstName.trim()) {
      setGateError("Please enter your first name.");
      return;
    }
    if (!validEmail(email)) {
      setGateError("Enter a valid business email.");
      return;
    }

    const fullName = firstName.trim();
    mergeSession({ name: fullName, email: email.trim(), url: url.trim() });

    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      const { data: can, error } = await supabase.rpc("door3_can_start_discovery", {
        p_email: email.trim(),
      });
      if (error) {
        setGateError(error.message);
        return;
      }
      if (can === false) {
        setStage("rate_limited");
        return;
      }
    }
    setQuestionsReady(false);
    setWelcomeMinTimeMet(false);
    setQuestionLoadFailed(false);
    setIntro({
      ...FALLBACK_INTRO,
      address: `${fullName} — thanks for being here.`,
    });
    setStage("welcome");
    window.setTimeout(() => setWelcomeMinTimeMet(true), 4000);
    void fetchQuestionsInBackground(fullName, email.trim(), url.trim());
  }, [email, firstName, mergeSession, url, fetchQuestionsInBackground]);

  const goNextQuestion = useCallback(() => {
    const a = (answers[qIndex] ?? "").trim();
    if (a.length < 10 || isTransitioning) return;
    if (qIndex >= 6) {
      setStage("processing");
      return;
    }
    setIsTransitioning(true);
    setQuestionVisible(false);
    const nextIndex = qIndex + 1;
    const prime = PRIMING_TEXT_BY_NEXT_INDEX[nextIndex] ?? "";
    window.setTimeout(() => {
      if (!prime) {
        setQIndex(nextIndex);
        setFadeKey((k) => k + 1);
        setQuestionVisible(true);
        setIsTransitioning(false);
        return;
      }
      setPrimingText(prime);
      setShowPriming(true);
      window.setTimeout(() => {
        setShowPriming(false);
        window.setTimeout(() => {
          setPrimingText("");
          setQIndex(nextIndex);
          setFadeKey((k) => k + 1);
          setQuestionVisible(true);
          setIsTransitioning(false);
        }, 300);
      }, 2500);
    }, 300);
  }, [answers, qIndex, isTransitioning]);

  const goBack = useCallback(() => {
    if (qIndex <= 0) {
      setStage("gate");
      return;
    }
    setShowPriming(false);
    setPrimingText("");
    setQuestionVisible(true);
    setIsTransitioning(false);
    setFadeKey((k) => k + 1);
    setQIndex((i) => i - 1);
  }, [qIndex]);

  useEffect(() => {
    if (stage !== "processing" || questions.length !== 7) return;

    const payload = {
      name: firstName.trim(),
      email: email.trim(),
      url: url.trim() || null,
      industry: industryCtx || undefined,
      business_descriptor: businessDescriptorCtx || undefined,
      questions,
      responses: questions.map((q, i) => ({
        id: q.id,
        question: q.question,
        domain: q.domain,
        answer: (answers[i] ?? "").trim(),
      })),
    };

    let cancelled = false;
    const t = window.setTimeout(async () => {
      if (cancelled) return;
      const res = await invokeSupabaseEdgeFunction("door3-analyze", payload);
      if (cancelled) return;
      const json = (await res.json().catch(() => ({}))) as Door3Analysis & { error?: string };
      if (!res.ok) {
        setAnalysis({
          discovery_narrative:
            "We couldn't finish your personalized readout just now. Your answers were saved — try again in a moment or start a diagnostic instead.",
          primary_gap: "We need a moment to reconnect to analysis.",
          recommended_services: [],
          recommended_tier: "Essentials",
          next_step: "diagnostic",
          next_step_reason: "A quick diagnostic is the fastest way to get objective next steps.",
        });
        setStage("results");
        return;
      }
      setAnalysis(json);
      mergeSession({
        name: firstName.trim(),
        email: email.trim(),
        url: url.trim(),
        recommended_tier: json.recommended_tier ?? "",
        diagnostic_score: null,
      });
      setStage("results");
    }, 4000);

    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [stage, questions, firstName, email, url, industryCtx, businessDescriptorCtx, answers, mergeSession]);

  const onKeyDownArea = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      goNextQuestion();
    }
  };

  const continueFromWelcome = useCallback(() => {
    setStartedAt(Date.now());
    setStage("questions");
  }, []);

  const startJordan = useCallback(async () => {
    setVapiErr(null);
    if (!vapi) {
      setVapiErr("Voice isn’t configured (add VITE_VAPI_PUBLIC_KEY).");
      return;
    }
    try {
      await vapi.start(getEvaluationSpecialistAssistantId(), {
        firstMessage: `Hi — I'm Jordan at Socialutely. I read your discovery notes. What's on your mind?`,
      });
      setCallActive(true);
    } catch (e) {
      setVapiErr(appendVapiAssistantKeyHint(extractVapiErrorMessage(e)));
    }
  }, []);

  const endJordan = useCallback(() => {
    try {
      vapi?.stop();
    } finally {
      setCallActive(false);
    }
  }, []);

  return (
    <AnyDoorPageShell backHref="/" backLabel="← Home">
      {stage === "gate" && (
        <>
          <header className="mb-10 text-center sm:mb-14">
            <p className="anydoor-exp-eyebrow">D-3 · The Self-Discovery</p>
            <h1 className="mt-3 text-xl font-semibold leading-snug text-white sm:text-2xl" style={{ fontFamily: "var(--font-archivo)" }}>
              Seven questions — then we reflect what we heard
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-white/50">
              This isn&apos;t a lead form. It&apos;s a short discovery — open text, your words, no multiple choice.
            </p>
          </header>

          <section className="mx-auto w-full max-w-md space-y-4">
            <div>
              <label htmlFor="d3-first" className="anydoor-field-label--primary">
                First name
              </label>
              <input
                id="d3-first"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="anydoor-field-input"
                placeholder="Your first name"
                autoComplete="given-name"
              />
            </div>
            <div>
              <label htmlFor="d3-email" className="anydoor-field-label--primary">
                Business email
              </label>
              <input
                id="d3-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="anydoor-field-input"
                placeholder="you@company.com"
                autoComplete="email"
              />
            </div>
            <div>
              <label htmlFor="d3-url" className="anydoor-field-label--muted">
                Business URL <span className="text-white/35">(optional)</span>
              </label>
              <input
                id="d3-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="anydoor-field-input"
                placeholder="https://"
                autoComplete="url"
              />
            </div>
            {gateError && <p className="text-center text-sm text-red-400">{gateError}</p>}
            <button type="button" className="anydoor-btn-gold" onClick={() => void runRateLimitAndStart()}>
              Start my discovery →
            </button>
          </section>
        </>
      )}

      {stage === "rate_limited" && (
        <section className="mx-auto max-w-lg text-center">
          <p className="anydoor-exp-eyebrow">Already with us today</p>
          <h1
            className="mt-4 text-xl font-semibold text-white sm:text-2xl"
            style={{ fontFamily: "var(--font-archivo)" }}
          >
            You&apos;ve already completed a discovery session today.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-white/50">
            Your results are still fresh — check your email for your personalized recommendations.
          </p>
          <Link
            to="/doors/url-diagnostic"
            className="mt-8 inline-block rounded-lg bg-[#c9973a] px-6 py-3 text-center text-sm font-semibold uppercase tracking-wide text-[#07080d] transition-colors hover:bg-[#c9973a]/90"
          >
            Run a full URL diagnostic instead →
          </Link>
          <p className="mt-6">
            <Link to="/" className="anydoor-exp-navlink">
              ← Home
            </Link>
          </p>
        </section>
      )}

      {stage === "loading" && (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4" style={{ color: WHITE }}>
          <div
            className="h-10 w-10 animate-spin rounded-full border-2 border-transparent"
            style={{ borderTopColor: GOLD, borderRightColor: GOLD }}
          />
          <p style={{ color: DIM }}>Preparing your discovery questions...</p>
        </div>
      )}

      {stage === "welcome" && (
        <section className="mx-auto flex min-h-[62vh] w-full max-w-lg flex-col items-center justify-center text-center">
          <p className="anydoor-exp-eyebrow">D-3 · The Self-Discovery</p>
          <h1
            className="door3-fade-in mt-5 text-2xl font-light leading-snug"
            style={{ color: GOLD, fontFamily: "var(--font-cormorant), Georgia, serif", animationDelay: "0ms" }}
          >
            {intro?.address ?? `${firstName.trim() || "Friend"} — thanks for being here.`}
          </h1>
          <div className="door3-fade-in mt-6 w-full space-y-4" style={{ animationDelay: "600ms" }}>
            {(intro?.nuggets ?? FALLBACK_INTRO.nuggets).map((n, i, arr) => (
              <div key={`${i}-${n}`}>
                <p className="text-sm italic leading-relaxed text-white/70 sm:text-base">{n}</p>
                {i < arr.length - 1 ? <div className="mx-auto mt-4 h-px w-24 bg-white/10" /> : null}
              </div>
            ))}
          </div>
          <p className="door3-fade-in mt-6 text-sm text-white/40" style={{ animationDelay: "1200ms" }}>
            {intro?.frame ?? FALLBACK_INTRO.frame}
          </p>

          {!questionsReady ? (
            <div className="mt-7 flex items-center gap-3 text-sm text-[#c9973a]">
              <span className="anydoor-loading-pulse-dot h-2.5 w-2.5 rounded-full bg-[#c9973a]" />
              <span>Preparing your questions...</span>
            </div>
          ) : (
            <p className="mt-7 text-sm text-white/45">Questions ready.</p>
          )}

          {(questionsReady && welcomeMinTimeMet) || (questionLoadFailed && welcomeMinTimeMet) ? (
            <button type="button" className="anydoor-btn-gold mt-6" onClick={continueFromWelcome}>
              {questionLoadFailed ? "Let's begin →" : "I'm ready →"}
            </button>
          ) : null}
        </section>
      )}

      {stage === "questions" && currentQ && (
        <div className="mx-auto max-w-2xl">
          <div className="mb-8">
            <div className="mb-2 flex justify-between text-xs font-mono" style={{ color: DIM }}>
              <span>Progress</span>
              <span>{progressPct}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.08]">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${((qIndex + 1) / totalSteps) * 100}%`, backgroundColor: GOLD }}
              />
            </div>
          </div>

          <div
            key={fadeKey}
            className={`mb-8 text-center transition-opacity duration-300 ${questionVisible ? "opacity-100" : "opacity-0"}`}
          >
            <p className="anydoor-exp-eyebrow">{currentQ.domain}</p>
            {!showPriming ? (
              <>
                <h2
                  className="door3-fade-in mt-6 font-light leading-snug text-white sm:text-3xl"
                  style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}
                >
                  {currentQ.question}
                </h2>
                <p className="mt-2 font-mono text-[10px] text-white/35">{currentQ.id}</p>
              </>
            ) : (
              <p
                className={`mx-auto mt-10 max-w-2xl text-base italic transition-opacity duration-500 ${showPriming ? "opacity-100" : "opacity-0"}`}
                style={{ color: "rgba(201, 151, 58, 0.7)" }}
              >
                {primingText}
              </p>
            )}
          </div>

          <div
            key={`${fadeKey}-fields`}
            className={`space-y-3 transition-opacity duration-300 ${showPriming ? "pointer-events-none opacity-0" : "opacity-100"}`}
          >
            <label htmlFor="d3-answer" className="sr-only">
              Your answer
            </label>
            <textarea
              id="d3-answer"
              rows={5}
              value={currentAnswer}
              onChange={(e) => {
                const v = e.target.value;
                setAnswers((prev) => {
                  const next = [...prev];
                  next[qIndex] = v;
                  return next;
                });
              }}
              onKeyDown={onKeyDownArea}
              placeholder={currentQ.placeholder}
              className="anydoor-field-input min-h-[120px] resize-y py-3"
            />
            <p className="text-xs text-white/40">
              {currentAnswer.trim().length < 10
                ? `${10 - Math.min(currentAnswer.trim().length, 10)} more characters to continue`
                : "Cmd/Ctrl + Enter to continue"}
            </p>
            <button
              type="button"
              className="anydoor-btn-gold"
              disabled={currentAnswer.trim().length < 10 || isTransitioning}
              onClick={() => goNextQuestion()}
            >
              {qIndex >= 6 ? "Finish →" : "Next →"}
            </button>
          </div>

          <div className="mt-10 flex flex-wrap justify-center gap-3 sm:justify-start">
            <button type="button" className="anydoor-btn-outline" onClick={goBack}>
              Back
            </button>
          </div>
        </div>
      )}

      {stage === "processing" && (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center" style={{ color: WHITE }}>
          <p className="text-base font-medium text-white/90">Reading between the lines...</p>
          <p className="max-w-sm text-sm" style={{ color: DIM }}>
            Taking a moment to reflect on what you shared.
          </p>
        </div>
      )}

      {stage === "results" && analysis && (
        <div className="mx-auto max-w-3xl space-y-10 pb-12">
          <header className="text-center">
            <h1
              className="text-2xl font-light text-white sm:text-3xl"
              style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}
            >
              Here&apos;s what we heard.
            </h1>
            <p className="mt-3 text-sm" style={{ color: DIM }}>
              {firstName.trim()}, this took about {minutesElapsed} minute{minutesElapsed === 1 ? "" : "s"}. Here&apos;s
              what stood out.
            </p>
          </header>

          <article className="anydoor-surface-card text-[15px] leading-[1.7] text-white/90 sm:text-base" style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}>
            {analysis.discovery_narrative.split("\n").map((para, i) => (
              <p key={i} className={i > 0 ? "mt-4" : ""}>
                {para}
              </p>
            ))}
          </article>

          <div>
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.3em]" style={{ color: GOLD }}>
              The core tension
            </p>
            <p className="mt-3 text-lg font-medium leading-relaxed text-white">{analysis.primary_gap}</p>
          </div>

          <div>
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.3em]" style={{ color: GOLD }}>
              Where we&apos;d focus first
            </p>
            <ul className="mt-4 grid gap-3">
              {analysis.recommended_services.map((s) => (
                <li key={s.service_id} className="anydoor-surface-card p-4 text-left text-sm">
                  <span className="font-semibold text-white">{door3ServiceName(s.service_id)}</span>
                  <span style={{ color: DIM }}> — {s.reason}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-white/40">Pricing isn&apos;t shown here — it unlocks when you&apos;re ready on the next step.</p>
          </div>

          <div className="anydoor-surface-card text-center">
            <p className="text-sm" style={{ color: DIM }}>
              Based on what you shared...
            </p>
            <p className="mt-2 font-medium text-white">{nextStepLabel(analysis.next_step as NextStepKey).title}</p>
            <p className="mt-1 text-sm" style={{ color: DIM }}>
              {nextStepLabel(analysis.next_step as NextStepKey).body}
            </p>
            <p className="mt-2 text-xs italic" style={{ color: DIM }}>
              {analysis.next_step_reason}
            </p>
            <Link
              to={nextStepHref(analysis.next_step as NextStepKey)}
              className="mt-6 inline-block rounded-lg bg-[#c9973a] px-6 py-3 text-center text-sm font-semibold uppercase tracking-wide text-[#07080d] transition-colors hover:bg-[#c9973a]/90"
            >
              Continue →
            </Link>
          </div>

          <div className="anydoor-surface-card">
            <p className="text-center text-sm font-medium text-white">Talk to someone about this →</p>
            <p className="mt-1 text-center text-xs" style={{ color: DIM }}>
              Tap to talk with Jordan (Evaluation Specialist).
            </p>
            {vapiErr && <p className="mt-3 text-center text-sm text-amber-400">{vapiErr}</p>}
            <div className="mt-4 flex justify-center gap-3">
              {!callActive ? (
                <button type="button" className="anydoor-btn-outline inline-flex items-center" onClick={() => void startJordan()}>
                  <Mic className="mr-2 h-4 w-4" />
                  Tap to Talk
                </button>
              ) : (
                <button
                  type="button"
                  className="rounded-lg border border-red-500/40 bg-transparent px-5 py-2.5 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/10"
                  onClick={endJordan}
                >
                  <PhoneOff className="mr-2 inline h-4 w-4" />
                  End call
                </button>
              )}
            </div>
          </div>

          <p className="text-center">
            <Link to="/" className="anydoor-exp-navlink">
              ← Home
            </Link>
          </p>
        </div>
      )}
    </AnyDoorPageShell>
  );
}
