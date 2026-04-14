import type { ReactNode } from "react";
import { AnyDoorPageShell } from "@/components/anydoor/AnyDoorExperience";

/** @deprecated Use CSS vars + Tailwind; kept for gradual migration */
export const ARL_BG = "#07080d";
export const ARL_CARD = "#07080d";
export const ARL_GOLD = "#c9973a";
export const ARL_BORDER = "rgba(255,255,255,0.08)";
export const ARL_WHITE = "#e8eef5";
export const ARL_DIM = "rgba(232,238,245,0.55)";

/** Same shell as URL diagnostic (Door B1): centered “Platform home”, grid from `body`. */
export function AiReadinessLabsShell({
  children,
  eyebrow: _eyebrow,
}: {
  children: ReactNode;
  /** Reserved for page-level eyebrows inside children */
  eyebrow: string;
}) {
  void _eyebrow;
  return (
    <div className="anydoor-door-page min-h-screen">
      <AnyDoorPageShell narrow={false}>
        <div className="mx-auto max-w-3xl pb-12 selection:bg-[#c9973a]/25 selection:text-white">{children}</div>
      </AnyDoorPageShell>
    </div>
  );
}
