import { Mic, PhoneOff } from "lucide-react";
import type { DiagnosticVapiCall } from "./useDiagnosticVapiCall";

interface ReportVapiTapToTalkProps {
  vapi: DiagnosticVapiCall;
}

/**
 * Shared report header block: Discuss this report — uses parent `useDiagnosticVapiCall` instance.
 */
export function ReportVapiTapToTalk({ vapi }: ReportVapiTapToTalkProps) {
  const { hasPublicKey, isCallActive, error, start, end } = vapi;

  if (!hasPublicKey) {
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
            onClick={start}
            className="inline-flex items-center gap-2 rounded-lg border border-[#c9973a] bg-[#c9973a]/15 px-4 py-2.5 text-sm font-semibold text-[#c9973a] transition hover:bg-[#c9973a]/25"
          >
            <Mic className="h-4 w-4" aria-hidden />
            Tap to Talk
          </button>
        ) : (
          <button
            type="button"
            onClick={end}
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
