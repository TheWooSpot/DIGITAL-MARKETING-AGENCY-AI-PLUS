"use client";

import { useEffect, useState } from "react";

const STAGE_MS = 2600;
const PROGRESS = [0, 25, 55, 80, 100] as const;

const STAGES = [
  { label: "Locating business...", key: "s1" as const },
  { label: "Analyzing digital presence...", key: "s2" as const },
  { label: "Scoring visibility, engagement & conversion...", key: "s3" as const },
  { label: "Mapping gaps to solutions...", key: "s4" as const },
  { label: "Preparing your report...", key: "s5" as const },
];

const FLASH_IDS = [101, 105, 201, 202, 203, 301, 302, 401, 701, 802, 104, 205];

type Settled = { ok: boolean; data: unknown };

export function DiagnosticLoadingOverlay({
  active,
  stageIndex,
  progress,
}: {
  active: boolean;
  stageIndex: number;
  progress: number;
}) {
  const [flashIdx, setFlashIdx] = useState(0);

  useEffect(() => {
    if (!active || stageIndex !== 3) return;
    const id = window.setInterval(() => {
      setFlashIdx((i) => (i + 1) % FLASH_IDS.length);
    }, 180);
    return () => window.clearInterval(id);
  }, [active, stageIndex]);

  if (!active) return null;

  const stage = STAGES[Math.min(stageIndex, STAGES.length - 1)];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      style={{ backgroundColor: "rgba(7, 8, 13, 0.92)" }}
      aria-busy="true"
      aria-live="polite"
    >
      <div
        className={`relative w-full max-w-md overflow-hidden rounded-xl border border-white/[0.08] bg-[#07080d] px-8 py-10 shadow-2xl ${
          stageIndex === 4 ? "anydoor-loading-shimmer" : ""
        }`}
      >
        <div className="mb-6">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-[#c9973a] transition-[width] duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p
            className="mt-2 text-right text-xs tabular-nums text-[#c9973a]"
            style={{ fontFamily: "var(--font-dm-mono), ui-monospace, monospace" }}
          >
            {progress}%
          </p>
        </div>

        {stageIndex === 0 && (
          <div className="flex justify-center">
            <span className="anydoor-loading-pulse-dot h-3 w-3 rounded-full bg-[#c9973a]" />
          </div>
        )}

        <p
          className="mt-4 text-center text-lg italic leading-snug text-white/90"
          style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}
        >
          {stage.label}
        </p>

        {stageIndex === 2 && (
          <div className="mt-8 flex justify-center gap-6">
            {[0, 1, 2].map((ring, i) => (
              <div
                key={ring}
                className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#c9973a]/40 opacity-0 anydoor-ring-in"
                style={{ animationDelay: `${i * 0.35}s` }}
              />
            ))}
          </div>
        )}

        {stageIndex === 3 && (
          <div
            className="mt-6 h-10 overflow-hidden text-center text-2xl font-medium tabular-nums text-[#c9973a] transition-opacity duration-150"
            style={{ fontFamily: "var(--font-dm-mono), ui-monospace, monospace" }}
          >
            {FLASH_IDS[flashIdx]}
          </div>
        )}

      </div>
    </div>
  );
}

/** Run 5-stage timing; each stage ~STAGE_MS; if API settles mid-run, finish current stage then stop. */
export async function runLoadingStages(
  apiPromise: Promise<Settled>,
  onTick: (stageIndex: number, progress: number) => void
): Promise<Settled> {
  let settled: Settled | null = null;
  void apiPromise.then((r) => {
    settled = r;
  });

  for (let i = 0; i < 5; i++) {
    onTick(i, PROGRESS[i]);
    const t0 = Date.now();
    while (Date.now() - t0 < STAGE_MS) {
      await new Promise((r) => setTimeout(r, 50));
    }
    if (settled) break;
  }

  return await apiPromise;
}

export { STAGE_MS, PROGRESS };
