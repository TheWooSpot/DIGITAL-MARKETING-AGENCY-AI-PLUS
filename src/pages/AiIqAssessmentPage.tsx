import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useSession } from "@/context/SessionContext";
import { getSupabaseBrowserClient } from "@/anydoor/lib/supabaseBrowserClient";
import { AnyDoorEntryScreen, AnyDoorPageShell } from "@/components/anydoor/AnyDoorExperience";
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
import { JORDAN_ASSISTANT_ID, vapi } from "@/lib/vapiClient";
import { acquireVapiTapLock, releaseVapiTapLockEarly } from "@/lib/vapiTapLock";
import { appendVapiAssistantKeyHint, extractVapiErrorMessage } from "@/lib/vapiErrors";

/** Door B1–aligned chrome (AnyDoor tokens: #07090f, #c9993a, DM Sans / DM Serif Display) */
const BG = "#07090f";
const GOLD = "#c9993a";
const WHITE = "#e8eef5";
const DIM = "rgba(232,238,245,0.55)";
const ANTHROPIC_MODEL = "claude-sonnet-4-20250514";

function useAiIqJordanVapi(score: number, rung: 1 | 2 | 3 | 4, band: string) {
  const publicKey = (import.meta.env.VITE_VAPI_PUBLIC_KEY as string | undefined)?.trim() ?? "";
  const hasPublicKey = publicKey.length > 0;
  const [isCallActive, setIsCallActive] = useState(false);
  const [startLocked, setStartLocked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasPublicKey || !vapi) return;
    const onStart = () => { setIsCallActive(true); setError(null); };
    const onEnd = () => setIsCallActive(false);
    const onErr = (e: unknown) => {
      const raw = typeof e === "string" ? e : String((e as Record<string, unknown>)?.message ?? e ?? "");
      setError(appendVapiAssistantKeyHint(extractVapiErrorMessage(raw)));
      setIsCallActive(false);
      setStartLocked(false);
      releaseVapiTapLockEarly();
    };
    vapi.on("call-start", onStart);
    vapi.on("call-end", onEnd);
    vapi.on("error", onErr);
    vapi.on("call-start-failed", onErr);
    return () => {
      vapi.removeListener("call-start", onStart);
      vapi.removeListener("call-end", onEnd);
      vapi.removeListener("error", onErr);
      vapi.removeListener("call-start-failed", onErr);
    };
  }, [hasPublicKey]);

  const start = useCallback(() => {
    if (!hasPublicKey) { setError("Voice not configured — add VITE_VAPI_PUBLIC_KEY."); return; }
    if (!acquireVapiTapLock()) return;
    setStartLocked(true);
    window.setTimeout(() => setStartLocked(false), 3000);
    setError(null);
    vapi?.start(JORDAN_ASSISTANT_ID, {
      variableValues: {
        ai_iq_score: String(score),
        recommended_rung: String(rung),
        ai_iq_band: band,
      },
    });
  }, [hasPublicKey, score, rung, band]);

  const end = useCallback(() => { vapi?.stop(); }, []);

  return { hasPublicKey, isCallActive, startLocked, error, start, end };
}

const AI_IQ_CONTEXT_URL =
  "https://aagggflwhadxjjhcaohc.supabase.co/functions/v1/ai-iq-context";
const DOOR4_SCORE_URL =
  "https://aagggflwhadxjjhcaohc.supabase.co/functions/v1/door4-score";
const PROSPECTS_TABLE = ["layer5", "prospects"].join("_");

const THINKING_MESSAGES = [
  "Reviewing your organization...",
  "Analyzing your digital presence...",
  "Calibrating your assessment...",
  "Personalizing your AI IQ...",
];

type AiIqContextResponse = {
  industry?: string;
  business_type?: string;
  size_signal?: string;
  tech_maturity?: string;
  ai_signals?: string[];
  primary_value_proposition?: string;
  likely_pain_points?: string[];
  domain_max_adjustments?: Record<string, number>;
  synopsis?: string;
  industry_options?: Array<{ label: string; primary?: boolean }>;
};

type AiIqBusinessContext = {
  industry: string;
  business_type: string;
  primary_audience: string;
  business_name: string;
  detected_gaps: string[];
  source: "layer5" | "metadata" | "fallback";
};

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
  "/ai-readiness/rung-4";

function domainBarColor(score: number, max: number): string {
  const r = max > 0 ? score / max : 0;
  if (r >= 0.66) return "#2ecc8a";
  if (r >= 0.33) return "#f0a030";
  return "#e05050";
}

function normalizeUrlInput(value: string): { raw: string; host: string; fetchUrl: string } {
  const raw = value.trim();
  if (!raw) return { raw: "", host: "", fetchUrl: "" };
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const u = new URL(withProtocol);
    return { raw, host: u.hostname.replace(/^www\./, ""), fetchUrl: `${u.protocol}//${u.hostname}` };
  } catch {
    const host = raw.replace(/^https?:\/\//i, "").replace(/^www\./, "").split("/")[0] ?? "";
    return { raw, host, fetchUrl: host ? `https://${host}` : "" };
  }
}

