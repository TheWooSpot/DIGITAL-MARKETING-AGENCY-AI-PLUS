import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getSupabaseBrowserClient } from "@/anydoor/lib/supabaseBrowserClient";
import { AnyDoorEntryScreen, AnyDoorPageShell } from "@/components/anydoor/AnyDoorExperience";
import { useSession } from "@/context/SessionContext";
import { invokeSupabaseEdgeFunction } from "@/lib/door3/invokeEdge";
import { door3ServiceName } from "@/lib/door3/serviceNames";
import type { DiscoveryQuestion, Door3Analysis } from "@/lib/door3/types";
import { getEvaluationSpecialistAssistantId } from "@/anydoor/useDiagnosticVapiCall";
import { vapi } from "@/lib/vapiClient";
import { appendVapiAssistantKeyHint, extractVapiErrorMessage } from "@/lib/vapiErrors";
import { acquireVapiTapLock, releaseVapiTapLockEarly } from "@/lib/vapiTapLock";
import { Mic, PhoneOff } from "lucide-react";

/** Aligned with AiIqAssessmentPage / AnyDoor tokens */
const GOLD = "#c9993a";
const DIM = "rgba(232,238,245,0.55)";

type Stage = "gate" | "welcome" | "questions" | "processing" | "results" | "rate_limited";
interface IntroContent {
  address: string;
  nuggets: string[];
  frame: string;
}
interface Door3BusinessContext {
  industry: string;
  business_type: string;
  primary_audience: string;
  business_name: string;
  detected_gaps: string[];
  recommended_tier?: string | null;
  source?: string;
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
  {
    id: "Q1",
    domain: "situation",
    question: "Walk me through how new customers typically find you right now.",
    placeholder: "Describe your current reality...",
    encouragement: "The clearest picture starts with the simplest truth.",
  },
  {
    id: "Q2",
    domain: "problem",
    question: "What part of growth feels hardest to solve consistently today?",
    placeholder: "Name the hardest part...",
    encouragement: "Naming it is the first act of solving it.",
  },
  {
    id: "Q3",
    domain: "consequence",
    question: "If nothing changes in the next year, what does that cost you?",
    placeholder: "What does staying the same mean?",
    encouragement: "The real cost is rarely just money.",
  },
  {
    id: "Q4",
    domain: "goal",
    question: "If 18 months went remarkably well, what would look meaningfully different?",
    placeholder: "Describe your best-case future...",
    encouragement: "Say it out loud — it changes what comes next.",
  },
  {
    id: "Q5",
    domain: "solution",
    question: "What becomes possible for you when this finally works as it should?",
    placeholder: "What unlocks for you?",
    encouragement: "Most answers are already inside the question.",
  },
  {
    id: "Q6",
    domain: "priority",
    question: "What single issue in the next 90 days would make everything else easier?",
    placeholder: "Pick the one thing...",
    encouragement: "What matters most rarely needs defending.",
  },
  {
    id: "Q7",
    domain: "context",
    question: "What have you already tried, and what blocked it from working?",
    placeholder: "Share what you've already tested...",
    encouragement: "Everything you've tried has taught you something.",
  },
];

const FALLBACK_INTERPRETATIONS = [
  "Your snapshot of how things work today frames everything that follows.",
  "You named a friction point that often hides in plain sight until someone says it aloud.",
  "The tradeoff you described is the kind of detail that changes what “urgent” means.",
  "The future you sketched gives a clear test for whether tactics actually match intent.",
  "What you said about possibility hints at where leverage really lives for you.",
  "Your 90-day priority reads like a decision, not a wish list — that matters.",
  "What you’ve already tried is data; it tells us what to protect and what to rethink.",
];

function validEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

