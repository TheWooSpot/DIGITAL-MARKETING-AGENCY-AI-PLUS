import { useCallback, useEffect, useRef, useState } from "react";
import type { DiagnosticResult } from "./DiagnosticForm";
import { serviceName } from "./diagnosticCatalog";
import { JORDAN_ASSISTANT_ID, vapi } from "@/lib/vapiClient";
import { appendVapiAssistantKeyHint, extractVapiErrorMessage } from "@/lib/vapiErrors";
import { acquireVapiTapLock, releaseVapiTapLockEarly } from "@/lib/vapiTapLock";

/**
 * Evaluation Specialist — Jordan (Tap to Talk on AnyDoor diagnostic / shared `/report/:token`).
 * Set `VITE_VAPI_ASSISTANT_ID` in `.env` / Vercel. For ElevenLabs ConvAI agent ids use
 * `VITE_ELEVENLABS_JORDAN_AGENT_ID` / `VITE_ELEVENLABS_JESSICA_AGENT_ID` only (Vapi TTS uses ElevenLabs **voice** ids from the dashboard, not agent ids).
 */

export function getEvaluationSpecialistAssistantId(): string {
  return JORDAN_ASSISTANT_ID;
}

export function buildAssistantVariableValues(result: DiagnosticResult) {
  const top_gaps =
    result.detected_gaps
      ?.slice(0, 3)
      .map((g) => g.gap_description)
      .filter(Boolean)
      .join("; ") ?? "";

  const raw = result.recommended_services ?? [];
  const recommended_services =
    raw
      .slice(0, 3)
      .map((s) => {
        if (typeof s === "number") return serviceName(s);
        const name = s.service_name?.trim();
        if (name) return name;
        return serviceName(s.service_id);
      })
      .filter(Boolean)
      .join(", ") ?? "";

  return {
    business_name: result.business_name ?? "your business",
    industry: result.industry ?? "your industry",
    overall_score: result.scores?.overall ?? 0,
    recommended_tier: result.recommended_tier ?? "Essentials",
    top_gaps,
    recommended_services,
  };
}

function extractErrorMessage(e: unknown): string {
  return extractVapiErrorMessage(e);
}

function toUserFriendlyMessage(msg: unknown): string {
  const str = typeof msg === "string" ? msg : String(msg ?? "");
  const lower = str.toLowerCase();
  if (
    lower.includes("meeting has ended") ||
    lower.includes("\"type\":\"ejected\"") ||
    lower.includes("\"daily-error\"") ||
    (lower.includes("daily") && lower.includes("ejected"))
  ) {
    return "The conversation has ended. Refresh the page to start over with Mr. Mackleberry, or use the calendar below to schedule a working session.";
  }
  if (lower.includes("microphone") || lower.includes("permission") || lower.includes("not-allowed")) {
    return "Microphone access denied. Please allow microphone permission in your browser and try again.";
  }
  if (!str || str === "undefined" || str === "null") {
    return "Voice connection unavailable. Please try again in a moment.";
  }
  if (lower.includes("invalid") && lower.includes("key")) {
    return "Voice connection unavailable. Please try again in a moment.";
  }
  if (lower.includes("assistant") && (lower.includes("not found") || lower.includes("invalid"))) {
    return "Voice connection unavailable. Please try again in a moment.";
  }
  return "Voice connection unavailable. Please try again in a moment.";
}

export type DiagnosticVapiCall = {
  publicKey: string;
  hasPublicKey: boolean;
  isCallActive: boolean;
  /** True for ~3s after a start attempt — use to disable Tap to Talk while connecting. */
  startLocked: boolean;
  error: string | null;
  start: () => void;
  end: () => void;
  clearError: () => void;
};

type UseDiagnosticVapiCallOptions = {
  onVoiceLaunched?: () => void;
  onVoiceEnded?: (durationSeconds: number) => void;
  getStartConfig?: () => { assistantId: string; variableValues: Record<string, string> } | null;
};

/**
 * Shared `vapi` from `@/lib/vapiClient` — listener registration only; no second client instance.
 */