function extractJsonValue(text: string): unknown {
  const t = text.trim();
  try {
    return JSON.parse(t);
  } catch {
    const fenced = /```(?:json)?\s*([\s\S]*?)\s*```/i.exec(t);
    if (fenced?.[1]) return JSON.parse(fenced[1]);
    const arrStart = t.indexOf("[");
    const arrEnd = t.lastIndexOf("]");
    if (arrStart >= 0 && arrEnd > arrStart) return JSON.parse(t.slice(arrStart, arrEnd + 1));
    const objStart = t.indexOf("{");
    const objEnd = t.lastIndexOf("}");
    if (objStart >= 0 && objEnd > objStart) return JSON.parse(t.slice(objStart, objEnd + 1));
    throw new Error("No JSON found.");
  }
}

function parseDetectedGaps(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((g) => {
      if (typeof g === "string") return g.trim();
      if (g && typeof g === "object" && "gap_description" in g) {
        return String((g as Record<string, unknown>).gap_description ?? "").trim();
      }
      return "";
    })
    .filter(Boolean)
    .slice(0, 6);
}

function fallbackBusinessContext(name: string): AiIqBusinessContext {
  return {
    industry: "general business",
    business_type: "growth-focused business",
    primary_audience: "Unknown",
    business_name: name || "your business",
    detected_gaps: [],
    source: "fallback",
  };
}

