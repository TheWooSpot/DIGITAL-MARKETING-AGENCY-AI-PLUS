import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSession } from "@/context/SessionContext";
import { Button } from "@/components/ui/button";
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

const BG = "#070d1a";
const CARD = "#0e1829";
const GOLD = "#c9a227";
const BORDER = "rgba(201,162,39,0.25)";
const WHITE = "#f0f2f8";
const DIM = "rgba(240,242,248,0.55)";

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

type Phase = "gate" | "inputs" | "results";

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
      computeMonthlyBreakdown(monthlyRevenue, avgCustomerValue, customersPerMonth, businessSize),
    [monthlyRevenue, avgCustomerValue, customersPerMonth, businessSize]
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
    setPhase("results");
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
      prospect_summary: `Door 5 Calculator — projected ${fmtMoney(breakdown.total90Day)} / 90 days.`,
      estimated_value: 0,
      recommended_tier: "Essentials",
      recommended_services: [],
      detected_gaps: [],
    };
    const { error } = await supabase.from("layer5_prospects").insert(row);
    setSaving(false);
    if (error) {
      setSaveError(error.message);
      return;
    }

    navigate(nextUrl);
  }

  return (
    <div
      className="relative z-10 min-h-screen pb-24 selection:bg-[#c9a227]/30 selection:text-white"
      style={{
        color: WHITE,
        fontFamily: "'Archivo', system-ui, sans-serif",
      }}
    >
      <header
        className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-b px-4 py-4 sm:px-8"
        style={{ borderBottomWidth: 1, borderBottomColor: GOLD }}
      >
        <Link to="/" className="text-sm font-semibold" style={{ color: GOLD }}>
          ← Home
        </Link>
        <span className="text-xs font-mono uppercase tracking-[0.2em]" style={{ color: DIM }}>
          AnyDoor Engine · Door 5
        </span>
      </header>

      <div className="relative z-10 mx-auto max-w-2xl px-4 pt-10 sm:px-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.35em]" style={{ color: GOLD }}>
          The Calculator
        </p>
        <h1 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl" style={{ fontFamily: "'Syne', system-ui, sans-serif" }}>
          The Calculator
        </h1>
        <p className="mt-3 text-sm leading-relaxed" style={{ color: DIM }}>
          Projected return based on a few inputs — not what services cost. Pricing stays behind Door 6 until you&apos;re ready.
        </p>

        {phase === "gate" && (
          <section
            className="mt-10 rounded-xl border p-6 sm:p-8"
            style={{ backgroundColor: CARD, borderColor: BORDER }}
          >
            <h2 className="text-lg font-semibold" style={{ fontFamily: "'Syne', sans-serif" }}>
              Before we model uplift
            </h2>
            <div className="mt-6 space-y-4">
              <div>
                <Label htmlFor="d5-name" className="text-white">
                  Name
                </Label>
                <Input
                  id="d5-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1.5 border-white/10 bg-black/25 text-white"
                  autoComplete="name"
                />
              </div>
              <div>
                <Label htmlFor="d5-email" className="text-white">
                  Business email
                </Label>
                <Input
                  id="d5-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1.5 border-white/10 bg-black/25 text-white"
                  autoComplete="email"
                />
              </div>
              <div>
                <Label htmlFor="d5-url" className="text-white">
                  Business URL <span style={{ color: DIM }}>(optional)</span>
                </Label>
                <Input
                  id="d5-url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="mt-1.5 border-white/10 bg-black/25 text-white"
                  placeholder="https://"
                />
              </div>
              {gateError && <p className="text-sm text-red-400">{gateError}</p>}
              <Button type="button" className="font-semibold" style={{ backgroundColor: GOLD, color: BG }} onClick={continueFromGate}>
                Continue
              </Button>
            </div>
          </section>
        )}

        {phase === "inputs" && (
          <section className="mt-10 space-y-8">
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
                      businessSize === key ? "border-[#c9a227] bg-[#c9a227]/10" : "border-white/10 bg-black/20"
                    )}
                  >
                    <RadioGroupItem value={key} id={`size-${key}`} className="border-[#c9a227] text-[#c9a227]" />
                    <span className="text-white">{BUSINESS_SIZE_LABEL[key]}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>

            <div className="flex flex-wrap gap-3 pt-4">
              <Button type="button" variant="outline" className="border-white/20 bg-transparent text-white" onClick={() => setPhase("gate")}>
                Back
              </Button>
              <Button type="button" className="font-semibold" style={{ backgroundColor: GOLD, color: BG }} onClick={runResults}>
                See projection →
              </Button>
            </div>
          </section>
        )}

        {phase === "results" && (
          <section className="mt-8 space-y-10">
            <p className="text-center font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: GOLD }}>
              Step 2 of 2 · Projected uplift
            </p>

            <div
              className="rounded-2xl border-2 p-8 text-center sm:p-10"
              style={{ borderColor: GOLD, backgroundColor: CARD, boxShadow: "0 0 48px rgba(201,162,39,0.12)" }}
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.35em]" style={{ color: GOLD }}>
                Projected 90-day uplift
              </p>
              <p
                className="mt-4 text-4xl font-extrabold tabular-nums leading-none sm:text-5xl"
                style={{ fontFamily: "'Syne', system-ui, sans-serif", color: WHITE }}
              >
                {fmtMoney(breakdown.total90Day)}
              </p>
              <p className="mt-3 text-sm sm:text-base" style={{ color: DIM }}>
                additional revenue potential over 90 days
              </p>
            </div>

            <div className="rounded-xl border p-6" style={{ borderColor: BORDER, backgroundColor: CARD }}>
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
              <p className="mt-6 text-xs leading-relaxed" style={{ color: DIM }}>
                Projected based on industry benchmarks for businesses your size. Actual results vary.
              </p>
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
                  <li
                    key={s.id}
                    className="rounded-lg border px-4 py-3 text-sm"
                    style={{ borderColor: BORDER, backgroundColor: "rgba(14,24,41,0.6)" }}
                  >
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
              <Button
                type="button"
                disabled={saving}
                className="font-semibold"
                style={{ backgroundColor: GOLD, color: BG }}
                onClick={() => void goToQuote()}
              >
                {saving ? "Saving…" : "See what this investment looks like →"}
              </Button>
              <Button type="button" variant="outline" className="border-white/20 bg-transparent text-white" asChild>
                <Link to="/diagnostic">Get your full diagnostic first →</Link>
              </Button>
            </div>
            {saveError && <p className="text-sm text-amber-400">Couldn&apos;t save your session: {saveError}</p>}

            <button type="button" className="text-sm underline" style={{ color: DIM }} onClick={() => setPhase("inputs")}>
              ← Adjust inputs
            </button>
          </section>
        )}
      </div>
    </div>
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
    <div className="rounded-xl border p-4 sm:p-5" style={{ borderColor: BORDER, backgroundColor: CARD }}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <Label className="text-base text-white">{label}</Label>
        <Input
          type="number"
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
