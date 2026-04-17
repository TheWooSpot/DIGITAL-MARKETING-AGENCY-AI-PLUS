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
  const [email, setEmail] = useState(sessionEmail);
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
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportNotice, setReportNotice] = useState<string | null>(null);
  const [reportNoticeKind, setReportNoticeKind] = useState<"success" | "info">("info");

  const showGenerateReportButton = useCallback(() => {
    setIsCallActive(false);
    setShowPostCall(true);
  }, []);

  const buildFallbackConversationSummary = useCallback((): string => {
    const parts: string[] = [
      `Participant: ${firstName.trim()} (${email.trim()})`,
      sessionUrl.trim() ? `Website: ${sessionUrl.trim()}` : null,
    ].filter(Boolean) as string[];

    const tx = fallbackTranscriptRef.current;
    if (tx.length > 0) {
      parts.push("Session transcript:\n" + tx.join("\n"));
    } else {
      parts.push("The user completed a DreamScape vision session with Amelia.");
    }
    return parts.join("\n\n");
  }, [email, firstName, sessionUrl]);

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
      name: firstName.trim(),
      email: email.trim(),
      url: sessionUrl,
    });
    fallbackTranscriptRef.current = [];
    dreamConvIdRef.current = null;
    setDreamConversationId(null);
    setSessionReady(true);
    return true;
  }, [email, firstName, mergeSession, sessionUrl]);

  const start = useCallback(async () => {
    if (!prepareSession()) return;
    if (!hasAgentId) {
      setError("Add VITE_DREAMSCAPE_ELEVENLABS_AGENT_ID to your environment and rebuild.");
      return;
    }

    if (!acquireDreamTapLock()) return;
    setStartLocked(true);
    window.setTimeout(() => setStartLocked(false), 3000);

    setError(null);
    setShowPostCall(false);
    setReportHtml(null);
    setReportError(null);
    setReportNotice(null);
    setReportNoticeKind("info");
    fallbackTranscriptRef.current = [];
    dreamConvIdRef.current = null;
    setDreamConversationId(null);

    console.log("[DreamScape] Starting Amelia session...");
    console.log("[DreamScape] Agent ID:", DREAMSCAPE_AGENT_ID);
    console.log("[DreamScape] Agent ID length:", DREAMSCAPE_AGENT_ID.length);

    const sessionOptions = {
      agentId: DREAMSCAPE_AGENT_ID,
      connectionType: "websocket" as const,
      onConnect: ({ conversationId }: { conversationId?: string }) => {
        console.log("[DreamScape] Amelia connected, conversationId:", conversationId);
        const id = conversationId ?? null;
        dreamConvIdRef.current = id;
        setDreamConversationId(id);
      },
      onMessage: (msg: { source: "user" | "ai"; message: string }) => {
        console.log("[DreamScape] Message:", msg);
        if (msg.message.trim()) {
          const role = msg.source === "ai" ? "Amelia" : "Client";
          fallbackTranscriptRef.current.push(`${role}: ${msg.message.trim()}`);
        }
      },
      onDisconnect: () => {
        console.log("[DreamScape] Amelia disconnected");
        conversationRef.current = null;
        showGenerateReportButton();
      },
      onError: (err: unknown) => {
        const msg = typeof err === "string" ? err : (err as Error)?.message ?? "Unknown error";
        console.error("[DreamScape] Amelia session error:", err);
        console.error("[DreamScape] Error name:", (err as Error)?.name);
        console.error("[DreamScape] Error closeCode:", (err as { closeCode?: unknown })?.closeCode);
        console.error("[DreamScape] Error closeReason:", (err as { closeReason?: unknown })?.closeReason);
        try { console.error("[DreamScape] Error JSON:", JSON.stringify(err)); } catch { /* not serialisable */ }
        conversationRef.current = null;
        setIsCallActive(false);
        setError(`Voice session error: ${msg}`);
      },
    };

    const attemptStart = async (isRetry = false): Promise<void> => {
      try {
        const conv = await Conversation.startSession(sessionOptions);
        console.log("[DreamScape] startSession resolved, conv:", conv);
        conversationRef.current = conv;
        setIsCallActive(true);

        window.setTimeout(() => {
          if (!dreamConvIdRef.current && typeof (conv as { getId?: () => string }).getId === "function") {
            const id = (conv as { getId: () => string }).getId();
            if (id) {
              dreamConvIdRef.current = id;
              setDreamConversationId(id);
            }
          }
        }, 3000);
      } catch (e) {
        const err = e as Error & { closeCode?: number; closeReason?: string };
        console.error("[DreamScape] startSession threw:", e);
        console.error("[DreamScape] Error name:", err?.name);
        console.error("[DreamScape] Error message:", err?.message);
        console.error("[DreamScape] Error closeCode:", err?.closeCode);
        console.error("[DreamScape] Error closeReason:", err?.closeReason);
        try { console.error("[DreamScape] Error JSON:", JSON.stringify(e)); } catch { /* not serialisable */ }

        // Retry once on transient WebSocket close errors (e.g. first-connection failures)
        const isTransient =
          err?.name === "SessionConnectionError" &&
          typeof err?.closeCode === "number" &&
          err.closeCode !== 1000 &&
          err.closeCode !== 4000 &&  // 4000 = bad agent ID / auth — not retryable
          err.closeCode !== 4001 &&
          err.closeCode !== 4003;

        if (!isRetry && isTransient) {
          console.warn("[DreamScape] Transient connection error (closeCode:", err?.closeCode, ") — retrying in 2s...");
          setError("Connecting...");
          await new Promise<void>(res => window.setTimeout(res, 2000));
          setError(null);
          return attemptStart(true);
        }

        const msg = err?.message ?? String(e);
        setError(`Could not start the voice session. ${msg}`);
        setStartLocked(false);
        releaseDreamTapLockEarly();
      }
    };

    await attemptStart();
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
    setReportError(null);
    setReportNotice(null);
    setReportNoticeKind("info");

    const id = dreamConvIdRef.current || dreamConversationId || undefined;
    const summary = buildFallbackConversationSummary();
    const payload = {
      name: firstName.trim(),
      email: email.trim(),
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
    setReportError(res.error ?? "Something went wrong generating your report.");
  }, [buildFallbackConversationSummary, dreamConversationId, email, firstName]);

  const canStart = hasAgentId;

  if (reportHtml) {
    return (
      <div style={{ background: "#07090f", width: "100%" }}>
        <div className="flex items-center justify-between gap-4 px-6 py-4" style={{ borderBottom: "1px solid rgba(201,153,58,0.15)" }}>
          <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-[#c9973a]/80">
            Vision Report™ — {firstName.trim()}
          </p>
          <button
            type="button"
            onClick={() => {
              const blob = new Blob([reportHtml], { type: "text/html" });
              const url = URL.createObjectURL(blob);
              window.open(url, "_blank", "noopener,noreferrer");
            }}
            className="inline-flex items-center gap-2 rounded-full border border-[#c9993a]/60 bg-[#c9993a]/10 px-4 py-1.5 text-xs font-semibold text-[#c9993a] transition hover:bg-[#c9993a]/20"
          >
            ↗ Open in new tab
          </button>
        </div>
        <iframe
          title="Vision Report™"
          srcDoc={reportHtml}
          style={{ width: "100%", minHeight: "100vh", border: "none", display: "block" }}
          sandbox="allow-same-origin allow-popups"
        />
      </div>
    );
  }

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
            {gateError ? <p className="text-sm text-red-400">{gateError}</p> : null}
            <button
              type="button"
              disabled={!firstName.trim() || !email.trim() || !email.includes("@")}
              className="anydoor-btn-gold disabled:opacity-50 disabled:pointer-events-none"
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

        {showPostCall && !reportHtml ? (
          <div className="dreamscape-thanks-fade dreamscape-generate-wrap mt-8 space-y-5 text-center">
            <p
              className="text-xl font-light text-[#e8eef5]"
              style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}
            >
              Your vision session is complete{firstName.trim() ? `, ${firstName.trim()}` : ""}.
            </p>
            <p className="text-sm leading-relaxed text-white/55">
              Amelia captured everything. Your Vision Report™ is ready to generate.
            </p>
            <button
              type="button"
              disabled={reportLoading}
              onClick={() => void generateReport()}
              className="dreamscape-generate-btn anydoor-btn-gold disabled:opacity-60"
            >
              {reportLoading ? (
                <span className="inline-flex items-center justify-center gap-3">
                  <span className="dreamscape-report-loading-dot" aria-hidden />
                  Building your Vision Report...
                </span>
              ) : (
                "✦ Generate My Vision Report"
              )}
            </button>
            {reportNotice ? (
              <p
                className={
                  reportNoticeKind === "success"
                    ? "text-sm text-emerald-400/90"
                    : "text-sm text-amber-200/90"
                }
              >
                {reportNotice}
              </p>
            ) : null}
            {reportError ? (
              <div className="space-y-3">
                <p className="text-sm text-red-400/90">{reportError}</p>
                <button
                  type="button"
                  onClick={() => void generateReport()}
                  className="text-xs font-medium text-[#c9993a] underline underline-offset-2 hover:text-[#e8b84b]"
                >
                  Try again →
                </button>
              </div>
            ) : null}
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
