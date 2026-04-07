import { useState } from "react";
import type { FormEvent } from "react";
import { submitAiReadinessWaitlist } from "@/lib/aiReadiness/waitlistSubmit";
import { AiReadinessLabsShell, ARL_DIM, ARL_GOLD, ARL_WHITE } from "./AiReadinessLabsShell";

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
      <p className="anydoor-exp-eyebrow">AI Readiness Labs™</p>
      <h1
        className="mt-3 text-3xl font-light leading-tight text-white sm:text-4xl md:text-5xl"
        style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}
      >
        <span className="italic text-[#c9973a]">Rung 2</span>
        <span className="block text-white">Adaptation</span>
      </h1>
      <p className="mt-2 text-lg font-medium" style={{ color: ARL_WHITE }}>
        AI is running.
      </p>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed" style={{ color: ARL_DIM }}>
        The self-paced program that turns AI experimentation into operations you can count on.
      </p>

      <section className="anydoor-surface-card mt-10">
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
            <li key={m.title} className="anydoor-surface-card p-4">
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

      <section className="anydoor-surface-card mt-10">
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

      <section className="mt-14 rounded-xl border-2 border-[#c9973a]/40 bg-[#07080d]/90 p-6 shadow-[0_0_40px_rgba(201,151,58,0.08)] sm:p-8">
        <h2 className="text-xl font-light text-white" style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}>
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
              <label htmlFor="r2-first" className="anydoor-field-label--primary">
                First name
              </label>
              <input
                id="r2-first"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                className="anydoor-field-input"
                autoComplete="given-name"
              />
            </div>
            <div>
              <label htmlFor="r2-email" className="anydoor-field-label--primary">
                Email
              </label>
              <input
                id="r2-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="anydoor-field-input"
                autoComplete="email"
              />
            </div>
            <div>
              <label htmlFor="r2-url" className="anydoor-field-label--muted">
                Business URL <span className="text-white/35">(optional)</span>
              </label>
              <input
                id="r2-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="anydoor-field-input"
                placeholder="https://"
              />
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button type="submit" disabled={busy} className="anydoor-btn-gold sm:w-auto sm:min-w-[200px]">
              {busy ? "Submitting…" : "Join waitlist"}
            </button>
          </form>
        )}
      </section>
    </AiReadinessLabsShell>
  );
}
