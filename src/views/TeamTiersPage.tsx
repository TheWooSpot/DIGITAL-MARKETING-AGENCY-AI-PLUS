import { useCallback, useMemo, useState, type FormEvent } from "react";

const SESSION_KEY = "socialutely_team_tiers_ok";
const GOLD = "#d4a843";

function getExpectedPassword(): string {
  const fromEnv = (import.meta.env.VITE_TEAM_PASSWORD as string | undefined)?.trim();
  if (fromEnv) return fromEnv;
  return "socialutely2026";
}

function passwordsMatch(input: string, expected: string): boolean {
  return input.trim() === expected.trim();
}

type TierId = "essentials" | "momentum" | "signature" | "vanguard" | "sovereign";

type TierDef = {
  id: TierId;
  badge: string;
  name: string;
  retainerRange: string;
  scoreThreshold: string;
  clientProfile: string;
  sampleServices: string[];
  characterSummary: string;
  intensity: 1 | 2 | 3 | 4 | 5;
};

const TIERS: TierDef[] = [
  {
    id: "essentials",
    badge: "E",
    name: "Essentials",
    retainerRange: "$1.8k – $3.5k / mo",
    scoreThreshold: "Overall score 0 – 39 · single-location or early digital presence",
    clientProfile:
      "Owner-led SMBs stabilizing the basics: clear listings, credible site, and a repeatable way to show up in search and maps. They need proof, not complexity.",
    sampleServices: [
      "Google Business Profile hygiene + review response playbook",
      "Core on-page SEO + one primary conversion path",
      "Monthly performance snapshot (traffic, calls, form fills)",
    ],
    characterSummary:
      "Foundational, calm, and directive. We remove blind spots and install the minimum viable visibility stack so every dollar after this tier compounds.",
    intensity: 1,
  },
  {
    id: "momentum",
    badge: "M",
    name: "Momentum",
    retainerRange: "$3.5k – $6.5k / mo",
    scoreThreshold: "Overall score 40 – 54 · growth mode, adding channels or staff",
    clientProfile:
      "Teams that have traction but inconsistent execution—seasonal dips, channel silos, or handoffs that leak leads. They want rhythm: campaigns, content, and reporting that tie to revenue.",
    sampleServices: [
      "Search + content calendar with quarterly theme pillars",
      "Paid + organic alignment (shared messaging & landing tests)",
      "Biweekly growth standup + funnel milestone tracking",
    ],
    characterSummary:
      "Cadence and clarity. We connect acquisition to nurture so marketing feels like a system, not a series of one-offs.",
    intensity: 2,
  },
  {
    id: "signature",
    badge: "S",
    name: "Signature",
    retainerRange: "$6.5k – $12k / mo",
    scoreThreshold: "Overall score 55 – 69 · multi-offer or multi-location sophistication",
    clientProfile:
      "Brands competing in crowded categories where reputation and narrative matter as much as rankings. They need differentiated positioning and orchestrated touchpoints.",
    sampleServices: [
      "Brand narrative + service line messaging architecture",
      "Reputation & trust programs across review, PR, and onsite proof",
      "Integrated lifecycle email/SMS aligned to sales stages",
    ],
    characterSummary:
      "Polished and intentional. We elevate how the brand sounds, looks, and converts—so premium pricing feels inevitable.",
    intensity: 3,
  },
  {
    id: "vanguard",
    badge: "V",
    name: "Vanguard",
    retainerRange: "$12k – $22k / mo",
    scoreThreshold: "Overall score 70 – 84 · scaling ops, data, and channel mix",
    clientProfile:
      "Marketing-led organizations with internal stakeholders, compliance needs, or franchise-style consistency. They need governance, dashboards, and experimentation without chaos.",
    sampleServices: [
      "Attribution & dashboard layer (CRM + ads + web)",
      "Experiment backlog: CRO, creative, and offer tests",
      "Playbooks for regional rollouts and partner co-marketing",
    ],
    characterSummary:
      "Strategic operator energy. We build the cockpit—measurement, tests, and playbooks—so leadership can scale decisions, not meetings.",
    intensity: 4,
  },
  {
    id: "sovereign",
    badge: "S+",
    name: "Sovereign",
    retainerRange: "$15,000+ / month",
    scoreThreshold: "85+ or exceptional organizational complexity",
    clientProfile:
      "Dominant market players, national and global brands, and organizations with a mandate not just to compete but to own their category. These are businesses with 500+ employees, dedicated marketing departments, CMOs, and board-level accountability for brand equity and market share. They operate across multiple geographies, product lines, or audience segments simultaneously. Sovereign is not defined by score alone — it is defined by mandate: category ownership, not competitive advantage.",
    sampleServices: [
      "Voice & Vibe™ Production Engine",
      "PayNamic™ Dynamic Checkout Engine",
      "TrustGuard™ Governance Layer",
      "AllianceOS™ Growth Partnerships Engine",
      "InsightLoop™ Analytics Dashboard",
    ],
    characterSummary:
      "Full-scale deployment. National or global reach. Enterprise investment. Complete stack ownership. Every service feeds every other. The intelligence layer informs governance. Commerce infrastructure feeds analytics. Partnership network amplifies the content engine. This is not a vendor relationship — it is structural infrastructure that sustains market leadership across leadership changes, economic cycles, and competitive disruptions.",
    intensity: 5,
  },
];