function domainLabel(domain: string): string {
  return String(domain || "")
    .trim()
    .toUpperCase()
    .replace(/-/g, " ");
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
  const [questionVisible, setQuestionVisible] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [intro, setIntro] = useState<IntroContent | null>(null);
  const [questionsReady, setQuestionsReady] = useState(false);
  const [questionLoadFailed, setQuestionLoadFailed] = useState(false);
  const [businessContext, setBusinessContext] = useState<Door3BusinessContext | null>(null);
  const [generatedQuestionTexts, setGeneratedQuestionTexts] = useState<string[]>([]);

  const [analysis, setAnalysis] = useState<Door3Analysis | null>(null);
  const [vapiErr, setVapiErr] = useState<string | null>(null);
  const [callActive, setCallActive] = useState(false);
  const [jordanStartLocked, setJordanStartLocked] = useState(false);

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
      questions_generated?: string[];
      context?: {
        industry?: string;
        business_type?: string;
        primary_audience?: string;
        business_name?: string;
        detected_gaps?: string[];
        recommended_tier?: string | null;
        source?: string;
      };
      intro?: IntroContent;
      industry?: string;
      business_descriptor?: string;
      error?: string;
    };
    const normalizeQs = (raw: DiscoveryQuestion[]): DiscoveryQuestion[] =>
      raw.map((q, i) => ({
        ...q,
        encouragement: q.encouragement?.trim() || FALLBACK_QUESTIONS[i]?.encouragement,
      }));

    if (!res.ok || !json.questions || json.questions.length !== 7) {
      setQuestionLoadFailed(true);
      setQuestions(FALLBACK_QUESTIONS);
      setGeneratedQuestionTexts(FALLBACK_QUESTIONS.map((q) => q.question));
      setIndustryCtx(typeof json.context?.industry === "string" ? json.context.industry : "");
      setBusinessDescriptorCtx(
        typeof json.context?.business_type === "string" ? json.context.business_type : ""
      );
      setBusinessContext(
        typeof json.context?.industry === "string"
          ? {
              industry: json.context.industry,
              business_type:
                typeof json.context.business_type === "string" ? json.context.business_type : "growing business",
              primary_audience:
                typeof json.context.primary_audience === "string" ? json.context.primary_audience : "Unknown",
              business_name: typeof json.context.business_name === "string" ? json.context.business_name : fullName,
              detected_gaps: Array.isArray(json.context.detected_gaps) ? json.context.detected_gaps : [],
              recommended_tier: json.context.recommended_tier ?? null,
              source: typeof json.context.source === "string" ? json.context.source : "fallback",
            }
          : null
      );
      setIntro({
        ...FALLBACK_INTRO,
        address: fullName ? `${fullName} — thanks for being here.` : "Thanks for being here.",
      });
      setQuestionsReady(true);
      return true;
    }
    setQuestions(normalizeQs(json.questions));
    setGeneratedQuestionTexts(
      Array.isArray(json.questions_generated) && json.questions_generated.length === 7
        ? json.questions_generated.map((q) => String(q))
        : json.questions.map((q) => q.question)
    );
    setIndustryCtx(
      typeof json.context?.industry === "string"
        ? json.context.industry
        : typeof json.industry === "string"
          ? json.industry
          : ""
    );
    setBusinessDescriptorCtx(
      typeof json.context?.business_type === "string"
        ? json.context.business_type
        : typeof json.business_descriptor === "string"
          ? json.business_descriptor
          : ""
    );
    setBusinessContext(
      json.context
        ? {
            industry: typeof json.context.industry === "string" ? json.context.industry : "",
            business_type:
              typeof json.context.business_type === "string"
                ? json.context.business_type
                : typeof json.business_descriptor === "string"
                  ? json.business_descriptor
                  : "",
            primary_audience:
              typeof json.context.primary_audience === "string" ? json.context.primary_audience : "Unknown",
            business_name: typeof json.context.business_name === "string" ? json.context.business_name : fullName,
            detected_gaps: Array.isArray(json.context.detected_gaps) ? json.context.detected_gaps : [],
            recommended_tier: json.context.recommended_tier ?? null,
            source: typeof json.context.source === "string" ? json.context.source : undefined,
          }
        : null
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
    setQuestionLoadFailed(false);
    setIntro({
      ...FALLBACK_INTRO,
      address: fullName ? `${fullName} — thanks for being here.` : "Thanks for being here.",
    });
    setStage("welcome");
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
    window.setTimeout(() => {
      setQIndex((i) => i + 1);
      setFadeKey((k) => k + 1);
      setQuestionVisible(true);
      setIsTransitioning(false);
    }, 280);
  }, [answers, qIndex, isTransitioning]);

  const goBack = useCallback(() => {
    if (qIndex <= 0) {
      setStage("gate");
      return;
    }
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
      questions_generated: generatedQuestionTexts,
      business_context:
        businessContext ??
        {
          industry: industryCtx || "Unknown",
          business_type: businessDescriptorCtx || "Unknown",
          primary_audience: "Unknown",
          business_name: firstName.trim(),
          detected_gaps: [],
          source: "fallback",
        },
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
  }, [stage, questions, firstName, email, url, industryCtx, businessDescriptorCtx, answers, mergeSession, generatedQuestionTexts, businessContext]);

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
    if (!analysis) return;
    if (!acquireVapiTapLock()) return;
    setJordanStartLocked(true);
    window.setTimeout(() => setJordanStartLocked(false), 3000);
    const gaps =
      analysis.top_gaps && analysis.top_gaps.length > 0
        ? analysis.top_gaps
        : [analysis.primary_gap].filter(Boolean);
    const variableValues: Record<string, string> = {
      business_name: businessContext?.business_name ?? firstName.trim(),
      industry: businessContext?.industry ?? industryCtx ?? "Unknown",
      top_gaps: JSON.stringify(gaps.slice(0, 3)),
      recommended_services: JSON.stringify(
        (analysis.recommended_services ?? []).map((s) => ({
          name: door3ServiceName(s.service_id),
          what_it_is: s.what_it_is ?? "",
          benefit_for_you: s.benefit_for_you ?? s.reason ?? "",
        }))
      ),
      source: "door3-self-discovery",
      door3_summary: analysis.core_tension ?? analysis.primary_gap ?? "",
    };
    try {
      await vapi.start(getEvaluationSpecialistAssistantId(), {
        maxDurationSeconds: 420,
        variableValues,
      });
      setCallActive(true);
    } catch (e) {
      setJordanStartLocked(false);
      releaseVapiTapLockEarly();
      setVapiErr(appendVapiAssistantKeyHint(extractVapiErrorMessage(e)));
    }
  }, [analysis, businessContext, firstName, industryCtx]);

  const endJordan = useCallback(() => {
    try {
      vapi?.stop();
    } finally {
      setCallActive(false);
    }
  }, []);

  return (
    <div className="anydoor-door-page min-h-screen">
      <AnyDoorPageShell backHref="/" backLabel="← Home" narrow={false}>
      {stage === "gate" && (
        <div className="mx-auto w-full max-w-[580px]">
          <AnyDoorEntryScreen
            eyebrow="ANYDOOR ENGINE · D-3 · THE SELF-DISCOVERY"
            heading="Seven Questions That Surface Something True"
            subtext1={"You sense something isn't working but can't quite name it."}
            subtext2="Honest questions that surface what your business actually needs right now."
          />

          <section className="mx-auto w-full space-y-4">
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
        </div>
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

      {stage === "welcome" && (
        <section
          className="door3-splash mx-auto flex w-full flex-col items-center px-5 pb-16 text-center"
          style={{ paddingTop: "80px", gap: "32px", maxWidth: "820px" }}
        >
          {/* Zone 1 — label + name headline */}
          <p
            className="text-[11px] font-medium uppercase tracking-[0.28em]"
            style={{ color: GOLD, fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}
          >
            D-3 · THE SELF-DISCOVERY
          </p>
          <h1
            className="text-[clamp(2rem,5vw,2.625rem)] font-light leading-tight"
            style={{ color: GOLD, fontFamily: "var(--font-dm-serif-display), var(--font-cormorant), Georgia, serif" }}
          >
            {intro?.address ?? `${firstName.trim() || "Friend"} — thanks for being here.`}
          </h1>

          {/* Zone 2 — dual glow boxes */}
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              gap: "20px",
              margin: "0 auto",
              width: "100%",
            }}
            className="welcome-boxes"
          >
            <div
              style={{
                flex: 1,
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(201, 153, 58, 0.3)",
                boxShadow: "0 0 20px rgba(201, 153, 58, 0.15), inset 0 0 40px rgba(201, 153, 58, 0.03)",
                borderRadius: "12px",
                padding: "28px 32px",
                fontStyle: "italic",
                fontSize: "15px",
                lineHeight: 1.75,
                color: "rgba(255, 255, 255, 0.85)",
                textAlign: "left",
              }}
            >
              {(intro?.nuggets ?? FALLBACK_INTRO.nuggets)[0]}
            </div>
            <div
              style={{
                flex: 1,
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(201, 153, 58, 0.3)",
                boxShadow: "0 0 20px rgba(201, 153, 58, 0.15), inset 0 0 40px rgba(201, 153, 58, 0.03)",
                borderRadius: "12px",
                padding: "28px 32px",
                fontStyle: "italic",
                fontSize: "15px",
                lineHeight: 1.75,
                color: "rgba(255, 255, 255, 0.85)",
                textAlign: "left",
              }}
            >
              Honest answers beat polished ones. Clarity here makes every next step easier.
            </div>
          </div>

          {/* Zone 3 — closing promise line */}
          <p
            style={{
              fontSize: "13px",
              color: "rgba(255, 255, 255, 0.4)",
              textAlign: "center",
              letterSpacing: "0.04em",
              marginTop: "4px",
              marginBottom: "32px",
              fontStyle: "normal",
              fontWeight: 300,
              fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
            }}
          >
            Seven questions. Open text. We&apos;ll reflect back exactly what we heard — nothing more.
          </p>

          {/* Zone 4 — status + CTA button */}
          {questionsReady ? (
            <p className="door3-status-ready text-sm" style={{ color: GOLD }}>
              Questions ready.
            </p>
          ) : (
            <span className="invisible text-sm" aria-hidden>
              &nbsp;
            </span>
          )}
          <button
            type="button"
            disabled={!questionsReady}
            className="door3-ready-cta w-full max-w-[580px] rounded-lg px-6 py-3.5 text-sm font-semibold uppercase tracking-widest transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
            style={{ backgroundColor: GOLD, color: "#07090f", fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}
            onClick={continueFromWelcome}
          >
            {questionLoadFailed ? "Let's begin →" : "I'm ready →"}
          </button>
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
            <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-white/40">{currentQ.domain}</p>
            {currentQ.encouragement ? (
              <p
                className="door3-encouragement mx-auto mt-5 max-w-2xl text-sm italic leading-relaxed"
                style={{ color: GOLD, fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}
              >
                {currentQ.encouragement}
              </p>
            ) : null}
            <h2
              className="door3-q-text mt-5 font-light leading-snug text-white sm:text-3xl"
              style={{ fontFamily: "var(--font-dm-serif-display), var(--font-cormorant), Georgia, serif" }}
            >
              {currentQ.question}
            </h2>
          </div>

          <div key={`${fadeKey}-fields`} className="space-y-3 transition-opacity duration-300">
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
        <div className="flex min-h-[50vh] flex-col items-center justify-center px-6 text-center" aria-live="polite">
          <p className="text-sm text-white/35" style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>
            One moment.
          </p>
        </div>
      )}

      {stage === "results" && analysis && (
        <div className="mx-auto max-w-3xl space-y-12 pb-16">
          <header className="text-center">
            <h1
              className="text-2xl font-light text-white sm:text-3xl"
              style={{ fontFamily: "var(--font-dm-serif-display), var(--font-cormorant), Georgia, serif" }}
            >
              Here&apos;s what we heard.
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-white/55" style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>
              {firstName.trim()}, this took about {minutesElapsed} minute{minutesElapsed === 1 ? "" : "s"}. Here&apos;s
              what stood out.
            </p>
          </header>

          <section className="space-y-4">
            <h2 className="sr-only">Per-question reflections</h2>
            <ul className="grid gap-4">
              {(analysis.per_question_reflections && analysis.per_question_reflections.length > 0
                ? analysis.per_question_reflections
                : questions.map((q, i) => ({
                    domain: q.domain,
                    question: q.question,
                    interpretation: FALLBACK_INTERPRETATIONS[i] ?? FALLBACK_INTERPRETATIONS[0],
                  }))
              ).map((row, i) => (
                <li
                  key={`${row.domain}-${i}`}
                  className="anydoor-surface-card rounded-xl border border-white/[0.08] p-5 text-left sm:p-6"
                >
                  <p
                    className="text-[10px] font-semibold uppercase tracking-[0.28em]"
                    style={{ color: GOLD, fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}
                  >
                    {domainLabel(row.domain)}
                  </p>
                  <p className="mt-2 text-[13px] leading-snug text-white/45" style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>
                    {row.question}
                  </p>
                  <p
                    className="mt-4 text-[15px] leading-relaxed text-white/90"
                    style={{ fontFamily: "var(--font-dm-serif-display), var(--font-cormorant), Georgia, serif" }}
                  >
                    {row.interpretation}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.28em]"
              style={{ color: GOLD, fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}
            >
              The core tension
            </p>
            <p className="mt-4 text-lg font-semibold leading-snug text-white" style={{ fontFamily: "var(--font-dm-serif-display), var(--font-cormorant), Georgia, serif" }}>
              {analysis.core_tension ?? analysis.primary_gap}
            </p>
          </section>

          <section>
            <h2
              className="text-lg font-light text-white sm:text-xl"
              style={{ fontFamily: "var(--font-dm-serif-display), var(--font-cormorant), Georgia, serif" }}
            >
              Where we&apos;d focus first
            </h2>
            <p className="mt-2 max-w-xl text-sm text-white/50" style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>
              Not a menu. A starting point built around what you just shared.
            </p>
            <ul className="mt-6 grid gap-4">
              {analysis.recommended_services.map((s) => (
                <li key={s.service_id} className="anydoor-surface-card rounded-xl border border-white/[0.08] p-5 text-left sm:p-6">
                  <p className="font-semibold text-white" style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>
                    {door3ServiceName(s.service_id)}
                  </p>
                  {s.what_it_is ? (
                    <p className="mt-2 text-sm leading-relaxed text-white/75" style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>
                      {s.what_it_is}
                    </p>
                  ) : null}
                  <p className="mt-3 text-sm leading-relaxed text-white/60" style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>
                    {s.benefit_for_you ?? s.reason}
                  </p>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-white/35">Pricing isn&apos;t shown here — it unlocks when you&apos;re ready on the next step.</p>
          </section>

          {analysis.grace_note ? (
            <article
              className="rounded-xl border border-white/[0.08] bg-[#07090f]/80 p-6 text-[15px] leading-relaxed text-white/85 sm:p-8"
              style={{ fontFamily: "var(--font-dm-serif-display), var(--font-cormorant), Georgia, serif" }}
            >
              {analysis.grace_note}
            </article>
          ) : null}

          <section className="space-y-6">
            <h2 className="sr-only">Next steps</h2>
            <Link
              to="/diagnostic"
              className="door3-results-cta block w-full rounded-lg px-6 py-3.5 text-center text-sm font-semibold uppercase tracking-widest transition-colors"
              style={{ backgroundColor: GOLD, color: "#07090f", fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}
            >
              Run your free URL diagnostic
            </Link>

            <div className="anydoor-surface-card rounded-xl border border-white/[0.08] p-6 text-center sm:p-8">
              <p className="text-sm font-medium text-white" style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>
                Talk to Jordan
              </p>
              <p className="mt-1 text-xs text-white/45">Tap to Talk — Evaluation Specialist</p>
              {vapiErr && <p className="mt-3 text-sm text-amber-400">{vapiErr}</p>}
              <div className="mt-5 flex justify-center">
                {!callActive ? (
                  <button
                    type="button"
                    disabled={jordanStartLocked}
                    className="anydoor-btn-outline inline-flex items-center disabled:pointer-events-none disabled:opacity-50"
                    onClick={() => void startJordan()}
                  >
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
          </section>

          <p className="text-center">
            <Link to="/" className="anydoor-exp-navlink">
              ← Home
            </Link>
          </p>
        </div>
      )}
    </AnyDoorPageShell>
    </div>
  );
}
