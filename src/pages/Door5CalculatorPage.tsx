import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSession } from "@/context/SessionContext";
import { AnyDoorEntryScreen, AnyDoorPageShell } from "@/components/anydoor/AnyDoorExperience";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { getSupabaseBrowserClient } from "@/anydoor/lib/supabaseBrowserClient";
import {
  BUSINESS_SIZE_LABEL,
  type BusinessSize,
  computeMonthlyBreakdown,
  DIMENSION_SERVICES,
  lowestDimension,
  recommendedServiceIds,
} from "@/lib/calculator/door5Math";

const GOLD = "#c9973a";
const WHITE = "#e8eef5";
const DIM = "rgba(232,238,245,0.55)";
const PROSPECTS_TABLE = ["layer5", "prospects"].join("_");

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function roundStep(n: number, step: number): number {
  return Math.round(n / step) * step;
}

function fmtMoney(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

function validEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

type Phase = "gate" | "inputs" | "calculating" | "results";

export default function Door5CalculatorPage() {
  const navigate = useNavigate();
  const session = useSession();
  const { mergeSession } = session;
  const [phase, setPhase] = useState<Phase>("gate");
  const [name, setName] = useState(session.name);
  const [email, setEmail] = useState(session.email);
  const [url, setUrl] = useState(session.url);
  const [gateError, setGateError] = useState<string | null>(null);

  const [monthlyRevenue, setMonthlyRevenue] = useState(25_000);
  const [monthlySpend, setMonthlySpend] = useState(5000);
  const [avgCustomerValue, setAvgCustomerValue] = useState(500);
  const [customersPerMonth, setCustomersPerMonth] = useState(20);
  const [businessSize, setBusinessSize] = useState<BusinessSize>("small");

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const breakdown = useMemo(
    () =>
      computeMonthlyBreakdown(monthlyRevenue, avgCustomerValue, customersPerMonth, businessSize, monthlySpend),
    [monthlyRevenue, avgCustomerValue, customersPerMonth, businessSize, monthlySpend]
  );

  const lowDim = useMemo(() => lowestDimension(breakdown), [breakdown]);
  const topServiceIds = useMemo(() => recommendedServiceIds(breakdown), [breakdown]);
  const contributorServices = DIMENSION_SERVICES[lowDim];

  function continueFromGate() {
    setGateError(null);
    if (!name.trim()) {
      setGateError("Please enter your name.");
      return;
    }
    if (!validEmail(email)) {
      setGateError("Enter a valid business email.");
      return;
    }
    mergeSession({
      name: name.trim(),
      email: email.trim(),
      url: url.trim(),
    });
    setPhase("inputs");
  }

  function runResults() {
    setPhase("calculating");
    setTimeout(() => setPhase("results"), 1300);
  }

  async function goToQuote() {
    setSaveError(null);
    mergeSession({
      name: name.trim(),
      email: email.trim(),
      url: url.trim(),
    });
    const supabase = getSupabaseBrowserClient();
    const notesPayload = {
      monthly_revenue: monthlyRevenue,
      monthly_spend: monthlySpend,
      avg_customer_value: avgCustomerValue,
      customers_per_month: customersPerMonth,
      business_size: businessSize,
      projected_uplift: breakdown.total90Day,
      recommended_services: topServiceIds.map((id) => {
        const all = Object.values(DIMENSION_SERVICES).flat();
        const row = all.find((s) => s.id === id);
        return { id, name: row?.name ?? String(id) };
      }),
    };

    const params = new URLSearchParams({
      business_size: businessSize,
      services: topServiceIds.join(","),
    });
    const nextUrl = `/quote?${params.toString()}`;

    if (!supabase) {
      navigate(nextUrl);
      return;
    }

    setSaving(true);
    const row: Record<string, unknown> = {
      business_name: name.trim(),
      email: email.trim(),
      url: url.trim() || null,
      source: "door5-calculator",
      notes: JSON.stringify(notesPayload),
      industry: "Unknown",
      share_token: crypto.randomUUID(),
      overall_score: 0,
      visibility_score: 0,
      engagement_score: 0,
      conversion_score: 0,
      prospect_summary: `D-5 · The Calculator — projected ${fmtMoney(breakdown.total90Day)} / 90 days.`,
      estimated_value: 0,
      recommended_tier: "Essentials",
      recommended_services: [],
      detected_gaps: [],
    };
    const { error } = await supabase.from(PROSPECTS_TABLE).insert(row);
    setSaving(false);
    if (error) {
      setSaveError(error.message);
      return;
    }

    navigate(nextUrl);
  }

  return (
    <div className="anydoor-door-page min-h-screen">
    <AnyDoorPageShell narrow={false}>
      <div className="relative z-10 pb-24 selection:bg-[#c9973a]/30 selection:text-white">
        {phase === "gate" && (
          <div className="mx-auto w-full max-w-[580px]">
            <AnyDoorEntryScreen
              eyebrow="ANYDOOR ENGINE · D-5 · THE WORKBENCH"
              heading="What Would This Actually Be Worth?"
              subtext1={"You can't justify the investment without knowing the return."}
              subtext2="See what smarter marketing could be worth to your business in real numbers."
              bodyText="Projected return based on a few inputs — not what services cost."
            />
          <section className="mx-auto w-full space-y-4">
            <div className="space-y-4">
              <div>
                <label htmlFor="d5-name" className="anydoor-field-label--primary">
                  Name
                </label>
                <input
                  id="d5-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="anydoor-field-input"
                  autoComplete="name"
                />
              </div>
              <div>
                <label htmlFor="d5-email" className="anydoor-field-label--primary">
                  Business email
                </label>
                <input
                  id="d5-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="anydoor-field-input"
                  autoComplete="email"
                />
              </div>
              <div>
                <label htmlFor="d5-url" className="anydoor-field-label--muted">
                  Business URL <span className="text-white/35">(optional)</span>
                </label>
                <input
                  id="d5-url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="anydoor-field-input"
                  placeholder="https://"
                />
              </div>
              {gateError && <p className="text-sm text-red-400">{gateError}</p>}
              <button type="button" className="anydoor-btn-gold" onClick={continueFromGate}>
                Model my uplift →
              </button>
            </div>
          </section>
          </div>
        )}

        {phase === "inputs" && (
          <section className="space-y-8">
            <p className="text-center font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: GOLD }}>
              Step 1 of 2 · Your inputs
            </p>

            <SliderField
              label="Monthly revenue"
              value={monthlyRevenue}
              min={1000}
              max={500_000}
              step={1000}
              format={fmtMoney}
              onChange={(v) => setMonthlyRevenue(roundStep(clamp(v, 1000, 500_000), 1000))}
            />
            <SliderField
              label="Monthly marketing spend"
              value={monthlySpend}
              min={0}
              max={50_000}
              step={500}
              format={fmtMoney}
              onChange={(v) => setMonthlySpend(roundStep(clamp(v, 0, 50_000), 500))}
            />
            <SliderField
              label="Average customer value"
              value={avgCustomerValue}
              min={10}
              max={10_000}
              step={10}
              format={fmtMoney}
              onChange={(v) => setAvgCustomerValue(roundStep(clamp(v, 10, 10_000), 10))}
            />
            <SliderField
              label="Customers per month"
              value={customersPerMonth}
              min={1}
              max={500}
              step={1}
              format={(n) => String(Math.round(n))}
              onChange={(v) => setCustomersPerMonth(Math.round(clamp(v, 1, 500)))}
            />

            <div>
              <Label className="text-base text-white">Business size</Label>
              <RadioGroup
                value={businessSize}
                onValueChange={(v) => setBusinessSize(v as BusinessSize)}
                className="mt-3 grid gap-2 sm:grid-cols-2"
              >
                {(Object.keys(BUSINESS_SIZE_LABEL) as BusinessSize[]).map((key) => (
                  <label
                    key={key}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm transition",
                      businessSize === key ? "border-[#c9973a] bg-[#c9973a]/10" : "border-white/10 bg-black/20"
                    )}
                  >
                    <RadioGroupItem value={key} id={`size-${key}`} className="border-[#c9973a] text-[#c9973a]" />
                    <span className="text-white">{BUSINESS_SIZE_LABEL[key]}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>

            <div className="flex flex-wrap gap-3 pt-4">
              <button type="button" className="anydoor-btn-outline" onClick={() => setPhase("gate")}>
                Back
              </button>
              <button type="button" className="anydoor-btn-gold !w-auto px-8" onClick={runResults}>
                See projection →
              </button>
            </div>
          </section>
        )}

        {phase === "calculating" && (
          <div className="flex min-h-[40vh] flex-col items-center justify-center gap-6 py-24">
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="inline-block h-2 w-2 rounded-full animate-pulse"
                  style={{
                    background: GOLD,
                    animationDelay: `${i * 0.2}s`,
                    animationDuration: "0.9s",
                  }}
                />
              ))}
            </div>
            <p className="font-mono text-[10px] uppercase tracking-[0.35em]" style={{ color: GOLD }}>
              Modelling your uplift…
            </p>
          </div>
        )}

        {phase === "results" && (
          <section className="mt-8 space-y-10">
            <p className="text-center font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: GOLD }}>
              Step 2 of 2 · Projected uplift
            </p>

            <div
              className="anydoor-surface-card border-2 p-8 text-center sm:p-10"
              style={{ borderColor: GOLD, boxShadow: "0 0 48px rgba(201,151,58,0.12)" }}
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.35em]" style={{ color: GOLD }}>
                Projected 90-day uplift
              </p>
              <CountUpNumber target={breakdown.total90Day} />
              <p className="mt-3 text-sm sm:text-base" style={{ color: DIM }}>
                additional revenue potential over 90 days
              </p>
              {breakdown.roiMultiple !== null && (
                <div className="mt-5 inline-block rounded-full border px-4 py-1.5 text-xs font-mono" style={{ borderColor: GOLD, color: GOLD }}>
                  {breakdown.roiMultiple}× return on your {fmtMoney(monthlySpend)}/mo spend
                </div>
              )}
            </div>

            <div className="anydoor-surface-card p-6">
              <h3 className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: GOLD }}>
                Contributing factors (monthly model × 3 for 90 days)
              </h3>
              <ul className="mt-4 space-y-3 text-sm">
                <li className="flex justify-between gap-4 border-b border-white/5 pb-3" style={{ color: DIM }}>
                  <span>Visibility boost</span>
                  <span className="shrink-0 font-mono tabular-nums text-white">{fmtMoney(breakdown.visibility * 3)}</span>
                </li>
                <li className="flex justify-between gap-4 border-b border-white/5 pb-3" style={{ color: DIM }}>
                  <span>Automation &amp; follow-up efficiency</span>
                  <span className="shrink-0 font-mono tabular-nums text-white">{fmtMoney(breakdown.automation * 3)}</span>
                </li>
                <li className="flex justify-between gap-4" style={{ color: DIM }}>
                  <span>Retention improvement</span>
                  <span className="shrink-0 font-mono tabular-nums text-white">{fmtMoney(breakdown.retention * 3)}</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: GOLD }}>
                Service contributors
                <span className="ml-2 font-normal normal-case" style={{ color: DIM }}>
                  (outcomes — not prices)
                </span>
              </h3>
              <p className="mt-1 text-xs" style={{ color: DIM }}>
                Strongest gap today: <span className="text-white/90">{lowDim === "visibility" ? "Visibility" : lowDim === "automation" ? "Automation" : "Retention"}</span>
              </p>
              <ul className="mt-4 space-y-3">
                {contributorServices.map((s) => (
                  <li key={s.id} className="anydoor-option-tile text-sm">
                    <span className="font-semibold text-white">{s.name}</span>
                    <span style={{ color: DIM }}> — {s.benefit}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs" style={{ color: "rgba(240,242,248,0.4)" }}>
                Services like these are included in Momentum and above.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                disabled={saving}
                className="anydoor-btn-gold !w-auto px-8 disabled:opacity-60"
                onClick={() => void goToQuote()}
              >
                {saving ? "Saving…" : "See what this investment looks like →"}
              </button>
              <Link className="anydoor-btn-outline inline-block text-center" to="/diagnostic">
                Not ready? See where you stand first →
              </Link>
            </div>
            {saveError && <p className="text-sm text-amber-400">Couldn&apos;t save your session: {saveError}</p>}

            <button type="button" className="text-sm underline" style={{ color: DIM }} onClick={() => setPhase("inputs")}>
              ← Adjust inputs
            </button>

            <p className="text-center text-[11px] leading-relaxed" style={{ color: "rgba(232,238,245,0.28)" }}>
              Conservative estimates based on industry benchmarks for your business size. Actual results vary.
            </p>
          </section>
        )}
      </div>
    </AnyDoorPageShell>
    </div>
  );
}

