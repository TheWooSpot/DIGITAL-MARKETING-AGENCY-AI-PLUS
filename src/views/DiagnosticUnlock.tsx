import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AnyDoorHero, AnyDoorPageShell } from "@/components/anydoor/AnyDoorExperience";

const DiagnosticUnlock = () => {
  const navigate = useNavigate();

  return (
    <AnyDoorPageShell backHref="/" backLabel="← Platform home">
      <AnyDoorHero
        eyebrow="AI MATURITY · PHASE 2"
        titleAccent="Unlock your"
        titleRest="full blueprint"
        subtitle="Governance readiness, team competency, risk modeling, and a 90-day roadmap — gated membership coming soon."
      />

      <motion.div
        className="mx-auto max-w-xl pb-16"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
      >
        <div className="anydoor-surface-card space-y-6">
          <p className="text-center text-sm text-white/55">
            Access your full diagnostic including governance readiness, team competency assessment, risk exposure modeling, and a
            90-day activation roadmap.
          </p>
          <div className="space-y-3">
            {[
              { name: "Socialutely Circle™", line: "$9–29/mo — Foundational access" },
              { name: "Momentum Vault™", line: "$49–99/mo — Premium resources" },
              { name: "Concierge Access™", line: "$1,000+/mo — Strategic oversight" },
            ].map((tier) => (
              <div key={tier.name} className="anydoor-option-tile">
                <p className="font-medium text-[#c9973a]">{tier.name}</p>
                <p className="mt-1 text-sm text-white/50">{tier.line}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-white/40">Phase 2: Membership gating and Stripe integration coming soon.</p>
          <button type="button" className="anydoor-btn-outline w-full" onClick={() => navigate("/")}>
            Return to home
          </button>
        </div>
      </motion.div>
    </AnyDoorPageShell>
  );
};

export default DiagnosticUnlock;
