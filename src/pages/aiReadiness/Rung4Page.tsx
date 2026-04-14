import { useState } from "react";
import type { FormEvent } from "react";
import { submitAiReadinessWaitlist } from "@/lib/aiReadiness/waitlistSubmit";
import { AiReadinessLabsShell, ARL_DIM, ARL_GOLD, ARL_WHITE } from "./AiReadinessLabsShell";

const SCORE_BADGE = "#34c05a";

const INCLUDED = [
  "Technical installation and deployment of AI systems",
  "Ongoing maintenance, updates, and performance tuning",
  "Monthly performance report — 4–6 metrics that matter",
  "Quarterly AI IQ™ re-assessment with score tracking",
  "Issue resolution and escalation handling",
  "Integration management (CRM, voice, SMS, email, automation)",
  "One named advisor per engagement",
  "Annual AI strategy review",
];

const STEWARDSHIP_TIERS = [
  {
    name: "Foundation",
    price: "$1,500–$2,500/mo",
    detail: "1–2 AI systems · Single-team deployment",
    recommended: false,
  },
  {
    name: "Operations",
    price: "$3,500–$5,500/mo",
    detail: "3–5 AI systems · Multi-integration · Revenue-critical AI",
    recommended: true,
  },
  {
    name: "Enterprise",
    price: "$7,500–$15,000/mo",
    detail: "6+ systems · Multi-team · Governance + compliance layer",
    recommended: false,
  },
];

export default function Rung4Page() {
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
      rung: 4,
      package_preference: null,
      source: "rung4-landing",
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setDone(true);
  }

  return (
    <AiReadinessLabsShell eyebrow="AI Readiness Labs™ · Rung 4">
      <p className="anydoor-exp-eyebrow">AI READINESS LABS™ · RUNG 4</p>
      <h1
        className="mt-3 text-3xl font-light leading-tight text-[#c9973a] sm:text-4xl md:text-5xl"
        style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}
      >
        Stewardship
      </h1>
      <p className="mt-2 text-lg font-medium" style={{ color: ARL_WHITE }}>
        Done-For-You or Done-With-You AI infrastructure.
      </p>
      <p className="mt-1 max-w-2xl text-lg font-medium leading-relaxed" style={{ color: ARL_WHITE }}>
        Installed, maintained, and governed — on your behalf.
      </p>

      <div className="mt-6 inline-flex items-center rounded-full border px-4 py-2 text-sm font-semibold" style={{ borderColor: SCORE_BADGE, color: SCORE_BADGE, backgroundColor: "rgba(52, 192, 90, 0.12)" }}>
        For organizations scoring 71–100
      </div>

      <section className="anydoor-surface-card mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em]" style={{ color: ARL_GOLD }}>
          Who this is for
        </h2>
        <p className="mt-4 text-sm leading-relaxed" style={{ color: ARL_DIM }}>
          Organizations that have proven AI works in their business and are ready to scale, govern, and compound it across
          the entire operation. This is not a course or a workshop. It is a contractual partnership with a named advisor
          and a team that handles everything.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em]" style={{ color: ARL_GOLD }}>
          What&apos;s included
        </h2>
        <ul className="mt-4 space-y-3">
          {INCLUDED.map((line) => (
            <li key={line} className="flex gap-3 text-sm" style={{ color: ARL_DIM }}>
              <span className="mt-0.5 shrink-0 font-semibold" style={{ color: SCORE_BADGE }}>
                ✓
              </span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em]" style={{ color: ARL_GOLD }}>
          Stewardship tiers
        </h2>
        <ul className="mt-4 space-y-4">
          {STEWARDSHIP_TIERS.map((tier) => (
            <li
              key={tier.name}
              className={`relative rounded-xl border px-4 py-4 text-sm sm:px-5 sm:py-5 ${
                tier.recommended
                  ? "border-[#c9973a]/60 bg-[#c9973a]/10 shadow-[0_0_24px_rgba(201,151,58,0.12)]"
                  : "anydoor-surface-card border-white/[0.08]"
              }`}
            >
              {tier.recommended && (
                <span className="mb-2 inline-block rounded-full border border-[#c9973a]/50 bg-[#c9973a]/20 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-widest text-[#c9973a]">
                  Recommended
                </span>
              )}
              <p className="font-semibold text-white">{tier.name}</p>
              <p className="mt-1 text-base font-medium text-[#c9973a]">{tier.price}</p>
              <p className="mt-2" style={{ color: ARL_DIM }}>
                {tier.detail}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="anydoor-surface-card mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em]" style={{ color: ARL_GOLD }}>
          How it starts
        </h2>
        <p className="mt-4 text-sm leading-relaxed" style={{ color: ARL_DIM }}>
          Rung 4 begins with a Discovery Call — not a checkout page. A 71+ AI IQ™ score signals an organization that
          warrants a real conversation. On that call, we map your AI footprint, understand your complexity, and determine
          which stewardship tier fits. You&apos;ll receive a Stewardship Portrait within 48 hours — a document that reflects
          back what we heard and outlines exactly what implementation looks like for your organization.
        </p>
      </section>

      <section className="mt-14 rounded-xl border-2 border-[#c9973a]/40 bg-[#07080d]/90 p-6 shadow-[0_0_40px_rgba(201,151,58,0.08)] sm:p-8">
        <h2 className="text-xl font-light text-white" style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}>
          Request your discovery call
        </h2>
        <p className="mt-2 text-sm" style={{ color: ARL_DIM }}>
          Join the waitlist — we&apos;ll follow up to schedule your discovery conversation.
        </p>

        {done ? (
          <p className="mt-6 text-sm font-medium text-emerald-400">
            You&apos;re on the list. We&apos;ll reach out to schedule your Rung 4 discovery call.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="r4-first" className="anydoor-field-label--primary">
                First name
              </label>
              <input
                id="r4-first"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                className="anydoor-field-input"
                autoComplete="given-name"
              />
            </div>
            <div>
              <label htmlFor="r4-email" className="anydoor-field-label--primary">
                Email
              </label>
              <input
                id="r4-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="anydoor-field-input"
                autoComplete="email"
              />
            </div>
            <div>
              <label htmlFor="r4-url" className="anydoor-field-label--muted">
                Business URL <span className="text-white/35">(optional)</span>
              </label>
              <input
                id="r4-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="anydoor-field-input"
                placeholder="https://"
              />
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button type="submit" disabled={busy} className="anydoor-btn-gold sm:w-auto sm:min-w-[240px]">
              {busy ? "Submitting…" : "Request Your Discovery Call"}
            </button>
          </form>
        )}
      </section>
    </AiReadinessLabsShell>
  );
}