type ServiceCrossRef = {
  name: string;
  descriptions: Record<TierId, string>;
};

const SERVICE_CROSS_REF: ServiceCrossRef[] = [
  {
    name: "SearchLift™",
    descriptions: {
      essentials:
        "Baseline keyword map, GBP + on-page fixes, and monthly rank/traffic visibility—enough to earn consistent discovery.",
      momentum:
        "Themed content sprints, internal linking architecture, and search-to-lead path tests so organic compounds with paid.",
      signature:
        "Category storytelling woven into SERP assets: rich results, comparison pages, and authority hubs that defend margin.",
      vanguard:
        "Portfolio-level SEO governance: templates, rollouts, and experiment logs across regions or product lines.",
      sovereign:
        "National-scale search and narrative command: executive briefings, portfolio governance, and category-defending SERP assets tied to revenue models.",
    },
  },
  {
    name: "VoiceBridge™",
    descriptions: {
      essentials:
        "Brand voice guidelines + IVR/web copy alignment so every first touch sounds like the same business.",
      momentum:
        "Scripted call paths, SMS handoffs, and sales-enablement snippets for high-intent pages.",
      signature:
        "Consultative scripts, objection libraries, and persona-specific talk tracks for premium buyers.",
      vanguard:
        "Multi-team voice ops: QA scoring, training loops, and CRM-logged conversation insights.",
      sovereign:
        "Enterprise voice and conversation orchestration with policy layers, human escalation, and board-level customer experience narrative.",
    },
  },
  {
    name: "TrustGuard™",
    descriptions: {
      essentials:
        "Review generation basics, crisis one-pager, and listing accuracy so trust signals don’t leak.",
      momentum:
        "Reputation campaigns, escalation workflows, and cross-channel proof blocks on key landers.",
      signature:
        "Trust architecture: case studies, compliance-friendly claims, and third-party validation programs.",
      vanguard:
        "Franchise / multi-stakeholder reputation governance with dashboards and legal-ready response trees.",
      sovereign:
        "Enterprise risk posture: monitoring, simulations, and executive communications integrated with brand strategy.",
    },
  },
  {
    name: "InsightLoop™",
    descriptions: {
      essentials:
        "Simple monthly dashboard: calls, forms, top pages—plain language, no jargon.",
      momentum:
        "Funnel-stage reporting with hypotheses and next experiments baked into every recap.",
      signature:
        "Narrative reporting tied to brand and LTV segments; creative + media feedback loops.",
      vanguard:
        "Unified data model recommendations, warehouse-light views, and stakeholder-specific views.",
      sovereign:
        "Custom intelligence products: alerts, scenario modeling, and leadership-ready narrative reporting.",
    },
  },
];