function CountUpNumber({ target }: { target: number }) {
  const [displayed, setDisplayed] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const duration = 900;

  useEffect(() => {
    startRef.current = null;
    const animate = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.round(eased * target));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [target]);

  return (
    <p
      className="mt-4 text-4xl font-light tabular-nums leading-none sm:text-5xl md:text-6xl"
      style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: WHITE }}
    >
      {fmtMoney(displayed)}
    </p>
  );
}

function SliderField({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (n: number) => string;
  onChange: (n: number) => void;
}) {
  return (
    <div className="anydoor-surface-card p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <Label className="text-base text-white">{label}</Label>
        <Input
          type="number"
          inputMode="numeric"
          value={value}
          min={min}
          max={max}
          step={step}
          className="h-9 w-36 border-white/15 bg-black/30 text-right font-mono text-sm text-white"
          onChange={(e) => {
            const raw = parseFloat(e.target.value);
            if (Number.isNaN(raw)) return;
            onChange(roundStep(clamp(raw, min, max), step));
          }}
        />
      </div>
      <Slider
        className="door5-slider mt-5 w-full py-1"
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => onChange(v[0] ?? min)}
      />
      <p className="mt-2 text-xs" style={{ color: DIM }}>
        {format(value)} · range {format(min)} – {format(max)}
      </p>
    </div>
  );
}
