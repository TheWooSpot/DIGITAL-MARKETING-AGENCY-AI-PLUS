import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getSupabaseBrowserClient } from "@/anydoor/lib/supabaseBrowserClient";
import { useSession } from "@/context/SessionContext";
import { invokeSupabaseEdgeFunction } from "@/lib/door3/invokeEdge";
import { door3ServiceName } from "@/lib/door3/serviceNames";
import type { DiscoveryQuestion, Door3Analysis, NextStepKey } from "@/lib/door3/types";
import { getEvaluationSpecialistAssistantId } from "@/anydoor/useDiagnosticVapiCall";
import { vapi } from "@/lib/vapiClient";
import { appendVapiAssistantKeyHint, extractVapiErrorMessage } from "@/lib/vapiErrors";
import { Mic, PhoneOff } from "lucide-react";

const BG = "#07080d";
const CARD = "#0e1829";
const GOLD = "#c9a227";
const BORDER = "rgba(201,162,39,0.22)";
const WHITE = "#e8eef5";
const DIM = "rgba(232,238,245,0.55)";

type Stage = "gate" | "loading" | "questions" | "processing" | "results" | "rate_limited";

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

  const [analysis, setAnalysis] = useState<Door3Analysis | null>(null);
  const [vapiErr, setVapiErr] = useState<string | null>(null);
  const [callActive, setCallActive] = useState(false);

  const currentQ = questions[qIndex];
  const progress = questions.length > 0 ? ((qIndex + 1) / 7) * 100 : 0;
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
    setStage("loading");
    const res = await invokeSupabaseEdgeFunction("door3-questions", {
      name: fullName,
      email: email.trim(),
      url: url.trim() || undefined,
    });
    const json = (await res.json().catch(() => ({}))) as {
      questions?: DiscoveryQuestion[];
      industry?: string;
      business_descriptor?: string;
      error?: string;
    };
    if (!res.ok) {
      setGateError(json.error || "Could not prepare questions. Try again shortly.");
      setStage("gate");
      return;
    }
    if (!json.questions || json.questions.length !== 7) {
      setGateError("Unexpected response from discovery service.");
      setStage("gate");
      return;
    }
    setQuestions(json.questions);
    setIndustryCtx(typeof json.industry === "string" ? json.industry : "");
    setBusinessDescriptorCtx(typeof json.business_descriptor === "string" ? json.business_descriptor : "");
    setAnswers(Array(7).fill(""));
    setQIndex(0);
    setStartedAt(Date.now());
    setFadeKey((k) => k + 1);
    setStage("questions");
  }, [email, firstName, mergeSession, url]);

  const goNextQuestion = useCallback(() => {
    const a = (answers[qIndex] ?? "").trim();
    if (a.length < 10) return;
    if (qIndex >= 6) {
      setStage("processing");
      return;
    }
    setFadeKey((k) => k + 1);
    setTimeout(() => setQIndex((i) => i + 1), 300);
  }, [answers, qIndex]);

  const goBack = useCallback(() => {
    if (qIndex <= 0) {
      setStage("gate");
      return;
    }
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
    <div
      className="relative z-10 min-h-screen selection:bg-[#c9a227]/30 selection:text-white"
      style={{ backgroundColor: BG, color: WHITE, fontFamily: "'Archivo', system-ui, sans-serif" }}
    >
      <div className="pointer-events-none fixed inset-0 z-0 platform-grain opacity-70" aria-hidden />

      <header
        className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-b px-4 py-4 sm:px-8"
        style={{ borderBottomWidth: 1, borderBottomColor: GOLD }}
      >
        <Link to="/" className="text-sm font-semibold" style={{ color: GOLD }}>
          ← Home
        </Link>
        <span className="text-xs font-mono uppercase tracking-[0.2em]" style={{ color: DIM }}>
          AnyDoor Engine · Door 3
        </span>
      </header>

      <main className="relative z-10 mx-auto max-w-2xl px-4 pb-24 pt-10 sm:px-6">
        {stage === "gate" && (
          <section className="mx-auto max-w-md">
            <p className="font-mono text-[10px] uppercase tracking-[0.35em]" style={{ color: GOLD }}>
              The Self-Discovery
            </p>
            <h1
              className="mt-3 text-3xl font-light leading-tight sm:text-4xl"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
            >
              Seven questions. One truth.
            </h1>
            <p className="mt-3 text-sm leading-relaxed" style={{ color: DIM }}>
              This isn&apos;t a lead form — it&apos;s a short discovery. We&apos;ll ask only seven questions, then reflect
              what we heard.
            </p>

            <div
              className="mt-10 space-y-4 rounded-xl border p-6 sm:p-8"
              style={{ backgroundColor: CARD, borderColor: BORDER }}
            >
              <div>
                <Label htmlFor="d3-first" className="text-white">
                  First name
                </Label>
                <Input
                  id="d3-first"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="mt-1.5 border-white/10 bg-black/25 text-white"
                  autoComplete="given-name"
                />
              </div>
              <div>
                <Label htmlFor="d3-email" className="text-white">
                  Business email
                </Label>
                <Input
                  id="d3-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1.5 border-white/10 bg-black/25 text-white"
                  autoComplete="email"
                />
              </div>
              <div>
                <Label htmlFor="d3-url" className="text-white">
                  Business URL <span style={{ color: DIM }}>(optional)</span>
                </Label>
                <Input
                  id="d3-url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="mt-1.5 border-white/10 bg-black/25 text-white"
                  placeholder="https://"
                />
              </div>
              {gateError && <p className="text-sm text-amber-400">{gateError}</p>}
              <Button
                type="button"
                className="w-full font-semibold sm:w-auto"
                style={{ backgroundColor: GOLD, color: BG }}
                onClick={() => void runRateLimitAndStart()}
              >
                Start my discovery →
              </Button>
            </div>
          </section>
        )}

        {stage === "rate_limited" && (
          <section className="mx-auto max-w-lg text-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.35em]" style={{ color: GOLD }}>
              Already with us today
            </p>
            <h1 className="mt-4 text-2xl font-semibold" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
              You&apos;ve already completed a discovery session today.
            </h1>
            <p className="mt-4 text-sm leading-relaxed" style={{ color: DIM }}>
              Your results are still fresh — check your email for your personalized recommendations.
            </p>
            <Button asChild className="mt-8 font-semibold" style={{ backgroundColor: GOLD, color: BG }}>
              <Link to="/doors/url-diagnostic">Run a full URL diagnostic instead →</Link>
            </Button>
            <p className="mt-6">
              <Link to="/" className="text-sm underline" style={{ color: DIM }}>
                ← Home
              </Link>
            </p>
          </section>
        )}

        {stage === "loading" && (
          <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
            <div
              className="h-10 w-10 animate-spin rounded-full border-2 border-transparent"
              style={{ borderTopColor: GOLD, borderRightColor: GOLD }}
            />
            <p className="text-sm" style={{ color: DIM }}>
              Preparing your discovery questions...
            </p>
          </div>
        )}

        {stage === "questions" && currentQ && (
          <section className="door3-question-shell min-h-[60vh]">
            <div className="mb-6 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={goBack}
                className="text-xs underline decoration-white/20 hover:decoration-white/50"
                style={{ color: DIM }}
              >
                ← Back
              </button>
              <span className="font-mono text-[10px] uppercase tracking-[0.25em]" style={{ color: GOLD }}>
                Question {qIndex + 1} of 7
              </span>
            </div>
            <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="door3-progress-bar h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%`, backgroundColor: GOLD }}
              />
            </div>

            <div key={fadeKey} className="door3-fade-in mt-10 flex flex-col items-center text-center">
              <p className="font-mono text-[9px] uppercase tracking-[0.2em]" style={{ color: DIM }}>
                {currentQ.domain}
              </p>
              <h2
                className="mt-6 max-w-xl text-2xl font-light leading-snug sm:text-3xl"
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
              >
                {currentQ.question}
              </h2>
              <Textarea
                className="door3-textarea mt-10 min-h-[120px] w-full max-w-xl border-white/15 bg-black/30 text-base text-white placeholder:text-white/35"
                placeholder={currentQ.placeholder}
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
              />
              <p className="mt-2 w-full max-w-xl text-left text-[11px]" style={{ color: DIM }}>
                {currentAnswer.trim().length < 10
                  ? `${10 - Math.min(currentAnswer.trim().length, 10)} more characters to continue`
                  : "Cmd/Ctrl + Enter to continue"}
              </p>
              <Button
                type="button"
                className="mt-8 font-semibold"
                style={{ backgroundColor: GOLD, color: BG }}
                disabled={currentAnswer.trim().length < 10}
                onClick={() => goNextQuestion()}
              >
                {qIndex >= 6 ? "Finish →" : "Next →"}
              </Button>
            </div>
          </section>
        )}

        {stage === "processing" && (
          <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
            <p className="text-lg font-light" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
              Reading between the lines...
            </p>
            <p className="max-w-sm text-sm" style={{ color: DIM }}>
              Taking a moment to reflect on what you shared.
            </p>
          </div>
        )}

        {stage === "results" && analysis && (
          <section className="space-y-10 pb-12">
            <header className="text-center">
              <h1 className="text-3xl font-light sm:text-4xl" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
                Here&apos;s what we heard.
              </h1>
              <p className="mt-3 text-sm" style={{ color: DIM }}>
                {firstName.trim()}, this took about {minutesElapsed} minute{minutesElapsed === 1 ? "" : "s"}. Here&apos;s
                what stood out.
              </p>
            </header>

            <article
              className="rounded-2xl border px-6 py-8 sm:px-10 sm:py-10"
              style={{
                borderColor: BORDER,
                backgroundColor: CARD,
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: "1.15rem",
                lineHeight: 1.75,
              }}
            >
              {analysis.discovery_narrative.split("\n").map((para, i) => (
                <p key={i} className={i > 0 ? "mt-4" : ""}>
                  {para}
                </p>
              ))}
            </article>

            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: GOLD }}>
                The core tension
              </p>
              <p className="mt-3 text-lg font-medium leading-relaxed text-white/95">{analysis.primary_gap}</p>
            </div>

            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: GOLD }}>
                Where we&apos;d focus first
              </p>
              <ul className="mt-4 grid gap-3 sm:grid-cols-1">
                {analysis.recommended_services.map((s) => (
                  <li
                    key={s.service_id}
                    className="rounded-xl border px-4 py-4 text-left text-sm"
                    style={{ borderColor: BORDER, backgroundColor: "rgba(14,24,41,0.6)" }}
                  >
                    <span className="font-semibold text-white">{door3ServiceName(s.service_id)}</span>
                    <span style={{ color: DIM }}> — {s.reason}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs" style={{ color: "rgba(232,238,245,0.4)" }}>
                Pricing isn&apos;t shown here — it unlocks when you&apos;re ready on the next step.
              </p>
            </div>

            <div
              className="rounded-xl border px-5 py-6 text-center"
              style={{ borderColor: BORDER, backgroundColor: "rgba(14,24,41,0.45)" }}
            >
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
              <Button asChild className="mt-6 font-semibold" style={{ backgroundColor: GOLD, color: BG }}>
                <Link to={nextStepHref(analysis.next_step as NextStepKey)}>Continue →</Link>
              </Button>
            </div>

            <div className="rounded-xl border px-5 py-6" style={{ borderColor: BORDER, backgroundColor: CARD }}>
              <p className="text-center text-sm font-medium text-white">Talk to someone about this →</p>
              <p className="mt-1 text-center text-xs" style={{ color: DIM }}>
                Tap to talk with Jordan (Evaluation Specialist).
              </p>
              {vapiErr && <p className="mt-3 text-center text-sm text-amber-400">{vapiErr}</p>}
              <div className="mt-4 flex justify-center gap-3">
                {!callActive ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="border-[#c9a227]/50 bg-transparent text-white hover:bg-[#c9a227]/10"
                    onClick={() => void startJordan()}
                  >
                    <Mic className="mr-2 h-4 w-4" />
                    Tap to Talk
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="border-red-500/40 text-red-300 hover:bg-red-500/10"
                    onClick={endJordan}
                  >
                    <PhoneOff className="mr-2 h-4 w-4" />
                    End call
                  </Button>
                )}
              </div>
            </div>

            <p className="text-center">
              <Link to="/" className="text-sm underline" style={{ color: DIM }}>
                ← Home
              </Link>
            </p>
          </section>
        )}
      </main>
    </div>
  );
}
