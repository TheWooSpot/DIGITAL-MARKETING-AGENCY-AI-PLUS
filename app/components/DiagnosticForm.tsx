"use client";

import { useState } from "react";

// Use same-origin API route to avoid CORS; the route proxies to Supabase Edge Function.
const PROSPECT_DIAGNOSTIC_URL = "/api/prospect-diagnostic";

export interface DiagnosticResult {
  business_name: string;
  industry: string;
  estimated_size?: string;
  scores: {
    visibility: number;
    engagement: number;
    conversion: number;
    overall: number;
  };
  detected_gaps: Array<{
    service_id: number;
    gap_description: string;
    priority: string;
  }>;
  recommended_services: number[];
  recommended_tier: string;
  prospect_summary: string;
  estimated_monthly_value: number;
  _meta?: { duration_ms?: number; saved_to?: string };
}

interface DiagnosticFormProps {
  onResult: (result: DiagnosticResult) => void;
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
      onResult(data as DiagnosticResult);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto space-y-4">
      <div>
        <label htmlFor="url" className="block text-sm font-medium text-[#d4a843] mb-1">
          Website URL
        </label>
        <input
          id="url"
          type="text"
          placeholder="yourbusiness.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={loading}
          className="w-full px-4 py-3 rounded-lg bg-[#131a2b] border border-[#1e2a42] text-[#e8eef5] placeholder-[#8b9bb5] focus:outline-none focus:ring-2 focus:ring-[#d4a843] focus:border-transparent disabled:opacity-60"
        />
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-[#8b9bb5] mb-1">
          Email <span className="text-[#6b7280]">(optional)</span>
        </label>
        <input
          id="email"
          type="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          className="w-full px-4 py-3 rounded-lg bg-[#131a2b] border border-[#1e2a42] text-[#e8eef5] placeholder-[#8b9bb5] focus:outline-none focus:ring-2 focus:ring-[#d4a843] focus:border-transparent disabled:opacity-60"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 px-6 rounded-lg bg-[#d4a843] text-[#0b0f1a] font-semibold hover:bg-[#b8923a] focus:outline-none focus:ring-2 focus:ring-[#d4a843] focus:ring-offset-2 focus:ring-offset-[#0b0f1a] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "Analyzing…" : "Get free diagnostic"}
      </button>
    </form>
  );
}