function IntensityDots({ level, active }: { level: 1 | 2 | 3 | 4 | 5; active?: boolean }) {
  return (
    <div className="flex items-center gap-1.5" aria-label={`Service intensity ${level} of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className="h-2 w-2 rounded-full transition-colors"
          style={{
            backgroundColor: n <= level ? GOLD : "rgba(232, 238, 245, 0.12)",
            boxShadow: active && n <= level ? `0 0 8px ${GOLD}66` : undefined,
          }}
        />
      ))}
    </div>
  );
}

function PasswordGate({ onSuccess }: { onSuccess: () => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  const expected = useMemo(() => getExpectedPassword(), []);

  const submit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      if (passwordsMatch(value, expected)) {
        sessionStorage.setItem(SESSION_KEY, "1");
        setError(false);
        onSuccess();
      } else {
        setError(true);
      }
    },
    [value, expected, onSuccess]
  );

  return (
    <div
      className="team-tiers-page fixed inset-0 z-[100] flex min-h-[100dvh] flex-col items-center justify-center px-6"
      style={{ fontFamily: "'Archivo', system-ui, sans-serif" }}
    >
      <div className="relative z-10 w-full max-w-sm text-center">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: GOLD }}>
          Internal
        </p>
        <h1 className="mb-1 text-2xl font-semibold text-[#e8eef5]">Team tier reference</h1>
        <p className="mb-8 text-sm text-[#8b9bb5]">Enter the team password to continue. Session only — closes when you close the tab.</p>

        <form onSubmit={submit} className="flex flex-col gap-4">
          <input
            type="password"
            autoComplete="current-password"
            placeholder="Password"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError(false);
            }}
            className="team-tiers-input w-full rounded-lg border bg-[#121826] px-4 py-3 text-[#e8eef5] placeholder:text-[#8b9bb5]/60"
            style={{ borderColor: error ? "rgba(239,68,68,0.5)" : "rgba(212, 168, 67, 0.25)" }}
          />
          {error ? <p className="text-sm text-red-400">Incorrect password.</p> : null}
          <button
            type="submit"
            className="rounded-lg py-3 text-sm font-semibold text-[#0b0f1a] transition hover:brightness-110"
            style={{ backgroundColor: GOLD }}
          >
            Unlock reference
          </button>
        </form>
      </div>
    </div>
  );
}

export default function TeamTiersPage() {
  const [unlocked, setUnlocked] = useState(() => {
    try {
      return sessionStorage.getItem(SESSION_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [expandedId, setExpandedId] = useState<TierId | null>(null);

  const toggleTier = useCallback((id: TierId) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  if (!unlocked) {
    return <PasswordGate onSuccess={() => setUnlocked(true)} />;
  }

  return (
    <div
      className="team-tiers-page min-h-screen pb-24 pt-10 selection:bg-[#d4a843]/25 selection:text-white sm:pt-14"
      style={{
        fontFamily: "'Archivo', system-ui, sans-serif",
        cursor: "default",
      }}
    >
      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6">
        <header className="mb-12 text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: GOLD }}>
            Internal · Sales & delivery
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-[#e8eef5] sm:text-4xl">Five-tier reference framework</h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-[#8b9bb5]">
            Tap a card to reveal client profile, sample services, character, and intensity. Retainers and score bands are directional—finalize in scope.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {TIERS.map((tier) => {
            const open = expandedId === tier.id;
            return (
              <button
                key={tier.id}
                type="button"
                onClick={() => toggleTier(tier.id)}
                className="group flex flex-col rounded-xl border text-left transition hover:border-[#d4a843]/45"
                style={{
                  backgroundColor: "#121826",
                  borderColor: open ? "rgba(212, 168, 67, 0.45)" : "rgba(212, 168, 67, 0.18)",
                  boxShadow: open ? `0 0 0 1px ${GOLD}33, 0 18px 40px rgba(0,0,0,0.35)` : undefined,
                }}
              >
                <div className="flex flex-1 flex-col p-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-[#0b0f1a]"
                      style={{ backgroundColor: GOLD }}
                    >
                      {tier.badge}
                    </span>
                    <span className="text-[10px] font-medium uppercase tracking-wider text-[#8b9bb5]">
                      {open ? "Tap to collapse" : "Tap to expand"}
                    </span>
                  </div>
                  <h2 className="text-lg font-semibold text-[#e8eef5]">{tier.name}</h2>
                  <p className="mt-1 text-sm font-medium" style={{ color: GOLD }}>
                    {tier.retainerRange}
                  </p>
                  <p className="mt-2 text-xs leading-snug text-[#8b9bb5]">{tier.scoreThreshold}</p>

                  <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3">
                    <span className="text-[10px] uppercase tracking-wider text-[#8b9bb5]">Intensity</span>
                    <IntensityDots level={tier.intensity} active={open} />
                  </div>
                </div>

                {open ? (
                  <div
                    className="team-tiers-card-expanded border-t border-[#d4a843]/20 bg-black/20 px-4 py-4"
                    style={{ borderTopColor: "rgba(212, 168, 67, 0.2)" }}
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: GOLD }}>
                      Client profile
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-[#c9d4e3]">{tier.clientProfile}</p>

                    <p className="mt-4 text-[10px] font-semibold uppercase tracking-wider" style={{ color: GOLD }}>
                      Sample services
                    </p>
                    <ul className="mt-2 list-inside list-disc space-y-1.5 text-sm text-[#aebccf]">
                      {tier.sampleServices.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ul>

                    <p className="mt-4 text-[10px] font-semibold uppercase tracking-wider" style={{ color: GOLD }}>
                      Tier character
                    </p>
                    <p className="mt-1 text-sm leading-relaxed italic text-[#c9d4e3]">{tier.characterSummary}</p>

                    <div className="mt-4 flex items-center justify-between rounded-lg border border-white/10 bg-[#0b0f1a]/80 px-3 py-2">
                      <span className="text-[10px] uppercase tracking-wider text-[#8b9bb5]">Delivery intensity</span>
                      <IntensityDots level={tier.intensity} active />
                    </div>
                  </div>
                ) : null}
              </button>
            );
          })}
        </div>

        {/* Service intensity cross-reference */}
        <section className="mt-16 border-t border-[#d4a843]/20 pt-12">
          <h2 className="text-center text-xl font-semibold text-[#e8eef5] sm:text-2xl">Service intensity cross-reference</h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-[#8b9bb5]">
            Same named service, escalating scope and summary language by tier. Use this to keep proposals and SOWs aligned.
          </p>

          <div className="mt-10 space-y-10">
            {SERVICE_CROSS_REF.map((svc) => (
              <div
                key={svc.name}
                className="overflow-hidden rounded-xl border"
                style={{ borderColor: "rgba(212, 168, 67, 0.2)", backgroundColor: "#121826" }}
              >
                <div className="border-b border-[#d4a843]/15 px-4 py-3 sm:px-6" style={{ backgroundColor: "rgba(212, 168, 67, 0.06)" }}>
                  <h3 className="text-lg font-semibold" style={{ color: GOLD }}>
                    {svc.name}
                  </h3>
                </div>
                <div className="divide-y divide-white/5">
                  {TIERS.map((tier) => (
                    <div key={tier.id} className="grid gap-2 px-4 py-4 sm:grid-cols-[140px_1fr] sm:items-start sm:gap-6 sm:px-6">
                      <div className="flex items-center gap-2">
                        <span
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-xs font-bold text-[#0b0f1a]"
                          style={{ backgroundColor: GOLD }}
                        >
                          {tier.badge}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-[#e8eef5]">{tier.name}</p>
                          <IntensityDots level={tier.intensity} />
                        </div>
                      </div>
                      <p className="text-sm leading-relaxed text-[#aebccf]">{svc.descriptions[tier.id]}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <p className="mt-12 text-center text-xs text-[#8b9bb5]/80">
          Session auth only — stored in <code className="text-[#d4a843]/80">sessionStorage</code>. Close the tab to clear.
        </p>
      </div>
    </div>
  );
}