export function useDiagnosticVapiCall(result: DiagnosticResult, options?: UseDiagnosticVapiCallOptions): DiagnosticVapiCall {
  const publicKey = (import.meta.env.VITE_VAPI_PUBLIC_KEY as string | undefined)?.trim() ?? "";
  const hasPublicKey = publicKey.length > 0;
  const [isCallActive, setIsCallActive] = useState(false);
  const [startLocked, setStartLocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const callStartedAtRef = useRef<number | null>(null);
  const fallbackTriedRef = useRef(false);

  useEffect(() => {
    const client = vapi;
    if (!hasPublicKey || !client) return;

    const onCallStart = () => {
      callStartedAtRef.current = Date.now();
      fallbackTriedRef.current = false;
      setIsCallActive(true);
      setError(null);
      options?.onVoiceLaunched?.();
    };
    const onCallEnd = () => {
      const startedAt = callStartedAtRef.current;
      const durationSeconds = startedAt ? Math.max(0, Math.round((Date.now() - startedAt) / 1000)) : 0;
      callStartedAtRef.current = null;
      setIsCallActive(false);
      options?.onVoiceEnded?.(durationSeconds);
    };

    const onError = (e: unknown) => {
      const msg = appendVapiAssistantKeyHint(toUserFriendlyMessage(extractErrorMessage(e)));
      console.error("[Vapi diagnostic report / Evaluation Specialist]", e);
      setError(msg);
      setIsCallActive(false);
      setStartLocked(false);
      releaseVapiTapLockEarly();
    };

    const onCallStartFailed = (e: unknown) => {
      const msg = appendVapiAssistantKeyHint(toUserFriendlyMessage(extractErrorMessage(e)));
      console.error("[Vapi diagnostic report / Evaluation Specialist] call-start-failed", e);
      setError(msg);
      setIsCallActive(false);
      setStartLocked(false);
      releaseVapiTapLockEarly();
    };

    client.on("call-start", onCallStart);
    client.on("call-end", onCallEnd);
    client.on("error", onError);
    client.on("call-start-failed", onCallStartFailed);

    return () => {
      if (!client) return;
      client.removeListener("call-start", onCallStart);
      client.removeListener("call-end", onCallEnd);
      client.removeListener("error", onError);
      client.removeListener("call-start-failed", onCallStartFailed);
    };
  }, [hasPublicKey, options]);

  const start = useCallback(() => {
    void (async () => {
      if (!hasPublicKey) {
        setError("Voice is not configured. Add VITE_VAPI_PUBLIC_KEY and redeploy.");
        return;
      }
      const startConfig = options?.getStartConfig?.() ?? null;
      const assistantId = startConfig?.assistantId || getEvaluationSpecialistAssistantId();
      if (!assistantId) {
        setError("Voice assistant is not configured.");
        return;
      }
      if (!acquireVapiTapLock()) return;
      fallbackTriedRef.current = false;
      setStartLocked(true);
      window.setTimeout(() => setStartLocked(false), 3000);
      setError(null);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
      } catch {
        alert("Microphone access required. Please allow and try again.");
        setStartLocked(false);
        releaseVapiTapLockEarly();
        return;
      }
      const variableValues = startConfig?.variableValues ?? buildAssistantVariableValues(result);
      console.log("[useDiagnosticVapiCall] starting assistantId:", assistantId.slice(0, 8) + "...");
      const attemptStart = async (attempt: number): Promise<void> => {
        try {
          await vapi?.start(assistantId, {
            maxDurationSeconds: 1080,
            variableValues,
            backgroundSpeechDenoisingPlan: {
              smartDenoisingPlan: { enabled: false },
              fourierDenoisingPlan: { enabled: false },
            },
          });
        } catch (e) {
          const msgRaw = extractErrorMessage(e);
          const msgLower = (typeof msgRaw === "string" ? msgRaw : String(msgRaw ?? "")).toLowerCase();
          const isKrispRace =
            msgLower.includes("krisp") ||
            msgLower.includes("didiniterror") ||
            msgLower.includes("cannot read properties of null");
          if (isKrispRace && attempt === 1) {
            console.warn("[useDiagnosticVapiCall] Krisp init race on attempt 1, retrying in 500ms");
            await new Promise((r) => setTimeout(r, 500));
            return attemptStart(2);
          }
          console.error(`[useDiagnosticVapiCall] vapi.start() threw on attempt ${attempt}:`, e);
          setError("Voice connection unavailable. Please try again in a moment.");
          setStartLocked(false);
          releaseVapiTapLockEarly();
        }
      };
      void attemptStart(1);
    })();
  }, [hasPublicKey, options, result]);

  const end = useCallback(() => {
    vapi?.stop();
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { publicKey, hasPublicKey, isCallActive, startLocked, error, start, end, clearError };
}