export default function AiIqAssessmentPage() {
  const { mergeSession, ...sessionSnapshot } = useSession();
  const [phase, setPhase] = useState<
    | "loading"
    | "gate"
    | "thinking"
    | "industry_confirm"
    | "adaptive_loading"
    | "personalized_intro"
    | "quiz"
    | "domain_bridge"
    | "results"
  >("loading");
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
  const [resultRung, setResultRung] = useState<1 | 2 | 3 | 4>(1);
  const [orgContext, setOrgContext] = useState<{ option: string; question: string } | null>(null);
  const [persistError, setPersistError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [businessContext, setBusinessContext] = useState<AiIqBusinessContext>(fallbackBusinessContext(sessionSnapshot.name));
  const [bridgeText, setBridgeText] = useState("");
  const [pendingStepAfterBridge, setPendingStepAfterBridge] = useState<number | null>(null);
  const [bridgeCache, setBridgeCache] = useState<Record<string, string>>({});
  const [personalizedSummary, setPersonalizedSummary] = useState<string>("");

  // Screen 2 — thinking animation
  const [thinkingMsgIdx, setThinkingMsgIdx] = useState(0);
  // Screen 3 — industry confirmation
  const [aiIqContextData, setAiIqContextData] = useState<AiIqContextResponse | null>(null);
  const [contextFallback, setContextFallback] = useState(false);
  const [selectedIndustry, setSelectedIndustry] = useState<string>("");
  const [customIndustry, setCustomIndustry] = useState<string>("");
  const confirmedIndustry = selectedIndustry === "Other" ? customIndustry.trim() : selectedIndustry;

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
        .from("door4_ai_iq_questions")
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
      setLoadError(rows.length === 0 ? "No questions loaded. Seed `door4_ai_iq_questions` in Supabase." : null);
      setPhase("gate");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const totalSteps = questions.length;
  const current = questions[step];

  const loadBusinessContext = useCallback(
    async (inputName: string, inputUrl: string, supabase: ReturnType<typeof getSupabaseBrowserClient>): Promise<AiIqBusinessContext> => {
      const norm = normalizeUrlInput(inputUrl);
      const fallback = fallbackBusinessContext(inputName);
      if (!supabase || !norm.raw) return fallback;

      const candidates = Array.from(
        new Set(
          [norm.raw, norm.host, `https://${norm.host}`, `http://${norm.host}`, `${norm.host}/`]
            .map((x) => x.trim())
            .filter(Boolean)
        )
      );

      for (const candidate of candidates) {
        const tryQuery = async (column: "website_url" | "url") => {
          const { data, error } = await supabase
            .from(PROSPECTS_TABLE)
            .select("business_name,industry,business_descriptor,detected_gaps")
            .eq(column, candidate)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (error || !data) return null;
          return {
            industry: String(data.industry ?? "").trim() || fallback.industry,
            business_type: String(data.business_descriptor ?? "").trim() || fallback.business_type,
            primary_audience: "Unknown",
            business_name: String(data.business_name ?? "").trim() || fallback.business_name,
            detected_gaps: parseDetectedGaps(data.detected_gaps),
            source: "layer5" as const,
          };
        };

        const byWebsite = await tryQuery("website_url");
        if (byWebsite) return byWebsite;
        const byUrl = await tryQuery("url");
        if (byUrl) return byUrl;
      }

      const anthropicKey = (import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined)?.trim();
      if (!anthropicKey || !norm.fetchUrl) return fallback;
      try {
        const metaRes = await fetch(norm.fetchUrl, {
          headers: { "User-Agent": "Mozilla/5.0 (Door4-AI-IQ-Metadata/1.0)" },
        });
        const html = metaRes.ok ? (await metaRes.text()).slice(0, 200_000) : "";
        const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
        const descMatch =
          /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i.exec(html) ||
          /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["'][^>]*>/i.exec(html);
        const title = (titleMatch?.[1] ?? "").replace(/\s+/g, " ").trim();
        const description = (descMatch?.[1] ?? "").replace(/\s+/g, " ").trim();

        const detectRes = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": anthropicKey,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: ANTHROPIC_MODEL,
            max_tokens: 400,
            temperature: 0,
            system:
              'Detect the business type and primary industry from this URL metadata. Return JSON: { "industry": string, "business_type": string, "primary_audience": string }.',
            messages: [
              {
                role: "user",
                content: `URL: ${norm.raw}\nTitle: ${title || "(none)"}\nDescription: ${description || "(none)"}`,
              },
            ],
          }),
        });
        if (!detectRes.ok) return fallback;
        const detectJson = (await detectRes.json()) as { content?: Array<{ text?: string }> };
        const parsed = extractJsonValue(detectJson.content?.[0]?.text ?? "") as Record<string, unknown>;
        return {
          industry: String(parsed.industry ?? "").trim() || fallback.industry,
          business_type: String(parsed.business_type ?? "").trim() || fallback.business_type,
          primary_audience: String(parsed.primary_audience ?? "").trim() || fallback.primary_audience,
          business_name: fallback.business_name,
          detected_gaps: [],
          source: "metadata",
        };
      } catch {
        return fallback;
      }
    },
    []
  );

  const generateDomainBridge = useCallback(
    async (previousDomain: string, nextDomain: string, context: AiIqBusinessContext): Promise<string> => {
      const cacheKey = `${previousDomain}__${nextDomain}__${context.business_type}__${context.industry}`;
      if (bridgeCache[cacheKey]) return bridgeCache[cacheKey];
      const anthropicKey = (import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined)?.trim();
      if (!anthropicKey) return "";
      try {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": anthropicKey,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: ANTHROPIC_MODEL,
            max_tokens: 120,
            temperature: 0.2,
            messages: [
              {
                role: "user",
                content:
                  `Write a single conversational sentence (max 18 words) that bridges from ${previousDomain} to ${nextDomain} for a ${context.business_type} in ${context.industry}. ` +
                  "Make it feel like an advisor talking to them, not a quiz narrator.",
              },
            ],
          }),
        });
        if (!res.ok) return "";
        const data = (await res.json()) as { content?: Array<{ text?: string }> };
        const sentence = String(data.content?.[0]?.text ?? "")
          .replace(/\s+/g, " ")
          .replace(/^["'\s]+|["'\s]+$/g, "")
          .trim();
        if (!sentence) return "";
        setBridgeCache((prev) => ({ ...prev, [cacheKey]: sentence }));
        return sentence;
      } catch {
        return "";
      }
    },
    [bridgeCache]
  );

  const generateResultsSummary = useCallback(
    async (score: number, context: AiIqBusinessContext, gaps: string[]): Promise<string> => {
      const anthropicKey = (import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined)?.trim();
      if (!anthropicKey) return "";
      try {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": anthropicKey,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: ANTHROPIC_MODEL,
            max_tokens: 220,
            temperature: 0.2,
            messages: [
              {
                role: "user",
                content:
                  `Given a ${context.industry} business with score ${score} and these top gaps ${gaps.join(", ") || "none"}, ` +
                  "write 2 sentences in plain language explaining what this score means specifically for their type of business. " +
                  "Be honest. Be direct. Reference the industry without being generic.",
              },
            ],
          }),
        });
        if (!res.ok) return "";
        const data = (await res.json()) as { content?: Array<{ text?: string }> };
        return String(data.content?.[0]?.text ?? "").replace(/\s+/g, " ").trim();
      } catch {
        return "";
      }
    },
    []
  );

  // Cycle thinking messages every 1.5 s while on the thinking screen
  useEffect(() => {
    if (phase !== "thinking") return;
    setThinkingMsgIdx(0);
    const id = window.setInterval(() => {
      setThinkingMsgIdx((i) => (i + 1) % THINKING_MESSAGES.length);
    }, 1500);
    return () => window.clearInterval(id);
  }, [phase]);

  const startQuiz = useCallback(async () => {
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
    setPersonalizedSummary("");
    setBridgeText("");
    setPendingStepAfterBridge(null);
    setSelectedIndustry("");
    setCustomIndustry("");
    setAiIqContextData(null);

    // Go to thinking screen immediately
    setPhase("thinking");

    const minDisplayTimer = new Promise<void>((res) => window.setTimeout(res, 2500));

    // Fetch ai-iq-context in parallel with the minimum display time
    const contextFetch = fetch(AI_IQ_CONTEXT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: url.trim() || "" }),
    })
      .then(async (r) => {
        const j = (await r.json()) as { business_context?: AiIqContextResponse; fallback?: boolean };
        return { data: j.business_context ?? null, fallback: j.fallback ?? true };
      })
      .catch(() => ({ data: null as AiIqContextResponse | null, fallback: true }));

    const [, { data: ctxData, fallback: isFallback }] = await Promise.all([minDisplayTimer, contextFetch]);

    setAiIqContextData(ctxData);
    setContextFallback(isFallback);

    // Pre-select the primary industry option
    const options = ctxData?.industry_options ?? [];
    const primary = options.find((o) => o.primary);
    if (primary) setSelectedIndustry(primary.label);

    setPhase("industry_confirm");
  }, [email, mergeSession, name, questions.length, url, loadBusinessContext]);

  const confirmIndustryAndProceed = useCallback(async () => {
    const industry = confirmedIndustry || aiIqContextData?.industry || "general business";

    // Show brief adaptive loading
    setPhase("adaptive_loading");

    await new Promise<void>((res) => window.setTimeout(res, 2000));

    const supabase = getSupabaseBrowserClient();
    const ctx = await loadBusinessContext(name.trim(), url.trim(), supabase);
    // Merge confirmed industry into ctx
    const merged: AiIqBusinessContext = { ...ctx, industry };
    setBusinessContext(merged);
    setPhase("personalized_intro");
    window.setTimeout(() => {
      setPhase("quiz");
    }, 2300);
  }, [confirmedIndustry, aiIqContextData, name, url, loadBusinessContext]);

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

    const scorePayloadFields = [
      { key: "full_name", label: "Full Name", type: "INPUT_TEXT", value: name.trim() },
      { key: "business_name", label: "Business Name", type: "INPUT_TEXT", value: businessContext.business_name || name.trim() },
      { key: "business_email", label: "Business Email", type: "INPUT_EMAIL", value: email.trim() },
      { key: "website_url", label: "Website URL (optional)", type: "INPUT_LINK", value: url.trim() || "" },
    ];
    const answerFields = questions.map((q) => {
      const selectedOption = selectedOptionByQuestion.get(q.question_id) ?? "";
      return {
        key: q.question_id,
        label: q.question,
        type: "MULTIPLE_CHOICE",
        value: selectedOption ? [selectedOption] : [],
        options: q.options.map((o) => ({ id: o.option, text: o.option })),
      };
    });

    const scoreRes = await fetch(DOOR4_SCORE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: {
          submissionId: crypto.randomUUID(),
          fields: [...scorePayloadFields, ...answerFields],
        },
      }),
    });
    let scoreErrMessage: string | null = null;
    if (!scoreRes.ok) {
      const bodyText = await scoreRes.text();
      scoreErrMessage = bodyText || `door4-score failed with status ${scoreRes.status}`;
    } else {
      // Trust the server — override local computation with authoritative values
      try {
        const scoreData = await scoreRes.json();
        if (typeof scoreData.ai_iq_score === "number") {
          setResultTotal(scoreData.ai_iq_score);
        }
        if (typeof scoreData.ai_iq_band === "string") {
          setResultBand(scoreData.ai_iq_band);
        }
        if (typeof scoreData.recommended_rung === "number") {
          setResultRung(scoreData.recommended_rung as 1 | 2 | 3 | 4);
        }
        if (scoreData.domain_scores && typeof scoreData.domain_scores === "object") {
          setResultDomains(scoreData.domain_scores as Record<DomainKey, number>);
        }
      } catch {
        // Fall back to client-computed values already in state
      }
    }

    const rung = rungFromTotalScore(total);

    const parts: string[] = [];
    if (scoreErrMessage) parts.push(`door4-score: ${scoreErrMessage}`);
    if (parts.length > 0) setPersistError(parts.join(" · "));

    setSubmitting(false);

    // Fire-and-forget — never blocks UX
    void fetch(
      "https://aagggflwhadxjjhcaohc.supabase.co/functions/v1/ai-iq-notify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          score: total,
          band: bandLabelFromScore(total),
          rung,
          rung_label: rung === 1 ? "Awareness" : rung === 2 ? "Adaptation" : rung === 3 ? "Optimization" : "Stewardship",
          rung_description:
            rung === 1
              ? "Awareness — free orientation resources to align your team on AI readiness fundamentals."
              : rung === 2
                ? "Practical path to adopt AI without boiling the ocean — clarity and a plan you can execute."
                : rung === 3
                  ? "Workshop-style facilitation so adoption matches how your business actually runs."
                  : "Strategic sequencing and done-with-you implementation as AI becomes infrastructure.",
          domain_scores: domains,
        }),
      }
    );
  }, [answers, email, mergeSession, name, questions, selectedOptionByQuestion, url, businessContext]);

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
    quizAdvanceTimeoutRef.current = window.setTimeout(async () => {
      quizAdvanceTimeoutRef.current = null;
      if (step >= totalSteps - 1) {
        void finishQuiz();
      } else {
        const nextStep = step + 1;
        const nextQuestion = questions[nextStep];
        const isDomainChange = !!nextQuestion && nextQuestion.domain !== current.domain;
        if (isDomainChange) {
          const bridge = await generateDomainBridge(current.domain, nextQuestion.domain, businessContext);
          if (bridge) {
            setBridgeText(bridge);
            setPendingStepAfterBridge(nextStep);
            setPhase("domain_bridge");
            return;
          }
        }
        setStep(nextStep);
      }
    }, 160);
    return () => {
      if (quizAdvanceTimeoutRef.current !== null) {
        window.clearTimeout(quizAdvanceTimeoutRef.current);
        quizAdvanceTimeoutRef.current = null;
      }
    };
  }, [answers, phase, current, step, totalSteps, finishQuiz, questions, generateDomainBridge, businessContext]);

  useEffect(() => {
    if (phase !== "domain_bridge" || pendingStepAfterBridge == null) return;
    const t = window.setTimeout(() => {
      setStep(pendingStepAfterBridge);
      setPendingStepAfterBridge(null);
      setBridgeText("");
      setPhase("quiz");
    }, 1500);
    return () => window.clearTimeout(t);
  }, [phase, pendingStepAfterBridge]);

  const gapBlocks = useMemo(() => (resultDomains ? topGapDomains(resultDomains) : []), [resultDomains]);

  useEffect(() => {
    if (phase !== "results" || !resultDomains) return;
    let cancelled = false;
    const topGaps = gapBlocks.map((g) => g.domain);
    void generateResultsSummary(resultTotal, businessContext, topGaps).then((summary) => {
      if (cancelled || !summary) return;
      setPersonalizedSummary(summary);
    });
    return () => {
      cancelled = true;
    };
  }, [phase, resultDomains, gapBlocks, generateResultsSummary, resultTotal, businessContext]);

  const cta = useMemo(() => {
    if (resultRung === 1)
      return { href: "https://socialutely.com/hubai", label: "Start with Awareness — free →" };
    if (resultRung === 2)
      return { href: RUNG2_URL, label: "Enroll in Rung 2 — Adaptation →" };
    if (resultRung === 3)
      return { href: RUNG3_URL, label: "Enroll in Rung 3 — Optimization →" };
    return { href: RUNG4_URL, label: "Book a discovery call →" };
  }, [resultRung]);

  const headline = BAND_HEADLINES[resultBand] ?? BAND_HEADLINES["AI Absent"];

  const jordan = useAiIqJordanVapi(resultTotal, resultRung, resultBand);

  if (phase === "loading") {
    return (
      <div className="anydoor-door-page min-h-screen">
        <AnyDoorPageShell narrow={false}>
          <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4" style={{ color: WHITE }}>
            <div
              className="h-10 w-10 animate-spin rounded-full border-2 border-transparent"
              style={{ borderTopColor: GOLD, borderRightColor: GOLD }}
            />
            <p style={{ color: DIM }}>Loading assessment…</p>
          </div>
        </AnyDoorPageShell>
      </div>
    );
  }

  return (
    <div className="anydoor-door-page min-h-screen">
    <AnyDoorPageShell narrow={false}>
      {phase === "gate" && (
        <div className="mx-auto w-full max-w-[580px]">
          <AnyDoorEntryScreen
            eyebrow="ANYDOOR ENGINE · D-4 · THE COMPASS"
            heading="Find Out Exactly Where Your AI Stands"
            subtext1={"You don't know where your organization stands on AI readiness."}
            subtext2="A real score across 10 dimensions and a clear path to where you go next."
            bodyText="About 8–12 minutes. One question at a time."
          />
          {loadError && (
            <p className="mx-auto mb-6 w-full rounded border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-center text-sm text-amber-200">
              {loadError}
            </p>
          )}
          <section className="mx-auto w-full space-y-4">
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
              onClick={() => void startQuiz()}
              disabled={questions.length === 0}
            >
              Begin assessment →
            </button>
          </section>
        </div>
      )}

      {/* ─── SCREEN 2: Thinking animation ─── */}
      {phase === "thinking" && (
        <div className="flex min-h-[56vh] flex-col items-center justify-center text-center">
          <div className="w-full max-w-[580px] px-4">
            {/* Gold pulsing dot — matches Door B1 loading overlay */}
            <div className="mb-8 flex justify-center">
              <span
                className="block h-4 w-4 rounded-full"
                style={{
                  backgroundColor: GOLD,
                  boxShadow: `0 0 0 0 ${GOLD}`,
                  animation: "aiiq-pulse 1.6s ease-in-out infinite",
                }}
              />
            </div>
            <p
              className="text-lg font-light italic leading-snug text-white/90 transition-opacity duration-500"
              style={{ fontFamily: "var(--font-cormorant, var(--font-dm-serif-display)), Georgia, serif" }}
            >
              {THINKING_MESSAGES[thinkingMsgIdx]}
            </p>
            <div className="mt-8 h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full"
                style={{
                  width: "100%",
                  backgroundColor: GOLD,
                  animation: "aiiq-bar-slide 2.5s linear forwards",
                }}
              />
            </div>
          </div>
          {/* Keyframes injected inline once */}
          <style>{`
            @keyframes aiiq-pulse {
              0%   { box-shadow: 0 0 0 0 rgba(201,153,58,0.55); }
              70%  { box-shadow: 0 0 0 14px rgba(201,153,58,0); }
              100% { box-shadow: 0 0 0 0 rgba(201,153,58,0); }
            }
            @keyframes aiiq-bar-slide {
              from { transform: translateX(-100%); }
              to   { transform: translateX(0); }
            }
          `}</style>
        </div>
      )}

      {/* ─── SCREEN 3: Industry confirmation ─── */}
      {phase === "industry_confirm" && (
        <div className="mx-auto w-full max-w-[580px]">
          <p
            className="mb-4 text-center font-mono text-[11px] uppercase tracking-[0.3em]"
            style={{ color: GOLD }}
          >
            AI IQ™ · Calibration
          </p>
          <h2
            className="mb-5 text-center text-3xl font-light leading-snug text-white"
            style={{ fontFamily: "var(--font-dm-serif-display), Georgia, serif" }}
          >
            Here's what we found
          </h2>

          {/* Synopsis */}
          <div className="mb-8 rounded-xl border border-white/[0.08] bg-white/[0.03] px-6 py-5">
            <p className="text-sm leading-relaxed" style={{ color: WHITE }}>
              {contextFallback || !aiIqContextData?.synopsis
                ? "Tell us a bit about your organization so we can calibrate your assessment."
                : aiIqContextData.synopsis}
            </p>
            {aiIqContextData?.primary_value_proposition && !contextFallback && (
              <p className="mt-3 text-xs italic" style={{ color: DIM }}>
                {aiIqContextData.primary_value_proposition}
              </p>
            )}
          </div>

          {/* Industry selection */}
          <p className="mb-3 text-sm font-medium" style={{ color: WHITE }}>
            Confirm your industry — tap the one that fits best:
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {(
              aiIqContextData?.industry_options?.length
                ? aiIqContextData.industry_options
                : [
                    { label: "Professional Services", primary: true },
                    { label: "SaaS / Tech" },
                    { label: "Healthcare" },
                    { label: "Retail / E-commerce" },
                    { label: "Nonprofit" },
                    { label: "Finance / Legal" },
                    { label: "Education" },
                    { label: "Real Estate" },
                    { label: "Other" },
                  ]
            ).map((opt) => {
              const isSelected = selectedIndustry === opt.label;
              return (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setSelectedIndustry(opt.label)}
                  style={{
                    background: isSelected ? "rgba(201,153,58,0.12)" : "rgba(255,255,255,0.04)",
                    border: isSelected ? `2px solid ${GOLD}` : "1px solid rgba(201,153,58,0.25)",
                    borderRadius: 8,
                    padding: "12px 16px",
                    fontFamily: "var(--font-dm-sans), DM Sans, sans-serif",
                    fontSize: 14,
                    color: isSelected ? GOLD : "rgba(232,238,245,0.85)",
                    fontWeight: isSelected ? 600 : 400,
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.18s",
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {/* Custom industry input when "Other" selected */}
          {selectedIndustry === "Other" && (
            <input
              type="text"
              className="anydoor-field-input mt-4"
              placeholder="Describe your industry or business type"
              value={customIndustry}
              onChange={(e) => setCustomIndustry(e.target.value)}
              autoFocus
            />
          )}

          {/* Confirm button */}
          <button
            type="button"
            className="anydoor-btn-gold mt-8"
            disabled={!selectedIndustry || (selectedIndustry === "Other" && !customIndustry.trim())}
            onClick={() => void confirmIndustryAndProceed()}
          >
            Begin My AI IQ™ →
          </button>

          {aiIqContextData?.likely_pain_points?.length ? (
            <div className="mt-6 flex flex-wrap gap-2">
              {aiIqContextData.likely_pain_points.map((p) => (
                <span
                  key={p}
                  className="rounded-full border border-white/10 px-3 py-1 text-xs"
                  style={{ color: DIM }}
                >
                  {p}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      )}

      {/* ─── SCREEN 4: Adaptive loading ─── */}
      {phase === "adaptive_loading" && (
        <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
          <div className="w-full max-w-[580px] px-4">
            <div className="mb-6 flex justify-center">
              <div
                className="h-8 w-8 animate-spin rounded-full border-2 border-transparent"
                style={{ borderTopColor: GOLD, borderRightColor: GOLD }}
              />
            </div>
            <p
              className="text-xl font-light leading-snug text-white"
              style={{ fontFamily: "var(--font-dm-serif-display), Georgia, serif" }}
            >
              Building your personalized assessment...
            </p>
            <p className="mt-3 text-sm" style={{ color: DIM }}>
              Based on your{" "}
              <span style={{ color: GOLD }}>
                {confirmedIndustry || aiIqContextData?.industry || "industry"}
              </span>{" "}
              profile, we've calibrated this assessment to reflect what AI readiness means for an
              organization like yours.
            </p>
          </div>
        </div>
      )}

      {phase === "personalized_intro" && (
        <div className="flex min-h-[42vh] flex-col items-center justify-center text-center">
          <div className="anydoor-surface-card max-w-2xl">
            <p className="anydoor-exp-eyebrow">Personalized framing</p>
            <p
              className="mt-4 text-xl font-light leading-snug text-white sm:text-2xl"
              style={{ fontFamily: "var(--font-dm-serif-display), Georgia, serif" }}
            >
              We pulled some context on {businessContext.business_name || "your business"}.
            </p>
            <p className="mt-3 text-sm text-white/65">
              Here is what we are about to measure — and why it matters for a {businessContext.industry} business like
              yours.
            </p>
          </div>
        </div>
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
              style={{ fontFamily: "var(--font-dm-serif-display), Georgia, serif" }}
            >
              {current.question}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-white/60">
              For {businessContext.industry} businesses, {current.domain.toLowerCase()} usually determines how quickly AI
              turns into measurable outcomes.
            </p>
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

      {phase === "domain_bridge" && (
        <div className="flex min-h-[32vh] flex-col items-center justify-center text-center">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] px-6 py-5">
            <p className="text-sm italic text-white/70">{bridgeText || "Shifting to the next capability..."}</p>
          </div>
        </div>
      )}

      {phase === "results" && resultDomains && (
        <div
          className="mx-auto w-full max-w-[620px] animate-[fadeIn_0.4s_ease-out]"
          style={{ animationFillMode: "both" }}
        >
          <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }`}</style>

          {/* ── SECTION 1 · Score header ── */}
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-6 py-8 text-center">
            <p
              className="mb-5 font-mono text-[11px] uppercase tracking-[0.3em]"
              style={{ color: GOLD }}
            >
              AI IQ™ · Rung 1 Complete
            </p>

            {/* Score ring */}
            <div className="relative mx-auto mb-5 flex h-36 w-36 items-center justify-center rounded-full border-2"
              style={{ borderColor: `${GOLD}55`, boxShadow: `0 0 40px ${GOLD}22` }}
            >
              <div>
                <span
                  className="block text-5xl font-light tabular-nums leading-none"
                  style={{ color: GOLD, fontFamily: "var(--font-dm-serif-display), Georgia, serif" }}
                >
                  {resultTotal}
                </span>
                <span className="block text-sm text-white/40">/ 100</span>
              </div>
            </div>

            <p
              className="text-2xl font-light text-white"
              style={{ fontFamily: "var(--font-dm-serif-display), Georgia, serif" }}
            >
              {resultBand}
            </p>
            <p className="mt-2 text-sm" style={{ color: DIM }}>
              {headline}
            </p>
            <p className="mt-3 text-xs" style={{ color: `${GOLD}99` }}>Across 10 dimensions of AI readiness</p>

            {/* Personalized summary — appears async */}
            {personalizedSummary && (
              <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed" style={{ color: DIM }}>
                {personalizedSummary}
              </p>
            )}
          </div>

          {/* ── SECTION 2 · Domain score bars ── */}
          <section className="mt-8">
            <p
              className="mb-4 font-mono text-[11px] font-semibold uppercase tracking-[0.3em]"
              style={{ color: GOLD }}
            >
              Score by domain
            </p>
            <div className="grid gap-3">
              {(Object.keys(DOMAIN_MAX) as DomainKey[]).map((key) => {
                const max = DOMAIN_MAX[key];
                const score = resultDomains[key];
                const pct = max > 0 ? (score / max) * 100 : 0;
                return (
                  <div
                    key={key}
                    className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-4"
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-sm" style={{ color: WHITE }}>
                        {DOMAIN_LABEL[key]}
                      </span>
                      <span
                        className="font-mono text-xs tabular-nums"
                        style={{ color: `${GOLD}cc` }}
                      >
                        {score}/{max}
                      </span>
                    </div>
                    <div
                      className="h-1.5 w-full overflow-hidden rounded-full"
                      style={{ background: "rgba(255,255,255,0.06)" }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, backgroundColor: GOLD }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── SECTION 3 · Rung recommendation card ── */}
          <section className="mt-10">
            <p
              className="mb-4 font-mono text-[11px] font-semibold uppercase tracking-[0.3em]"
              style={{ color: GOLD }}
            >
              Your recommended path
            </p>
            <div
              className="rounded-2xl border-2 p-7"
              style={{
                borderColor: `${GOLD}55`,
                background: `linear-gradient(135deg, rgba(201,153,58,0.07) 0%, rgba(7,9,15,0.95) 100%)`,
                boxShadow: `0 0 48px rgba(201,153,58,0.10)`,
              }}
            >
              <p
                className="text-4xl font-light"
                style={{ color: GOLD, fontFamily: "var(--font-dm-serif-display), Georgia, serif" }}
              >
                Rung {resultRung}
              </p>
              <p className="mt-1 text-xl font-semibold text-white">
                {resultRung === 1 ? "Awareness" : resultRung === 2 ? "Adaptation™" : resultRung === 3 ? "Optimization™" : "Stewardship™"}
              </p>
              <p className="mt-4 text-sm leading-relaxed" style={{ color: DIM }}>
                {resultRung === 1 &&
                  `With a score of ${resultTotal}, your organization is at the start of the AI readiness ladder. Rung 1 is Awareness — free orientation resources to align your team on what matters before deeper implementation.`}
                {resultRung === 2 &&
                  `With a score of ${resultTotal}, your organization is at the start of a real AI journey. Rung 2 gives you a structured, practical roadmap — no jargon, no wasted effort. You'll leave with a clear implementation plan and the confidence to execute it.`}
                {resultRung === 3 &&
                  `Your score of ${resultTotal} shows AI is active in your organization, but adoption is uneven. Rung 3 closes the gap between departments, aligning AI initiatives to the way your business actually operates — through facilitated workshops with your team.`}
                {resultRung === 4 &&
                  `A score of ${resultTotal} places you in the top tier of AI readiness. Rung 4 is strategic: done-with-you implementation, governance architecture, and AI embedded as true infrastructure — not a tool, but a business layer.`}
              </p>

              <div className="mt-7">
                {cta.href.startsWith("/") ? (
                  <Link
                    to={cta.href}
                    className="inline-block w-full rounded-xl px-6 py-4 text-center text-sm font-bold uppercase tracking-wide transition-all hover:brightness-110"
                    style={{ background: GOLD, color: "#07090f" }}
                  >
                    {cta.label}
                  </Link>
                ) : (
                  <a
                    href={cta.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block w-full rounded-xl px-6 py-4 text-center text-sm font-bold uppercase tracking-wide transition-all hover:brightness-110"
                    style={{ background: GOLD, color: "#07090f" }}
                  >
                    {cta.label}
                  </a>
                )}
              </div>
            </div>
          </section>

          {/* ── SECTION 4 · Jordan Tap to Talk ── */}
          <section className="mt-10 rounded-2xl border border-white/[0.07] bg-white/[0.02] px-6 py-8 text-center">
            <p
              className="mb-3 font-mono text-[11px] uppercase tracking-[0.3em]"
              style={{ color: GOLD }}
            >
              Jordan · Evaluation Specialist
            </p>
            <h3
              className="text-2xl font-light text-white"
              style={{ fontFamily: "var(--font-dm-serif-display), Georgia, serif" }}
            >
              Talk Through Your Results
            </h3>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed" style={{ color: DIM }}>
              Jordan has your score. Ask anything about what it means or what to do next.
            </p>

            {jordan.error && (
              <p className="mx-auto mt-4 max-w-sm rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs text-amber-300">
                {jordan.error}
              </p>
            )}

            <button
              type="button"
              disabled={!jordan.hasPublicKey || (!jordan.isCallActive && jordan.startLocked)}
              onClick={() => (jordan.isCallActive ? jordan.end() : jordan.start())}
              className="mx-auto mt-6 flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-full border-2 transition-all disabled:cursor-not-allowed disabled:opacity-40"
              style={{
                borderColor: GOLD,
                background: jordan.isCallActive ? `${GOLD}22` : "rgba(255,255,255,0.03)",
                boxShadow: jordan.isCallActive ? `0 0 24px ${GOLD}44` : "none",
                animation: !jordan.isCallActive && jordan.hasPublicKey ? "aiiq-pulse 1.6s ease-in-out infinite" : "none",
                color: GOLD,
              }}
            >
              <span className="text-[10px] font-bold uppercase tracking-widest">
                {jordan.isCallActive ? "End" : "Tap"}
              </span>
            </button>

            <p className="mt-3 text-[10px] uppercase tracking-widest" style={{ color: `${GOLD}88` }}>
              {jordan.isCallActive ? "Connected — speak freely" : "Microphone required"}
            </p>
          </section>

          {/* Save status */}
          <div className="mt-6 text-center">
            {submitting && (
              <p className="text-xs" style={{ color: DIM }}>
                Saving results…
              </p>
            )}
            {persistError && (
              <p className="text-xs text-amber-400">{persistError}</p>
            )}
            {orgContext && (
              <p className="mt-2 text-xs" style={{ color: `${GOLD}66` }}>
                Context captured: {orgContext.option}
              </p>
            )}
          </div>
        </div>
      )}
    </AnyDoorPageShell>
    </div>
  );
}
