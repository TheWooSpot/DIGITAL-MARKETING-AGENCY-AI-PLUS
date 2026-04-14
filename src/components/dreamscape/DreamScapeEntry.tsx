import { useCallback, useRef, useState } from "react";
import { Conversation } from "@elevenlabs/client";
import type { VoiceConversation } from "@elevenlabs/client";
import { Mic, PhoneOff } from "lucide-react";
import { useSession } from "@/context/SessionContext";
import { invokeVisionReport } from "@/lib/dreamscape/invokeVisionReport";

/** Door 7 — DreamScape™ Amelia (ElevenLabs ConvAI). Set in `.env` / Vercel. */
const DREAMSCAPE_AGENT_ID =
  (import.meta.env.VITE_DREAMSCAPE_ELEVENLABS_AGENT_ID as string | undefined)?.trim() ?? "";

/**
 * Door 7 — DreamScape™ entry: pre-gate form, ElevenLabs voice session, Vision Report™ generation.
 */
export default function DreamScapeEntry() {
  const { mergeSession, name: sessionName, email: sessionEmail, url: sessionUrl } = useSession();

  const hasAgentId = DREAMSCAPE_AGENT_ID.length > 0;

  const [firstName, setFirstName] = useState(() => sessionName.split(/\s+/)[0] || sessionName || "");
  const [lastPart, setLastPart] = useState(() => {
    const parts = sessionName.trim().split(/\s+/);
    return parts.length > 1 ? parts.slice(1).join(" ") : "";
  });
  const [email, setEmail] = useState(sessionEmail);
  const [businessName, setBusinessName] = useState("");
  const [organizationType, setOrganizationType] = useState("");
  const [industry, setIndustry] = useState("");
  const [gateError, setGateError] = useState<string | null>(null);

  const [sessionReady, setSessionReady] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [startLocked, setStartLocked] = useState(false);
  const [showPostCall, setShowPostCall] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const conversationRef = useRef<VoiceConversation | null>(null);
  const fallbackTranscriptRef = useRef<string[]>([]);
  const dreamConvIdRef = useRef<string | null>(null);
  const [dreamConversationId, setDreamConversationId] = useState<string | null>(null);

  const [reportLoading, setReportLoading] = useState(false);
  const [reportHtml, setReportHtml] = useState<string | null>(null);
  const [reportNotice, setReportNotice] = useState<string | null>(null);
  const [reportNoticeKind, setReportNoticeKind] = useState<"success" | "info">("info");

  const fullName = [firstName.trim(), lastPart.trim()].filter(Boolean).join(" ") || firstName.trim();

  const showGenerateReportButton = useCallback(() => {
    setIsCallActive(false);
    setShowPostCall(true);
  }, []);

  const buildFallbackConversationSummary = useCallback((): string => {
    const parts: string[] = [
      `Participant: ${fullName} (${email.trim()})`,
      businessName.trim() ? `Business name: ${businessName.trim()}` : null,
      organizationType.trim() ? `Organization type: ${organizationType.trim()}` : null,
      industry.trim() ? `Industry: ${industry.trim()}` : null,
      sessionUrl.trim() ? `Website: ${sessionUrl.trim()}` : null,
    ].filter(Boolean) as string[];

    const tx = fallbackTranscriptRef.current;
    if (tx.length > 0) {
      parts.push("Session transcript:\n" + tx.join("\n"));
    } else {
      parts.push("The user completed a DreamScape vision session with Amelia.");
    }
    return parts.join("\n\n");
  }, [businessName, email, fullName, industry, organizationType, sessionUrl]);

  const prepareSession = useCallback(() => {
    setGateError(null);
    if (!firstName.trim()) {
      setGateError("Enter your first name.");
      return false;
    }
    if (!email.trim() || !email.includes("@")) {
      setGateError("Enter a valid email.");
      return false;
    }
    mergeSession({
      name: fullName,
      email: email.trim(),
      url: sessionUrl,
    });
    fallbackTranscriptRef.current = [];
    dreamConvIdRef.current = null;
    setDreamConversationId(null);
    setSessionReady(true);
    return true;
  }, [email, firstName, fullName, mergeSession, sessionUrl]);

  const start = useCallback(async () => {
    if (!prepareSession()) return;
    if (!hasAgentId) {
      setError("Add VITE_DREAMSCAPE_ELEVENLABS_AGENT_ID to your environment and rebuild.");
      return;
    }

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("Microphone access is required to talk with Amelia.");
      return;
    }

    if (!acquireDreamTapLock()) return;
    setStartLocked(true);
    window.setTimeout(() => setStartLocked(false), 3000);

    setError(null);
    setShowPostCall(false);
    setReportHtml(null);
    setReportNotice(null);
    setReportNoticeKind("info");
    fallbackTranscriptRef.current = [];
    dreamConvIdRef.current = null;
    setDreamConversationId(null);

    try {
      const conv = await Conversation.startSession({
        agentId: DREAMSCAPE_AGENT_ID,
        onConnect: ({ conversationId }) => {
          const id = conversationId ?? null;
          dreamConvIdRef.current = id;
          setDreamConversationId(id);
        },
        onMessage: (msg: { source?: string; message?: string }) => {
          if (typeof msg.message === "string" && msg.message.trim()) {
            const role = msg.source === "ai" ? "Amelia" : "Client";
            fallbackTranscriptRef.current.push(`${role}: ${msg.message.trim()}`);
          }
        },
        onDisconnect: () => {
          conversationRef.current = null;
          showGenerateReportButton();
        },
        onError: (err: unknown) => {
          console.error("Amelia error:", err);
          conversationRef.current = null;
          showGenerateReportButton();
        },
      });

      conversationRef.current = conv;
      setIsCallActive(true);

      window.setTimeout(() => {
        if (!dreamConvIdRef.current && typeof conv.getId === "function") {
          const id = conv.getId();
          if (id) {
            dreamConvIdRef.current = id;
            setDreamConversationId(id);
          }
        }
      }, 3000);
    } catch (e) {
      console.error("DreamScape start failed:", e);
      setError("Could not start the voice session. Try again.");
      setStartLocked(false);
      releaseDreamTapLockEarly();
    }
  }, [hasAgentId, prepareSession, showGenerateReportButton]);

  const end = useCallback(async () => {
    try {
      await conversationRef.current?.endSession();
    } catch {
      /* ignore */
    } finally {
      conversationRef.current = null;
      setIsCallActive(false);
      setShowPostCall(true);
    }
  }, []);

  const generateReport = useCallback(async () => {
    setReportLoading(true);
    setReportNotice(null);
    setReportNoticeKind("info");

    const id = dreamConvIdRef.current || dreamConversationId || undefined;
    const summary = buildFallbackConversationSummary();
    const payload = {
      name: fullName,
      email: email.trim(),
      business_name: businessName.trim() || undefined,
      organization_type: organizationType.trim() || undefined,
      industry: industry.trim() || undefined,
      conversation_id: id,
      conversation_summary: summary,
    };

    const res = await invokeVisionReport(payload);
    setReportLoading(false);

    if (res.success) {
      setReportHtml(res.report_html);
      setReportNotice("Your Vision Report is saved. We'll follow up within 24 hours.");
      setReportNoticeKind("success");
      return;
    }
    console.warn("Vision Report generation failed:", res.error);
    setReportNotice(
      `We're finalizing your Vision Report. It will arrive at ${email.trim()} shortly.`,
    );
    setReportNoticeKind("info");
  }, [buildFallbackConversationSummary, businessName, dreamConversationId, email, fullName, industry, organizationType]);

  const canStart = hasAgentId;

  return (
    <div className="dreamscape-entry-card relative mx-auto w-full max-w-[580px] overflow-hidden rounded-xl border border-[#c9973a]/45 bg-[#07080d] px-6 py-10 shadow-[0_0_48px_rgba(201,151,58,0.12)] sm:px-10">
      <div className="dreamscape-shimmer-overlay pointer-events-none absolute inset-0 rounded-xl" aria-hidden />
      <div className="relative z-10 text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-[#c9973a]/90">DreamScape™</p>
        <h2
          className="mt-3 text-2xl font-light text-[#e8eef5] sm:text-3xl"
          style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}
        >
          The Dream Door
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-white/55">
          Tell us where you want to take your business. Amelia will listen.
        </p>

        {!sessionReady && (
          <div className="mt-8 space-y-4 text-left">
            <div>
              <label htmlFor="ds-first" className="anydoor-field-label--primary">
                First name
              </label>
              <input
                id="ds-first"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="anydoor-field-input"
                autoComplete="given-name"
              />
            </div>
            <div>
              <label htmlFor="ds-last" className="anydoor-field-label--muted">
                Last name <span className="text-white/35">(optional)</span>
              </label>
              <input
                id="ds-last"
                value={lastPart}
                onChange={(e) => setLastPart(e.target.value)}
                className="anydoor-field-input"
                autoComplete="family-name"
              />
            </div>
            <div>
              <label htmlFor="ds-email" className="anydoor-field-label--primary">
                Business email
              </label>
              <input
                id="ds-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="anydoor-field-input"
                autoComplete="email"
              />
            </div>
            <div>
              <label htmlFor="ds-business" className="anydoor-field-label--muted">
                Business name <span className="text-white/35">(optional)</span>
              </label>
              <input
                id="ds-business"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="anydoor-field-input"
              />
            </div>
            <div>
              <label htmlFor="ds-org" className="anydoor-field-label--muted">
                Organization type <span className="text-white/35">(optional)</span>
              </label>
              <input
                id="ds-org"
                value={organizationType}
                onChange={(e) => setOrganizationType(e.target.value)}
                className="anydoor-field-input"
                placeholder="e.g. SaaS, agency, local services"
              />
            </div>
            <div>
              <label htmlFor="ds-industry" className="anydoor-field-label--muted">
                Industry <span className="text-white/35">(optional)</span>
              </label>
              <input
                id="ds-industry"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="anydoor-field-input"
              />
            </div>
            {gateError ? <p className="text-sm text-red-400">{gateError}</p> : null}
            <button
              type="button"
              className="anydoor-btn-gold"
              onClick={() => {
                if (prepareSession()) {
                  /* sessionReady shows voice UI */
                }
              }}
            >
              Continue to voice session →
            </button>
          </div>
        )}

        {sessionReady && !canStart ? (
          <p className="mt-6 text-xs text-amber-400/90">
            Voice session unavailable: set <span className="font-mono">VITE_DREAMSCAPE_ELEVENLABS_AGENT_ID</span>, then
            rebuild.
          </p>
        ) : null}

        {error ? (
          <p className="mt-4 text-sm text-red-400" role="alert">
            {error}
          </p>
        ) : null}

        {sessionReady && canStart ? (
          <div className="mt-8 flex min-h-[140px] flex-col items-center justify-center gap-6">
            {isCallActive ? (
              <>
                <div className="dreamscape-voice-orb" aria-hidden />
                <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-[#c9973a]/80">Session in progress</p>
              </>
            ) : null}

            {!isCallActive && !showPostCall ? (
              <button
                type="button"
                disabled={startLocked}
                onClick={() => void start()}
                className="inline-flex w-full min-w-0 items-center justify-center rounded-lg border border-[#c9973a]/60 bg-[#c9973a]/15 px-8 py-3.5 text-base font-bold text-[#c9973a] transition hover:border-[#c9973a] hover:bg-[#c9973a]/25 disabled:pointer-events-none disabled:opacity-50"
              >
                <Mic className="mr-2 h-4 w-4" aria-hidden />
                Begin my vision session →
              </button>
            ) : null}

            {isCallActive ? (
              <button
                type="button"
                onClick={() => void end()}
                className="inline-flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-5 py-2.5 text-sm font-medium text-red-400"
              >
                <PhoneOff className="h-4 w-4" aria-hidden />
                End session
              </button>
            ) : null}
          </div>
        ) : null}

        {sessionReady && !isCallActive && !showPostCall ? (
          <p className="mt-6 text-[11px] leading-relaxed text-white/40">
            Voice conversation · 5–8 minutes · No preparation needed
          </p>
        ) : null}

        {showPostCall ? (
          <div className="dreamscape-thanks-fade dreamscape-generate-wrap mt-8 space-y-6 text-left">
            <p
              className="text-base font-light leading-relaxed text-[#e8eef5]/95"
              style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}
            >
              Your vision has been captured. When you&apos;re ready, generate your personalized Vision Report™ below.
            </p>
            <button
              type="button"
              disabled={reportLoading || Boolean(reportHtml)}
              onClick={() => void generateReport()}
              className="dreamscape-generate-btn anydoor-btn-gold disabled:opacity-60"
            >
              {reportLoading ? (
                <span className="inline-flex items-center justify-center gap-3">
                  <span className="dreamscape-report-loading-dot" aria-hidden />
                  Building your Vision Report...
                </span>
              ) : (
                "Generate My Vision Report →"
              )}
            </button>
            {reportNotice ? (
              <p
                className={
                  reportNoticeKind === "success"
                    ? "text-center text-sm text-emerald-400/90"
                    : "text-center text-sm text-amber-200/90"
                }
              >
                {reportNotice}
              </p>
            ) : null}
          </div>
        ) : null}

        {reportHtml ? (
          <div className="dreamscape-report-shell mt-8 w-full max-w-[820px] overflow-hidden rounded-lg border border-white/10 bg-[#05060a]">
            <iframe
              title="Vision Report"
              srcDoc={reportHtml}
              className="h-[min(80vh,720px)] w-full border-0"
              sandbox="allow-same-origin allow-popups"
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Prevents double-tap starts (same idea as Vapi tap lock, separate for Dream ElevenLabs). */
let dreamTapLock = false;
function acquireDreamTapLock(): boolean {
  if (dreamTapLock) return false;
  dreamTapLock = true;
  window.setTimeout(() => {
    dreamTapLock = false;
  }, 3000);
  return true;
}
function releaseDreamTapLockEarly(): void {
  dreamTapLock = false;
}
