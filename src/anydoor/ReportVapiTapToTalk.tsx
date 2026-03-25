import { useCallback, useEffect, useRef, useState } from "react";
import Vapi from "@vapi-ai/web";
import { Mic, PhoneOff } from "lucide-react";
import type { DiagnosticResult } from "./DiagnosticForm";
import { serviceName } from "./diagnosticCatalog";

/** Reception - Socialutely (same as Hero / VapiVoiceChat). */
const RECEPTION_ASSISTANT_ID = "4fa66663-1e58-416f-a137-5b0547300e05";

function buildAssistantVariableValues(result: DiagnosticResult) {
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

interface ReportVapiTapToTalkProps {
  result: DiagnosticResult;
}

/**
 * Shared report only: starts Vapi web call with diagnostic variables for Reception assistant.
 */
export function ReportVapiTapToTalk({ result }: ReportVapiTapToTalkProps) {
  const publicKey = (import.meta.env.VITE_VAPI_PUBLIC_KEY as string | undefined)?.trim() ?? "";
  const [isCallActive, setIsCallActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const vapiRef = useRef<Vapi | null>(null);

  useEffect(() => {
    if (!publicKey) {
      setError(null);
      return;
    }

    const vapi = new Vapi(publicKey);
    vapiRef.current = vapi;

    vapi.on("call-start", () => {
      setIsCallActive(true);
      setError(null);
    });
    vapi.on("call-end", () => setIsCallActive(false));

    vapi.on("error", (e: unknown) => {
      const msg = toUserFriendlyMessage(extractErrorMessage(e));
      console.error("[Vapi report tap-to-talk]", e);
      setError(msg);
      setIsCallActive(false);
    });

    vapi.on("call-start-failed", (e: unknown) => {
      const errObj = e as { error?: unknown };
      const msg =
        typeof errObj?.error === "string"
          ? toUserFriendlyMessage(errObj.error)
          : toUserFriendlyMessage(extractErrorMessage(e));
      console.error("[Vapi report tap-to-talk] call-start-failed", e);
      setError(msg);
      setIsCallActive(false);
    });

    return () => {
      vapi.stop();
      vapiRef.current = null;
    };
  }, [publicKey]);

  const handleTap = useCallback(() => {
    if (!publicKey) {
      setError("Voice is not configured. Add VITE_VAPI_PUBLIC_KEY and redeploy.");
      return;
    }
    setError(null);
    const variableValues = buildAssistantVariableValues(result);
    vapiRef.current?.start(RECEPTION_ASSISTANT_ID, {
      maxDurationSeconds: 420,
      variableValues,
    });
  }, [publicKey, result]);

  const handleEnd = useCallback(() => {
    vapiRef.current?.stop();
  }, []);

  if (!publicKey) {
    return (
      <div className="no-print mt-4 rounded-lg border border-white/[0.08] bg-[#07080d]/80 px-4 py-3 text-xs text-white/50">
        Tap to Talk is unavailable: add <span className="font-mono text-[#c9973a]/80">VITE_VAPI_PUBLIC_KEY</span> to your
        environment and rebuild.
      </div>
    );
  }

  return (
    <div className="no-print mt-4 rounded-lg border border-[#c9973a]/35 bg-[#07080d]/90 px-4 py-3">
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#c9973a]">Discuss this report</p>
      {error ? (
        <p className="mb-3 text-xs text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        {!isCallActive ? (
          <button
            type="button"
            onClick={handleTap}
            className="inline-flex items-center gap-2 rounded-lg border border-[#c9973a] bg-[#c9973a]/15 px-4 py-2.5 text-sm font-semibold text-[#c9973a] transition hover:bg-[#c9973a]/25"
          >
            <Mic className="h-4 w-4" aria-hidden />
            Tap to Talk
          </button>
        ) : (
          <button
            type="button"
            onClick={handleEnd}
            className="inline-flex items-center gap-2 rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-400 transition hover:bg-red-500/20"
          >
            <PhoneOff className="h-4 w-4" aria-hidden />
            End call
          </button>
        )}
        <p className="text-[11px] leading-snug text-white/45">Up to 7 min — microphone required.</p>
      </div>
    </div>
  );
}
