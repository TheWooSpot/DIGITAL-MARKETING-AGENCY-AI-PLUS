import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, PhoneOff } from "lucide-react";
import { useSession } from "@/context/SessionContext";
import { invokeVisionReport } from "@/lib/dreamscape/invokeVisionReport";
import { hasVapiPublicKey, vapi } from "@/lib/vapiClient";
import { logEvent } from "@/lib/diagnosticEvents";

const DEFAULT_AMELIA_ASSISTANT_ID = "0693b0d9-6e89-436f-bdbd-9fe25cc1bf3c";

type EmailDomainContext = {
  domain_type: "business" | "consumer" | "unknown";
  business_name: string | null;
  industry: string | null;
  recent_observation: string | null;
  name_guardrail: "ok" | "flagged";
  name_initial: string;
};

function getEmailDomainContextUrl(): string {
  const base = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
  const anon = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();
  if (!base || !anon) return "";
  return `${base.replace(/\/$/, "")}/functions/v1/email-domain-context`;
}

async function fetchEmailDomainContext(name: string, email: string): Promise<EmailDomainContext> {
  const url = getEmailDomainContextUrl();
  if (!url) {
    return {
      domain_type: "unknown",
      business_name: null,
      industry: null,
      recent_observation: null,
      name_guardrail: "ok",
      name_initial: name.trim().charAt(0).toUpperCase() || "U",
    };
  }
  const anon = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? "";
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${anon}`,
    },
    body: JSON.stringify({ name, email }),
  });
  if (!res.ok) throw new Error(`email-domain-context failed (${res.status})`);
  const data = (await res.json()) as Partial<EmailDomainContext>;
  return {
    domain_type: data.domain_type === "business" || data.domain_type === "consumer" ? data.domain_type : "unknown",
    business_name: data.business_name ?? null,
    industry: data.industry ?? null,
    recent_observation: data.recent_observation ?? null,
    name_guardrail: data.name_guardrail === "flagged" ? "flagged" : "ok",
    name_initial: ((data.name_initial ?? name.trim().charAt(0)) || "U").toUpperCase(),
  };
}

/**
 * Door 7 — DreamScape™ entry: pre-gate form, ElevenLabs voice session, Vision Report™ generation.
 */
export default function DreamScapeEntry() {
  const { mergeSession, name: sessionName, email: sessionEmail, url: sessionUrl } = useSession();

  const ameliaAssistantId =
    (import.meta.env.VITE_DREAMSCAPE_ASSISTANT_ID as string | undefined)?.trim() || DEFAULT_AMELIA_ASSISTANT_ID;
  const hasAgentId = hasVapiPublicKey && !!ameliaAssistantId;

  const [firstName, setFirstName] = useState(() => sessionName.split(/\s+/)[0] || sessionName || "");
  const [email, setEmail] = useState(sessionEmail);
  const [gateError, setGateError] = useState<string | null>(null);

  const [sessionReady, setSessionReady] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [startLocked, setStartLocked] = useState(false);
  const [showPostCall, setShowPostCall] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fallbackTranscriptRef = useRef<string[]>([]);

  const [reportLoading, setReportLoading] = useState(false);
  const [reportHtml, setReportHtml] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportNotice, setReportNotice] = useState<string | null>(null);
  const [reportNoticeKind, setReportNoticeKind] = useState<"success" | "info">("info");

  const showGenerateReportButton = useCallback(() => {
    setIsCallActive(false);
    setShowPostCall(true);
  }, []);

  useEffect(() => {
    const client = vapi;
    if (!client) return;

    const onMessage = (message: {
      type?: string;
      transcript?: string;
      transcriptType?: string;
      role?: string;
      message?: { content?: string };
    }) => {
      if (message.type === "transcript" && message.transcript && message.transcriptType !== "partial") {
        const role = message.role === "assistant" ? "Amelia" : "Client";
        fallbackTranscriptRef.current.push(`${role}: ${message.transcript.trim()}`);
      }
    };

    const onCallEnd = () => {
      showGenerateReportButton();
    };

    const onError = (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Voice connection error";
      setIsCallActive(false);
      setError(`Voice session error: ${msg}`);
      setStartLocked(false);
      releaseDreamTapLockEarly();
    };

    client.on("message", onMessage);
    client.on("call-end", onCallEnd);
    client.on("error", onError);

    return () => {
      client.removeListener("message", onMessage);
      client.removeListener("call-end", onCallEnd);
      client.removeListener("error", onError);
    };
  }, [showGenerateReportButton]);

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
    setSessionReady(true);
    return true;
  }, [email, firstName, mergeSession, sessionUrl]);

  const start = useCallback(async () => {
    if (!prepareSession()) return;
    if (!hasAgentId) {
      setError("Add VITE_VAPI_PUBLIC_KEY to your environment and rebuild.");
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

    console.log("[DreamScape] Starting Amelia session...");
    try {
      const ctx = await fetchEmailDomainContext(firstName.trim(), email.trim());
      vapi?.start(ameliaAssistantId, {
        variableValues: {
          user_name: firstName.trim(),
          user_name_initial: ctx.name_initial,
          name_guardrail: ctx.name_guardrail,
          domain_type: ctx.domain_type,
          business_name: ctx.business_name ?? "",
          industry: ctx.industry ?? "",
          recent_observation: ctx.recent_observation ?? "",
          email: email.trim(),
        },
      });
      void logEvent("voice_launched", { door: "door-7", event_data: { agent: "amelia" } });
      setIsCallActive(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not start Amelia.";
      setError(`Could not start the voice session. ${msg}`);
      setStartLocked(false);
      releaseDreamTapLockEarly();
    }
  }, [ameliaAssistantId, email, firstName, hasAgentId, prepareSession]);

  const end = useCallback(async () => {
    try {
      await vapi?.stop();
    } catch {
      /* ignore */
    } finally {
      setIsCallActive(false);
      setShowPostCall(true);
    }
  }, []);

  const generateReport = useCallback(async () => {
    setReportLoading(true);
    setReportError(null);
    setReportNotice(null);
    setReportNoticeKind("info");

    const summary = buildFallbackConversationSummary();
    const payload = {
      name: firstName.trim(),
      email: email.trim(),
      conversation_id: undefined,
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
  }, [buildFallbackConversationSummary, email, firstName]);

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
            Voice session unavailable: set <span className="font-mono">VITE_VAPI_PUBLIC_KEY</span> and{" "}
            <span className="font-mono">VITE_DREAMSCAPE_ASSISTANT_ID</span>, then rebuild.
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
