import { useCallback, useEffect, useState } from "react";
import { vapi } from "@/lib/vapiClient";
import { acquireVapiTapLock, releaseVapiTapLockEarly } from "@/lib/vapiTapLock";
import { appendVapiAssistantKeyHint, extractVapiErrorMessage } from "@/lib/vapiErrors";

/**
 * Vapi Tap to Talk for /partner-brief — uses the same shared `vapi` client and
 * VITE_VAPI_ASSISTANT_ID as the diagnostic page. No ElevenLabs ConvAI widget needed.
 */

function extractEventType(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const obj = value as Record<string, unknown>;
  const direct = typeof obj.type === "string" ? obj.type : "";
  const nested = obj.error && typeof obj.error === "object"
    ? typeof (obj.error as Record<string, unknown>).type === "string"
      ? ((obj.error as Record<string, unknown>).type as string)
      : ""
    : "";
  return (direct || nested).toLowerCase();
}

function toUserFriendlyMessage(e: unknown): string {
  const eventType = extractEventType(e);
  if (eventType === "daily-error" || eventType === "ejected") {
    return "Your call has ended. Tap to start again.";
  }
  const str = extractVapiErrorMessage(e);
  const lower = str.toLowerCase();
  if (
    lower.includes("meeting has ended") ||
    lower.includes("\"type\":\"ejected\"") ||
    lower.includes("\"daily-error\"") ||
    (lower.includes("daily") && lower.includes("ejected"))
  ) {
    return "Your call has ended. Tap to start again.";
  }
  if (lower.includes("microphone") || lower.includes("permission") || lower.includes("not-allowed")) {
    return "Microphone access denied — please allow microphone permission in your browser and try again.";
  }
  if (lower.includes("invalid") && lower.includes("key")) {
    return "Voice is not configured. Contact hello@socialutely.com.";
  }
  if (lower.includes("assistant") && (lower.includes("not found") || lower.includes("invalid"))) {
    return "Voice assistant unavailable. Contact hello@socialutely.com.";
  }
  return appendVapiAssistantKeyHint(str);
}

export type PartnerBriefVapiCall = {
  hasPublicKey: boolean;
  isCallActive: boolean;
  startLocked: boolean;
  error: string | null;
  start: () => void;
  end: () => void;
  clearError: () => void;
};

export function usePartnerBriefVapiCall(): PartnerBriefVapiCall {
  const publicKey = (import.meta.env.VITE_VAPI_PUBLIC_KEY as string | undefined)?.trim() ?? "";
  const hasPublicKey = publicKey.length > 0;
  const [isCallActive, setIsCallActive] = useState(false);
  const [startLocked, setStartLocked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const client = vapi;
    if (!hasPublicKey || !client) return;

    const onCallStart = () => { setIsCallActive(true); setError(null); };
    const onCallEnd = (event?: unknown) => {
      setIsCallActive(false);
      const eventType = extractEventType(event);
      if (eventType === "daily-error" || eventType === "ejected") {
        setError("Your call has ended. Tap to start again.");
      } else {
        setError("Call complete.");
      }
    };
    const onMessage = (payload: unknown) => {
      const raw = typeof payload === "string" ? payload : JSON.stringify(payload ?? {});
      const lower = raw.toLowerCase();
      if (
        lower.includes("meeting has ended") ||
        lower.includes("\"type\":\"ejected\"") ||
        lower.includes("\"daily-error\"") ||
        (lower.includes("daily") && lower.includes("ejected"))
      ) {
        setError("Your call has ended. Tap to start again.");
      }
    };
    const onError = (e: unknown) => {
      setError(toUserFriendlyMessage(e));
      setIsCallActive(false);
      setStartLocked(false);
      releaseVapiTapLockEarly();
    };
    const onCallStartFailed = (e: unknown) => {
      setError(toUserFriendlyMessage(e));
      setIsCallActive(false);
      setStartLocked(false);
      releaseVapiTapLockEarly();
    };

    client.on("call-start", onCallStart);
    client.on("call-end", onCallEnd);
    client.on("message", onMessage);
    client.on("error", onError);
    client.on("call-start-failed", onCallStartFailed);

    return () => {
      client.removeListener("call-start", onCallStart);
      client.removeListener("call-end", onCallEnd);
      client.removeListener("message", onMessage);
      client.removeListener("error", onError);
      client.removeListener("call-start-failed", onCallStartFailed);
      client.stop();
    };
  }, [hasPublicKey]);

  const start = useCallback(() => {
    if (!hasPublicKey) {
      setError("Voice is not configured. Contact hello@socialutely.com.");
      return;
    }
    // Spuds — Partner Briefs assistant (same org as VITE_VAPI_PUBLIC_KEY / Jordan)
    // Extra .replace() strips \r\n that Vercel CLI may inject into the env var value on Windows
    const assistantId =
      (import.meta.env.VITE_PARTNER_BRIEF_VAPI_ASSISTANT_ID as string | undefined)
        ?.replace(/[\r\n]/g, "").trim() ||
      (import.meta.env.VITE_VAPI_ASSISTANT_ID as string | undefined)?.trim() ||
      "afec7622-84c3-418d-b4c6-9d35653d6bc5";
    if (!assistantId) {
      setError("Voice assistant is not configured. Set VITE_PARTNER_BRIEF_VAPI_ASSISTANT_ID in Vercel and rebuild.");
      return;
    }
    if (!acquireVapiTapLock()) return;
    setStartLocked(true);
    window.setTimeout(() => setStartLocked(false), 3000);
    setError(null);
    vapi?.start(assistantId, {
      maxDurationSeconds: 1500,
      variableValues: {
        partner_name: ((window as Record<string, unknown>)._pbPartnerName as string) || "",
        partner_first_name: ((window as Record<string, unknown>)._pbPartnerFirstName as string) || "",
        roundtable_active: ((window as Record<string, unknown>)._pbRoundtableActive as string) || "false",
      },
    });
  }, [hasPublicKey]);

  const end = useCallback(() => { vapi?.stop(); }, []);
  const clearError = useCallback(() => setError(null), []);

  return { hasPublicKey, isCallActive, startLocked, error, start, end, clearError };
}
