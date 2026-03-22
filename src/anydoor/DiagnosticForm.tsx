import { useState } from "react";
import { DiagnosticLoadingOverlay, runLoadingStages } from "./DiagnosticLoadingOverlay";
import { generateShareToken, getReportShareBaseUrl } from "./lib/diagnosticShare";
import { generateReportLink } from "@/utils/urls";

/** Same-origin proxy on Vercel by default; override with VITE_DIAGNOSTIC_URL (full Edge Function URL). */
function getProspectDiagnosticUrl(): string {
  const fromEnv = (import.meta.env.VITE_DIAGNOSTIC_URL as string | undefined)?.trim();
  if (fromEnv) return fromEnv;
  return "/api/prospect-diagnostic";
}

/** Optional row when API returns full category breakdown (otherwise derived client-side). */
export interface DiagnosticCategoryReport {
  id: string;
  name: string;
  score: number;
  trend: "up" | "down" | "flat";
  items: Array<{ ok: boolean; label: string; finding: string }>;
}

export interface DiagnosticResult {
  business_name: string;
  industry: string;
  estimated_size?: string;
  business_address?: string;
  business_phone?: string;
  pages_checked?: number;
  scan_date?: string;
  benchmark_message?: string;
  benchmark_region?: string;
  category_reports?: DiagnosticCategoryReport[];
  scores: {
    visibility: number;
    engagement: number;
    conversion: number;
    overall: number;
  };
  detected_gaps: Array<{
    service_id: number;
    service_name?: string;
    gap_description: string;
    priority: "high" | "medium" | "low" | string;
  }>;
  recommended_services:
    | number[]
    | Array<{
        service_id: number;
        service_name?: string;
        reason?: string;
      }>;
  recommended_tier: string;
  prospect_summary: string;
  estimated_monthly_value: number;
  _meta?: {
    duration_ms?: number;
    saved_to?: string;
    service_catalog_version?: string;
  };
  share_token?: string;
  /** Canonical public report URL from the API (production host), not derived from window.location. */
  share_url?: string;
  /** layer5_prospects.id — used with permanent /report/{id}?k= links */
  prospect_id?: string;
}

interface DiagnosticFormProps {
  onResult: (result: DiagnosticResult, ctx: { submittedUrl: string }) => void;
  onError: (message: string) => void;
  /** Pre-fill URL (e.g. from ?url= on /doors/url-diagnostic) */
  initialUrl?: string;
}

export function DiagnosticForm({ onResult, onError, initialUrl = "" }: DiagnosticFormProps) {
  const [url, setUrl] = useState(initialUrl);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState(0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      onError("Please enter your website URL.");
      return;
    }
    setLoading(true);
    setLoadingStage(0);
    setLoadingProgress(0);
    onError("");
    const shareToken = generateShareToken();

    const apiPromise = fetch(getProspectDiagnosticUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: trimmedUrl,
        ...(email.trim() ? { email: email.trim() } : {}),
        share_token: shareToken,
      }),
    }).then(async (res) => {
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      return { ok: res.ok, data };
    });

    try {
      const out = await runLoadingStages(apiPromise, (stageIndex, progress) => {
        setLoadingStage(stageIndex);
        setLoadingProgress(progress);
      });

      if (!out.ok) {
        const msg =
          typeof out.data === "object" && out.data && "error" in out.data
            ? String((out.data as { error?: string }).error ?? "")
            : "";
        onError(msg || "Request failed");
        return;
      }

      const data = out.data as DiagnosticResult & {
        share_token?: string;
        share_url?: string;
        prospect_id?: string;
      };
      const shareUrlFromApi =
        typeof data.share_url === "string" && data.share_url.trim().length > 0 ? data.share_url.trim() : undefined;
      const prospectId = typeof data.prospect_id === "string" && data.prospect_id.trim() ? data.prospect_id.trim() : undefined;
      const builtLink = generateReportLink({
        siteBaseUrl: getReportShareBaseUrl(),
        prospectId,
        shareToken: data.share_token ?? shareToken,
      });
      const fallbackShareUrl = shareUrlFromApi ?? (builtLink.trim() ? builtLink : undefined);
      onResult(
        {
          ...data,
          share_token: data.share_token ?? shareToken,
          share_url: fallbackShareUrl,
          prospect_id: prospectId,
        },
        { submittedUrl: trimmedUrl }
      );
    } catch (err) {
      onError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
      setLoadingStage(0);
      setLoadingProgress(0);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="relative mx-auto w-full max-w-md space-y-4">
      <DiagnosticLoadingOverlay active={loading} stageIndex={loadingStage} progress={loadingProgress} />
      <div>
        <label htmlFor="url" className="mb-1 block text-sm font-medium text-[#c9973a]">
          Website URL
        </label>
        <input
          id="url"
          type="text"
          placeholder="yourbusiness.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={loading}
          className="w-full rounded-lg border border-white/[0.08] bg-[#07080d] px-4 py-3 text-[#e8eef5] placeholder:text-white/35 focus:border-[#c9973a]/50 focus:outline-none focus:ring-2 focus:ring-[#c9973a]/30 disabled:opacity-60"
        />
      </div>
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-white/50">
          Email <span className="text-[#6b7280]">(optional)</span>
        </label>
        <input
          id="email"
          type="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          className="w-full rounded-lg border border-white/[0.08] bg-[#07080d] px-4 py-3 text-[#e8eef5] placeholder:text-white/35 focus:border-[#c9973a]/50 focus:outline-none focus:ring-2 focus:ring-[#c9973a]/30 disabled:opacity-60"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-[#c9973a] px-6 py-3 font-semibold text-[#07080d] transition-colors hover:bg-[#c9973a]/90 focus:outline-none focus:ring-2 focus:ring-[#c9973a] focus:ring-offset-2 focus:ring-offset-[#07080d] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Analyzing…" : "Get free diagnostic"}
      </button>
    </form>
  );
}
