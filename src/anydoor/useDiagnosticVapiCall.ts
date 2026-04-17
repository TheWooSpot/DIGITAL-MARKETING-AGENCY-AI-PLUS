import { useCallback, useEffect, useState } from "react";
import type { DiagnosticResult } from "./DiagnosticForm";
import { serviceName } from "./diagnosticCatalog";
import { vapi } from "@/lib/vapiClient";
import { appendVapiAssistantKeyHint, extractVapiErrorMessage } from "@/lib/vapiErrors";
import { acquireVapiTapLock, releaseVapiTapLockEarly } from "@/lib/vapiTapLock";

/**
 * Evaluation Specialist — Jordan (Tap to Talk on AnyDoor diagnostic / shared `/report/:token`).
 * Set `VITE_VAPI_ASSISTANT_ID` in `.env` / Vercel. For ElevenLabs ConvAI agent ids use
 * `VITE_ELEVENLABS_JORDAN_AGENT_ID` / `VITE_ELEVENLABS_JESSICA_AGENT_ID` only (Vapi TTS uses ElevenLabs **voice** ids from the dashboard, not agent ids).
 */

/** Assistant UUID for `vapi.start()` — must be set via `VITE_VAPI_ASSISTANT_ID` (never hardcode in source). */
export function getEvaluationSpecialistAssistantId(): string {
  return (import.meta.env.VITE_VAPI_ASSISTANT_ID as string | undefined)?.trim() ?? "";
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

/**
 * Shared `vapi` from `@/lib/vapiClient` — listener registration only; no second `new Vapi()`.
 */
export function useDiagnosticVapiCall(result: DiagnosticResult): DiagnosticVapiCall {
  const publicKey = (import.meta.env.VITE_VAPI_PUBLIC_KEY as string | undefined)?.trim() ?? "";
  const hasPublicKey = publicKey.length > 0;
  const [isCallActive, setIsCallActive] = useState(false);
  const [startLocked, setStartLocked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const client = vapi;
    if (!hasPublicKey || !client) return;

    const onCallStart = () => {
      setIsCallActive(true);
      setError(null);
    };
    const onCallEnd = () => setIsCallActive(false);

    const onError = (e: unknown) => {
      const msg = toUserFriendlyMessage(extractErrorMessage(e));
      console.error("[Vapi diagnostic report / Evaluation Specialist]", e);
      setError(msg);
      setIsCallActive(false);
      setStartLocked(false);
      releaseVapiTapLockEarly();
    };

    const onCallStartFailed = (e: unknown) => {
      const msg = toUserFriendlyMessage(extractErrorMessage(e));
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
      client.stop();
    };
  }, [hasPublicKey]);

  const start = useCallback(() => {
    if (!hasPublicKey) {
      setError("Voice is not configured. Add VITE_VAPI_PUBLIC_KEY and redeploy.");
      return;
    }
    const assistantId = getEvaluationSpecialistAssistantId();
    if (!assistantId) {
      setError("Voice assistant is not configured. Set VITE_VAPI_ASSISTANT_ID in .env / Vercel and rebuild.");
      return;
    }
    if (!acquireVapiTapLock()) return;
    setStartLocked(true);
    window.setTimeout(() => setStartLocked(false), 3000);
    setError(null);
    const variableValues = buildAssistantVariableValues(result);
    console.log("[useDiagnosticVapiCall] starting assistantId:", assistantId.slice(0, 8) + "...");
    try {
      vapi?.start(assistantId, {
        maxDurationSeconds: 420,
        variableValues,
      });
    } catch (e) {
      console.error("[useDiagnosticVapiCall] vapi.start() threw:", e);
      setError("Voice connection unavailable. Please try again in a moment.");
      setStartLocked(false);
      releaseVapiTapLockEarly();
    }
  }, [hasPublicKey, result]);

  const end = useCallback(() => {
    vapi?.stop();
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { publicKey, hasPublicKey, isCallActive, startLocked, error, start, end, clearError };
}
