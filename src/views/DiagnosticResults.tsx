import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AnyDoorHero, AnyDoorPageShell } from "@/components/anydoor/AnyDoorExperience";
import { ScoreGauge } from "@/components/diagnostic/ScoreGauge";
import { getRecommendations } from "@/lib/diagnostic/routing-engine";
import type { ScoreResult } from "@/lib/diagnostic/types";

const DiagnosticResults = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const result = state?.result as ScoreResult | undefined;
  const routing = result ? getRecommendations(result.ai_iq_score) : null;

  if (!result) {
    return (
      <AnyDoorPageShell backHref="/ai-iq" backLabel="← AI IQ™ assessment" narrow={false}>
        <div className="mx-auto max-w-md py-16 text-center">
          <div className="anydoor-surface-card">
            <p className="text-white/60">No results found. Take the assessment first.</p>
          </div>
          <button type="button" className="anydoor-btn-gold mt-8 max-w-xs" onClick={() => navigate("/ai-iq")}>
            Take assessment
          </button>
        </div>
      </AnyDoorPageShell>
    );
  }

  return (
    <AnyDoorPageShell backHref="/ai-iq" backLabel="← AI IQ™ assessment" narrow={false}>
      <AnyDoorHero
        eyebrow="SOCIALUTELY · AI IQ™ RESULTS"
        titleAccent="Your assessment"
        titleRest="results"
        subtitle={`Maturity band: ${result.maturity_band} · score ${result.ai_iq_score}`}
      />

      <div className="mx-auto max-w-2xl space-y-8 pb-16 text-[#e8eef5]">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
          <div className="anydoor-surface-card">
            <div className="flex flex-col items-center pt-2">
              <ScoreGauge score={result.ai_iq_score} />
              <motion.p
                className="mt-6 text-2xl font-light text-[#c9973a]"
                style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35 }}
              >
                {result.maturity_band}
              </motion.p>
            </div>
          </div>

          <div className="anydoor-surface-card">
            <p className="leading-relaxed text-white/75">{result.narrative}</p>
          </div>

          <div className="anydoor-surface-card border-l-4 border-l-[#c9973a]/80">
            <p className="anydoor-exp-eyebrow text-left">Your strengths</p>
            <ul className="mt-4 space-y-2">
              {result.strengths.map((s, i) => (
                <motion.li
                  key={i}
                  className="flex items-start gap-2 text-sm text-white/85"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.06 }}
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#c9973a]" />
                  {s}
                </motion.li>
              ))}
            </ul>
          </div>

          <div className="anydoor-surface-card border-l-4 border-l-amber-500/50">
            <p className="anydoor-exp-eyebrow text-left">Blind spots</p>
            <ul className="mt-4 space-y-2">
              {result.blind_spots.map((s, i) => (
                <motion.li
                  key={i}
                  className="flex items-start gap-2 text-sm text-white/85"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 + i * 0.06 }}
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500/80" />
                  {s}
                </motion.li>
              ))}
            </ul>
          </div>

          {routing && (
            <div className="anydoor-surface-card border" style={{ borderColor: "rgba(201,151,58,0.25)" }}>
              <p className="anydoor-exp-eyebrow text-left">Recommended for you</p>
              <p className="mt-3 font-medium text-white">
                {routing.recommendedTier} · {routing.recommendedMembership}
              </p>
              <p className="mt-2 text-sm text-white/50">
                Based on your AI IQ score, we recommend this tier to get the most value.
              </p>
            </div>
          )}

          {routing && routing.recommendedServices.length > 0 && (
            <div className="anydoor-surface-card">
              <p className="anydoor-exp-eyebrow text-left">Socialutely services that fit</p>
              <ul className="mt-4 space-y-3">
                {routing.recommendedServices.map((svc, i) => (
                  <motion.li
                    key={svc.id}
                    className="flex flex-col gap-0.5 border-b border-white/[0.06] pb-3 last:border-0 last:pb-0"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.45 + i * 0.05 }}
                  >
                    <span className="font-medium text-[#c9973a]">{svc.name}</span>
                    <span className="text-sm text-white/50">{svc.rationale}</span>
                  </motion.li>
                ))}
              </ul>
              <button
                type="button"
                className="anydoor-btn-outline mt-6 w-full sm:w-auto"
                onClick={() => navigate("/")}
              >
                Explore full service catalog
              </button>
            </div>
          )}

          <motion.div className="text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
            <button type="button" className="anydoor-btn-gold max-w-md px-10" onClick={() => navigate("/diagnostic/unlock")}>
              Unlock Full AI Maturity Report
            </button>
            <p className="mt-4 text-sm text-white/45">
              Access governance readiness, competency assessment, and 90-day roadmap
            </p>
          </motion.div>
        </motion.div>
      </div>
    </AnyDoorPageShell>
  );
};

export default DiagnosticResults;
