import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AnyDoorPageShell } from "@/components/anydoor/AnyDoorExperience";

const BG = "#07090f";
const GOLD = "#c9993a";
const WHITE = "#e8eef5";
const DIM = "rgba(201,153,58,0.78)";
const BORDER = "rgba(201,151,58,0.22)";

const PACKAGES = [
  {
    key: "starter_3",
    name: "Starter 3",
    sessions: 3,
    price: 1497,
    scoreMin: 41,
    scoreMax: 50,
    tagline: "3 sessions · one focused use case",
    fits: "Teams with capacity for one focused AI win. You know the workflow that needs attention — you need expert facilitation to make it real.",
    outcome: "A single AI-powered workflow deployed in your business, with your team trained to maintain and iterate it.",
  },
  {
    key: "core_5",
    name: "Core 5",
    sessions: 5,
    price: 2997,
    scoreMin: 51,
    scoreMax: 60,
    tagline: "5 sessions · 2–3 workflows",
    fits: "Teams with AI already in pockets, ready to scale. You need coordinated rollout across 2–3 connected workflows without breaking what works.",
    outcome: "Multi-workflow AI integration with consistent patterns, measurement framework, and team fluency to extend it on your own.",
  },
  {
    key: "growth_7",
    name: "Growth 7",
    sessions: 7,
    price: 4997,
    scoreMin: 61,
    scoreMax: 70,
    tagline: "7 sessions · revenue alignment sprint",
    fits: "Organizations where AI runs at the operational layer and the question is 'how does this move revenue?' You want full-funnel or full-department transformation.",
    outcome: "Revenue-aligned AI stack across marketing, sales, or customer success — tied to measurable pipeline, margin, or retention improvements.",
  },
  {
    key: "intensive_10",
    name: "Intensive 10",
    sessions: 10,
    price: 7997,
    scoreMin: 71,
    scoreMax: 79,
    tagline: "10 sessions · multi-team · complex integration",
    fits: "Multi-department organizations where AI integration touches multiple teams, systems, or regulatory constraints. You need orchestration, not isolated pilots.",
    outcome: "Cross-functional AI operating system with integration architecture, governance framework, and handoff plan to your internal team or Rung 4 Stewardship.",
  },
] as const;

function money(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function Rung3OptimizationPage() {
  const [searchParams] = useSearchParams();
  const scoreRaw = searchParams.get("score");
  const score = scoreRaw ? Number.parseInt(scoreRaw, 10) : Number.NaN;
  const hasScore = Number.isFinite(score);

  const recommendedPackage = useMemo(
    () =>
      hasScore
        ? PACKAGES.find((p) => score >= p.scoreMin && score <= p.scoreMax) ?? null
        : null,
    [hasScore, score]
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: BG }}>
      <AnyDoorPageShell narrow={false}>
        <div className="mx-auto w-full max-w-6xl pb-14">
          <p
            className="text-center font-mono text-[11px] uppercase tracking-[0.3em]"
            style={{ color: GOLD }}
          >
            AI READINESS LABS · RUNG 3 · OPTIMIZATION
          </p>
          <h1
            className="mt-4 text-center text-4xl font-light text-white sm:text-5xl"
            style={{ fontFamily: "Georgia, serif" }}
          >
            Four ways to optimize
          </h1>
          <p className="mx-auto mt-4 max-w-3xl text-center text-sm leading-relaxed" style={{ color: WHITE }}>
            {hasScore && recommendedPackage
              ? `Based on your score of ${score}, we recommend ${recommendedPackage.name}. You can choose any package — this is a suggestion, not a cage.`
              : "Pick the package that matches your scope and capacity."}
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {PACKAGES.map((pkg) => {
              const isRecommended = recommendedPackage?.key === pkg.key;
              return (
                <article
                  key={pkg.key}
                  className="rounded-2xl border p-6"
                  style={{
                    borderColor: isRecommended ? GOLD : BORDER,
                    background: "rgba(7,9,15,0.86)",
                    boxShadow: isRecommended ? "0 0 34px rgba(201,153,58,0.24)" : "none",
                  }}
                >
                  {isRecommended ? (
                    <div
                      className="mb-4 inline-flex rounded-full px-3 py-1 text-[11px] font-semibold"
                      style={{ color: "#07090f", backgroundColor: GOLD, fontFamily: "Arial, sans-serif" }}
                    >
                      ★ Recommended for your score
                    </div>
                  ) : null}

                  <h2 className="text-3xl font-light text-white" style={{ fontFamily: "Georgia, serif" }}>
                    {pkg.name}
                  </h2>
                  <p className="mt-1 text-sm" style={{ color: DIM, fontFamily: "Arial, sans-serif" }}>
                    {pkg.tagline}
                  </p>

                  <p className="mt-5 text-4xl font-light text-white" style={{ fontFamily: "Georgia, serif" }}>
                    {money(pkg.price)}
                  </p>

                  <div className="mt-6 space-y-4 text-sm leading-relaxed text-white/85">
                    <p style={{ fontFamily: "Georgia, serif" }}>
                      <span className="font-semibold" style={{ color: GOLD, fontFamily: "Arial, sans-serif" }}>
                        Who it fits:
                      </span>{" "}
                      {pkg.fits}
                    </p>
                    <p style={{ fontFamily: "Georgia, serif" }}>
                      <span className="font-semibold" style={{ color: GOLD, fontFamily: "Arial, sans-serif" }}>
                        Outcome:
                      </span>{" "}
                      {pkg.outcome}
                    </p>
                  </div>

                  <Link
                    to={`/ai-readiness/rung-3/enroll?pkg=${pkg.key}`}
                    className="mt-7 inline-block w-full rounded-lg border px-5 py-3 text-center text-sm font-semibold transition hover:brightness-110"
                    style={{
                      borderColor: GOLD,
                      backgroundColor: isRecommended ? GOLD : "rgba(201,153,58,0.12)",
                      color: isRecommended ? "#07090f" : WHITE,
                      fontFamily: "Arial, sans-serif",
                    }}
                  >
                    Choose {pkg.name}
                  </Link>
                </article>
              );
            })}
          </div>
        </div>
      </AnyDoorPageShell>
    </div>
  );
}
