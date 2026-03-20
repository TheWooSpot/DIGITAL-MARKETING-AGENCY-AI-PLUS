"use client";

import { useState } from "react";

// Use same-origin API route to avoid CORS; the route proxies to Supabase Edge Function.
const PROSPECT_DIAGNOSTIC_URL = "/api/prospect-diagnostic";

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
  /** Shown in header when provided by API / enrichment */
  business_address?: string;
  business_phone?: string;
  pages_checked?: number;
  /** ISO date string */
  scan_date?: string;
  /** Overrides auto-generated benchmark line */
  benchmark_message?: string;
  /** Used inside benchmark copy, e.g. "CA" */
  benchmark_region?: string;
  /** Full seven-panel data from crawler/API; if omitted, UI synthesizes from pillar scores + gaps */
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
}

interface DiagnosticFormProps {
  onResult: (result: DiagnosticResult, ctx: { submittedUrl: string }) => void;
  onError: (message: string) => void;
}

export function DiagnosticForm({ onResult, onError }: DiagnosticFormProps) {
  const [url, setUrl] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      onError("Please enter your website URL.");
      return;
    }
    setLoading(true);
    onError("");
    try {
      const res = await fetch(PROSPECT_DIAGNOSTIC_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: trimmedUrl,
          ...(email.trim() ? { email: email.trim() } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        onError(data?.error ?? `Request failed (${res.status})`);
        return;
      }
      onResult(data as DiagnosticResult, { submittedUrl: trimmedUrl });
    } catch (err) {
      onError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto space-y-4">
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
