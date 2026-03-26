import { useCallback, useEffect, useState } from "react";
import type { DiagnosticResult } from "./DiagnosticForm";
import { serviceName } from "./diagnosticCatalog";
import { vapi } from "@/lib/vapiClient";

/**
 * Evaluation Specialist — Jordan (Tap to Talk on AnyDoor diagnostic / shared `/report/:token`). Not Reception/Aria.
 * Override with `VITE_VAPI_ASSISTANT_ID` on Vercel. Jordan’s ElevenLabs **ConvAI agent** is `agent_1001kmgc4g9jey8se6e0f6tb00xy` — Vapi cannot use that string as `voice.voiceId`; in the ElevenLabs agent editor, copy the **Voice ID** (TTS id) and set it on this assistant in the Vapi dashboard (Voice → ElevenLabs → that id).
 */
export const EVALUATION_SPECIALIST_ASSISTANT_ID = "e48ee900-bfb0-4ee6-a645-e89a08230a99";

/** Assistant UUID for `vapi.start()` — env wins so production can swap without a code change. */
export function getEvaluationSpecialistAssistantId(): string {
  const fromEnv = (import.meta.env.VITE_VAPI_ASSISTANT_ID as string | undefined)?.trim();
  return fromEnv || EVALUATION_SPECIALIST_ASSISTANT_ID;
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
  if (!e) return "Something went wrong";
  if (typeof e === "string") return e;
  if (e instanceof Error) return e.message;
  const obj = e as Record<string, unknown>;
  if (obj.error && typeof obj.error === "object" && obj.error !== null) {
    const err = obj.error as Record<string, unknown>;
    if (typeof err.message === "string") return err.message;
  }
  if (typeof obj.error === "string") return obj.error;
  if (typeof obj.message === "string") return obj.message;
  return "Something went wrong. Check the browser console (F12) for details.";
}

function toUserFriendlyMessage(msg: unknown): string {
  const str = typeof msg === "string" ? msg : String(msg ?? "");
  const lower = str.toLowerCase();
  if (lower.includes("microphone") || lower.includes("permission") || lower.includes("not-allowed")) {
    return "Microphone access denied. Please allow microphone permission in your browser and try again.";
  }
  if (lower.includes("invalid") && lower.includes("key")) {
    return "Invalid API key. Set VITE_VAPI_PUBLIC_KEY in .env.local / Vercel and rebuild.";
  }
  if (lower.includes("assistant") && (lower.includes("not found") || lower.includes("invalid"))) {
    return "Assistant not found. The assistant may have been removed or the ID changed.";
  }
  return str;
}

export type DiagnosticVapiCall = {
  publicKey: string;
  hasPublicKey: boolean;
  isCallActive: boolean;
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
    };

    const onCallStartFailed = (e: unknown) => {
      const errObj = e as { error?: unknown };
      const msg =
        typeof errObj?.error === "string"
          ? toUserFriendlyMessage(errObj.error)
          : toUserFriendlyMessage(extractErrorMessage(e));
      console.error("[Vapi diagnostic report / Evaluation Specialist] call-start-failed", e);
      setError(msg);
      setIsCallActive(false);
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
    setError(null);
    const variableValues = buildAssistantVariableValues(result);
    vapi?.start(getEvaluationSpecialistAssistantId(), {
      maxDurationSeconds: 420,
      variableValues,
    });
  }, [hasPublicKey, result]);

  const end = useCallback(() => {
    vapi?.stop();
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { publicKey, hasPublicKey, isCallActive, error, start, end, clearError };
}
