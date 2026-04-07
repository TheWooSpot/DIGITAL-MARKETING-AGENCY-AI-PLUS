import { useState } from "react";
import type { FormEvent } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { submitAiReadinessWaitlist } from "@/lib/aiReadiness/waitlistSubmit";
import { AiReadinessLabsShell, ARL_DIM, ARL_GOLD, ARL_WHITE } from "./AiReadinessLabsShell";

const SESSION_PACKAGES = [
  { value: "starter-3", label: "Starter 3", detail: "3 sessions · one focused use case" },
  { value: "core-5", label: "Core 5", detail: "5 sessions · 2–3 workflows · recommended for 41–70" },
  { value: "growth-7", label: "Growth 7", detail: "7 sessions · full revenue alignment sprint" },
  { value: "intensive-10", label: "Intensive 10", detail: "10 sessions · multi-team · complex integration" },
];

export default function Rung3OptimizationPage() {
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [url, setUrl] = useState("");
  const [pkg, setPkg] = useState("core-5");
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
      rung: 3,
      package_preference: pkg,
      source: "rung3-landing",
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setDone(true);
  }

  return (
    <AiReadinessLabsShell eyebrow="AI Readiness Labs™ · Rung 3">
      <p className="anydoor-exp-eyebrow">AI Readiness Labs™</p>
      <h1
        className="mt-3 text-3xl font-light leading-tight text-white sm:text-4xl md:text-5xl"
        style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}
      >
        <span className="italic text-[#c9973a]">Rung 3</span>
        <span className="block text-white">Optimization</span>
      </h1>
      <p className="mt-2 text-lg font-medium" style={{ color: ARL_WHITE }}>
        AI is earning.
      </p>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed" style={{ color: ARL_DIM }}>
        The done-with-you workshop sprint that proves AI&apos;s worth in your revenue.
      </p>

      <section className="anydoor-surface-card mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em]" style={{ color: ARL_GOLD }}>
          Program details
        </h2>
        <ul className="mt-4 space-y-2 text-sm" style={{ color: ARL_DIM }}>
          <li>
            <span className="text-white/90">Type:</span> DWY workshop-based · 90 days
          </li>
          <li>
            <span className="text-white/90">Format:</span> Human-guided + AI-guided + prerecorded + live blend
          </li>
          <li>
            <span className="text-white/90">Audience:</span> Score 41–70 · Emerging or Integrated
          </li>
          <li>
            <span className="text-white/90">Promise:</span> By the end, you can point to a number — a dollar figure, a percentage, a
            documented outcome — and say AI did that.
          </li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em]" style={{ color: ARL_GOLD }}>
          Session packages
        </h2>
        <ul className="mt-4 space-y-3">
          {SESSION_PACKAGES.map((p) => (
            <li key={p.value} className="anydoor-surface-card px-4 py-3 text-sm">
              <span className="font-semibold text-white">{p.label}:</span>{" "}
              <span style={{ color: ARL_DIM }}>{p.detail}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="anydoor-surface-card mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em]" style={{ color: ARL_GOLD }}>
          What each session includes
        </h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm" style={{ color: ARL_DIM }}>
          <li>
            <span className="text-white/90">Human-guided:</span> live advisor co-build sessions
          </li>
          <li>
            <span className="text-white/90">AI-guided:</span> in-session tools and structured exercises
          </li>
          <li>
            <span className="text-white/90">Prerecorded:</span> reference library between sessions
          </li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em]" style={{ color: ARL_GOLD }}>
          Exit deliverables
        </h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm" style={{ color: ARL_DIM }}>
          <li>Revenue-tied KPI — AI measurably contributing to a business outcome</li>
          <li>2+ automated workflows running end-to-end</li>
          <li>Documented ROI — actual dollar or % improvement</li>
          <li>Re-assessment score expected 65–80</li>
        </ul>
        <p className="mt-4 text-sm font-medium" style={{ color: ARL_WHITE }}>
          Pricing: TBD — tiered by session package
        </p>
      </section>

      <section className="mt-14 rounded-xl border-2 border-[#c9973a]/40 bg-[#07080d]/90 p-6 shadow-[0_0_40px_rgba(201,151,58,0.08)] sm:p-8">
        <h2 className="text-xl font-light text-white" style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}>
          Join the Rung 3 waitlist
        </h2>
        <p className="mt-2 text-sm" style={{ color: ARL_DIM }}>
          Select your likely package. We&apos;ll reach out to confirm scope and schedule when enrollment opens.
        </p>

        {done ? (
          <p className="mt-6 text-sm font-medium text-emerald-400">
            You&apos;re on the list. We&apos;ll reach out to discuss your Rung 3 engagement.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-6">
            <div>
              <label htmlFor="r3-first" className="anydoor-field-label--primary">
                First name
              </label>
              <input
                id="r3-first"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                className="anydoor-field-input"
                autoComplete="given-name"
              />
            </div>
            <div>
              <label htmlFor="r3-email" className="anydoor-field-label--primary">
                Email
              </label>
              <input
                id="r3-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="anydoor-field-input"
                autoComplete="email"
              />
            </div>

            <div>
              <span className="anydoor-field-label--primary">Package</span>
              <RadioGroup value={pkg} onValueChange={setPkg} className="mt-3 gap-3">
                {SESSION_PACKAGES.map((p) => (
                  <label
                    key={p.value}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition hover:border-[#c9973a]/40 ${
                      pkg === p.value ? "border-[#c9973a]/60 bg-[#c9973a]/10" : "border-white/[0.08] bg-transparent"
                    }`}
                  >
                    <RadioGroupItem value={p.value} id={p.value} className="mt-0.5 border-[#c9973a] text-[#c9973a]" />
                    <span className="text-sm">
                      <span className="font-semibold text-white">{p.label}</span>{" "}
                      <span className="text-white/60">— {p.detail}</span>
                    </span>
                  </label>
                ))}
              </RadioGroup>
            </div>

            <div>
              <label htmlFor="r3-url" className="anydoor-field-label--muted">
                Business URL <span className="text-white/35">(optional)</span>
              </label>
              <input
                id="r3-url"
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
