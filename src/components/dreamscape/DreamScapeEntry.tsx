import { useCallback, useEffect, useMemo, useState } from "react";
import Vapi from "@vapi-ai/web";
import { Mic, PhoneOff } from "lucide-react";
import { appendVapiAssistantKeyHint, extractVapiErrorMessage } from "@/lib/vapiErrors";
import { acquireVapiTapLock, releaseVapiTapLockEarly } from "@/lib/vapiTapLock";

/** DreamScape™ Amelia — set `VITE_DREAMSCAPE_ASSISTANT_ID` in env (Vapi dashboard assistant id). */
const DREAMSCAPE_ASSISTANT_ID =
  (import.meta.env.VITE_DREAMSCAPE_ASSISTANT_ID as string | undefined)?.trim() ?? "";

function extractErr(e: unknown): string {
  return appendVapiAssistantKeyHint(extractVapiErrorMessage(e));
}

/**
 * Door 7 — DreamScape™ entry: Vapi voice session with Amelia (warm card + pulsing orb while active).
 */
export default function DreamScapeEntry() {
  const hasPublicKey = Boolean((import.meta.env.VITE_VAPI_PUBLIC_KEY as string | undefined)?.trim());

  /** Dedicated client for Door 7 — `VITE_VAPI_PUBLIC_KEY` (trimmed so pasted keys with newlines work). */
  const vapi = useMemo(() => {
    const pub = import.meta.env.VITE_VAPI_PUBLIC_KEY as string | undefined;
    if (!pub?.trim()) return null;
    return new Vapi((import.meta.env.VITE_VAPI_PUBLIC_KEY as string).trim());
  }, []);
  const hasAssistantId = DREAMSCAPE_ASSISTANT_ID.length > 0;
  const canStart = hasPublicKey && hasAssistantId && vapi !== null;
  const [isCallActive, setIsCallActive] = useState(false);
  const [startLocked, setStartLocked] = useState(false);
  const [showThanks, setShowThanks] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const client = vapi;
    if (!canStart || !client) return;
    const onStart = () => {
      setIsCallActive(true);
      setShowThanks(false);
      setError(null);
    };
    const onEnd = () => {
      setIsCallActive(false);
      setShowThanks(true);
    };
    const onErr = (e: unknown) => {
      setError(extractErr(e));
      setIsCallActive(false);
      setStartLocked(false);
      releaseVapiTapLockEarly();
    };
    client.on("call-start", onStart);
    client.on("call-end", onEnd);
    client.on("error", onErr);
    client.on("call-start-failed", onErr);
    return () => {
      client.removeListener("call-start", onStart);
      client.removeListener("call-end", onEnd);
      client.removeListener("error", onErr);
      client.removeListener("call-start-failed", onErr);
    };
  }, [canStart, vapi]);

  const start = useCallback(() => {
    if (!canStart || !vapi) {
      setError(
        !hasPublicKey
          ? "Add VITE_VAPI_PUBLIC_KEY to your environment and rebuild."
          : !hasAssistantId
            ? "Add VITE_DREAMSCAPE_ASSISTANT_ID to your environment and rebuild."
            : "Voice client could not be initialized.",
      );
      return;
    }
    if (!acquireVapiTapLock()) return;
    setStartLocked(true);
    window.setTimeout(() => setStartLocked(false), 3000);
    setError(null);
    setShowThanks(false);
    vapi.start(DREAMSCAPE_ASSISTANT_ID, {
      maxDurationSeconds: 600,
    });
  }, [canStart, vapi, hasPublicKey, hasAssistantId]);

  const end = useCallback(() => {
    try {
      vapi?.stop();
    } finally {
      setIsCallActive(false);
      setShowThanks(true);
    }
  }, [vapi]);

  return (
    <div className="dreamscape-entry-card relative mx-auto w-full max-w-xl overflow-hidden rounded-xl border border-[#c9973a]/45 bg-[#07080d] px-6 py-10 shadow-[0_0_48px_rgba(201,151,58,0.12)] sm:px-10">
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

        {!canStart ? (
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

        <div className="mt-8 flex min-h-[140px] flex-col items-center justify-center gap-6">
          {isCallActive ? (
            <>
              <div className="dreamscape-voice-orb" aria-hidden />
              <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-[#c9973a]/80">Session in progress</p>
            </>
          ) : null}

          {!isCallActive && !showThanks ? (
            <button
              type="button"
              disabled={startLocked}
              onClick={start}
              className="inline-flex min-w-[240px] items-center justify-center rounded-lg border border-[#c9973a]/60 bg-[#c9973a]/15 px-8 py-3.5 text-sm font-semibold uppercase tracking-[0.2em] text-[#c9973a] transition hover:border-[#c9973a] hover:bg-[#c9973a]/25 disabled:pointer-events-none disabled:opacity-50"
            >
              <Mic className="mr-2 h-4 w-4" aria-hidden />
              Begin Your Vision Session
            </button>
          ) : null}

          {isCallActive ? (
            <button
              type="button"
              onClick={end}
              className="inline-flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-5 py-2.5 text-sm font-medium text-red-400"
            >
              <PhoneOff className="h-4 w-4" aria-hidden />
              End session
            </button>
          ) : null}
        </div>

        {!isCallActive && !showThanks ? (
          <p className="mt-6 text-[11px] leading-relaxed text-white/40">
            Voice conversation · 5–8 minutes · No preparation needed
          </p>
        ) : null}

        {showThanks ? (
          <p
            className="dreamscape-thanks-fade mt-8 text-base font-light leading-relaxed text-[#e8eef5]/95"
            style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}
          >
            Your vision has been captured. We&apos;ll be in touch.
          </p>
        ) : null}
      </div>
    </div>
  );
}
