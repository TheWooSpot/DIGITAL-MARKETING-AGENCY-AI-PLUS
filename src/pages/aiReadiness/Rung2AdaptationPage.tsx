import { useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { submitAiReadinessWaitlist } from "@/lib/aiReadiness/waitlistSubmit";
import {
  AiReadinessLabsShell,
  ARL_BG,
  ARL_BORDER,
  ARL_CARD,
  ARL_DIM,
  ARL_GOLD,
  ARL_WHITE,
} from "./AiReadinessLabsShell";

const MODULES = [
  {
    title: "AI Activation Baseline",
    body: "Map where you are, pick your first area",
  },
  {
    title: "Your First Automated Workflow",
    body: "One trigger-based sequence running without you",
  },
  {
    title: "Connecting AI to Your Systems",
    body: "Link AI to CRM, email, calendar",
  },
  {
    title: "Revenue Alignment",
    body: "Map one AI workflow to a revenue outcome",
  },
  {
    title: "Review, Measure, Sustain",
    body: "Document what changed, lock in the habit",
  },
];

const PACKAGES = [
  "Core (base): Full course · 90 days · async Q&A",
  "Core + 1 Session: Base + 1 live onboarding session",
  "Core + 3 Sessions: Base + 3 check-ins at 30/60/90 days",
];

export default function Rung2AdaptationPage() {
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const em = email.trim();
    if (!em || !em.includes("@")) {
      setError("Enter a valid email.");
      return;
    }
    setBusy(true);
    const res = await submitAiReadinessWaitlist({
      name: firstName.trim(),
      email: em,
      url: url.trim() || null,
      rung: 2,
      package_preference: null,
      source: "rung2-landing",
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setDone(true);
  }

  return (
    <AiReadinessLabsShell eyebrow="AI Readiness Labs™ · Rung 2">
      <p className="font-mono text-[10px] uppercase tracking-[0.35em]" style={{ color: ARL_GOLD }}>
        AI Readiness Labs™
      </p>
      <h1 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl" style={{ fontFamily: "'Syne', system-ui, sans-serif" }}>
        Rung 2 — Adaptation
      </h1>
      <p className="mt-2 text-lg font-medium" style={{ color: ARL_WHITE }}>
        AI is running.
      </p>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed" style={{ color: ARL_DIM }}>
        The self-paced program that turns AI experimentation into operations you can count on.
      </p>

      <section
        className="mt-10 rounded-xl border p-6 sm:p-8"
        style={{ backgroundColor: ARL_CARD, borderColor: ARL_BORDER }}
      >
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em]" style={{ color: ARL_GOLD }}>
          Program details
        </h2>
        <ul className="mt-4 space-y-2 text-sm" style={{ color: ARL_DIM }}>
          <li>
            <span className="text-white/90">Type:</span> DIY self-paced course · 90 days
          </li>
          <li>
            <span className="text-white/90">Platform:</span> SkillSprint™ LMS
          </li>
          <li>
            <span className="text-white/90">Audience:</span> Score 0–40 · AI Absent or Experimental
          </li>
          <li>
            <span className="text-white/90">Promise:</span> By the end, AI is running in at least one real part of your business —
            consistently, without you having to remember to use it
          </li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em]" style={{ color: ARL_GOLD }}>
          What&apos;s included (5 modules)
        </h2>
        <ol className="mt-4 space-y-4">
          {MODULES.map((m, i) => (
            <li
              key={m.title}
              className="rounded-lg border p-4"
              style={{ borderColor: ARL_BORDER, backgroundColor: ARL_CARD }}
            >
              <span className="font-mono text-xs tabular-nums" style={{ color: ARL_GOLD }}>
                {i + 1}.
              </span>{" "}
              <span className="font-semibold text-white">{m.title}</span>
              <p className="mt-1 text-sm" style={{ color: ARL_DIM }}>
                {m.body}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section
        className="mt-10 rounded-xl border p-6"
        style={{ backgroundColor: ARL_CARD, borderColor: ARL_BORDER }}
      >
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em]" style={{ color: ARL_GOLD }}>
          Exit deliverables
        </h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm" style={{ color: ARL_DIM }}>
          <li>1 live automated AI sequence</li>
          <li>1 system connection</li>
          <li>Documented time saved per week</li>
          <li>Re-assessment score expected 41–60</li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em]" style={{ color: ARL_GOLD }}>
          Packages
        </h2>
        <ul className="mt-3 space-y-2 text-sm" style={{ color: ARL_DIM }}>
          {PACKAGES.map((p) => (
            <li key={p} className="rounded border border-white/10 px-3 py-2">
              {p}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm font-medium" style={{ color: ARL_WHITE }}>
          Pricing: TBD — program launching soon
        </p>
      </section>

      <section
        className="mt-14 rounded-xl border-2 p-6 sm:p-8"
        style={{ borderColor: ARL_GOLD, backgroundColor: ARL_CARD, boxShadow: "0 0 40px rgba(201,162,39,0.08)" }}
      >
        <h2 className="text-xl font-bold" style={{ fontFamily: "'Syne', sans-serif" }}>
          Join the Rung 2 waitlist
        </h2>
        <p className="mt-2 text-sm" style={{ color: ARL_DIM }}>
          Be first to know when enrollment opens. Early members get priority access and founding pricing.
        </p>

        {done ? (
          <p className="mt-6 text-sm font-medium text-emerald-400">
            You&apos;re on the list. We&apos;ll be in touch when Rung 2 opens.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="r2-first" className="text-white">
                First name
              </Label>
              <Input
                id="r2-first"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                className="mt-1.5 border-white/10 bg-black/20 text-white"
                autoComplete="given-name"
              />
            </div>
            <div>
              <Label htmlFor="r2-email" className="text-white">
                Email
              </Label>
              <Input
                id="r2-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1.5 border-white/10 bg-black/20 text-white"
                autoComplete="email"
              />
            </div>
            <div>
              <Label htmlFor="r2-url" className="text-white">
                Business URL <span style={{ color: ARL_DIM }}>(optional)</span>
              </Label>
              <Input
                id="r2-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="mt-1.5 border-white/10 bg-black/20 text-white"
                placeholder="https://"
              />
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <Button
              type="submit"
              disabled={busy}
              className="w-full font-semibold sm:w-auto"
              style={{ backgroundColor: ARL_GOLD, color: ARL_BG }}
            >
              {busy ? "Submitting…" : "Join waitlist"}
            </Button>
          </form>
        )}
      </section>
    </AiReadinessLabsShell>
  );
}
