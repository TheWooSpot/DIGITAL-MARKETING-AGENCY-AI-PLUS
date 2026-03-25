import { useCallback, useEffect, useRef, useState } from "react";
import Vapi from "@vapi-ai/web";
import type { DiagnosticResult } from "./DiagnosticForm";
import { serviceName } from "./diagnosticCatalog";

export const RECEPTION_ASSISTANT_ID = "4fa66663-1e58-416f-a137-5b0547300e05";

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
 * Single Vapi client for diagnostic / shared-report flows (Reception assistant + variableValues).
 */
export function useDiagnosticVapiCall(result: DiagnosticResult): DiagnosticVapiCall {
  const publicKey = (import.meta.env.VITE_VAPI_PUBLIC_KEY as string | undefined)?.trim() ?? "";
  const hasPublicKey = publicKey.length > 0;
  const [isCallActive, setIsCallActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const vapiRef = useRef<Vapi | null>(null);

  useEffect(() => {
    if (!hasPublicKey) return;

    const vapi = new Vapi(publicKey);
    vapiRef.current = vapi;

    vapi.on("call-start", () => {
      setIsCallActive(true);
      setError(null);
    });
    vapi.on("call-end", () => setIsCallActive(false));

    vapi.on("error", (e: unknown) => {
      const msg = toUserFriendlyMessage(extractErrorMessage(e));
      console.error("[Vapi diagnostic]", e);
      setError(msg);
      setIsCallActive(false);
    });

    vapi.on("call-start-failed", (e: unknown) => {
      const errObj = e as { error?: unknown };
      const msg =
        typeof errObj?.error === "string"
          ? toUserFriendlyMessage(errObj.error)
          : toUserFriendlyMessage(extractErrorMessage(e));
      console.error("[Vapi diagnostic] call-start-failed", e);
      setError(msg);
      setIsCallActive(false);
    });

    return () => {
      vapi.stop();
      vapiRef.current = null;
    };
  }, [hasPublicKey, publicKey]);

  const start = useCallback(() => {
    if (!hasPublicKey) {
      setError("Voice is not configured. Add VITE_VAPI_PUBLIC_KEY and redeploy.");
      return;
    }
    setError(null);
    const variableValues = buildAssistantVariableValues(result);
    vapiRef.current?.start(RECEPTION_ASSISTANT_ID, {
      maxDurationSeconds: 420,
      variableValues,
    });
  }, [hasPublicKey, result]);

  const end = useCallback(() => {
    vapiRef.current?.stop();
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { publicKey, hasPublicKey, isCallActive, error, start, end, clearError };
}
