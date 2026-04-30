import { useMemo } from "react";
import { DoorClusterCard, type DoorClusterStatus } from "@/components/admin/DoorClusterCard";

export type HubDoorPayload = {
  id: string;
  name: string;
  status: DoorClusterStatus;
  count: number;
  lastAt: string | null;
  avgScore: number | null;
};

type Props = {
  hubValue: number;
  hubLabel: string;
  doors: HubDoorPayload[];
  loading?: boolean;
  onDoorClick: (doorId: string) => void;
};

/** Nine spokes at 40° steps from top (D-1 at 12 o'clock). */
const SPOKE_COUNT = 9;
const RADIUS_PX = 268;

export function HubConstellation({ hubValue, hubLabel, doors, loading, onDoorClick }: Props) {
  const spokes = useMemo(() => {
    const ordered = [...doors].sort((a, b) => {
      const na = Number.parseInt(a.id.replace(/\D/g, ""), 10);
      const nb = Number.parseInt(b.id.replace(/\D/g, ""), 10);
      return na - nb;
    });
    return ordered.slice(0, SPOKE_COUNT);
  }, [doors]);

  return (
    <div className="relative mx-auto w-full max-w-[880px] px-2">
      <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden>
        <g transform="translate(440, 360)">
          {spokes.map((_, i) => {
            const a = ((-90 + i * (360 / SPOKE_COUNT)) * Math.PI) / 180;
            const x2 = Math.cos(a) * RADIUS_PX;
            const y2 = Math.sin(a) * RADIUS_PX;
            return (
              <line
                key={i}
                x1={0}
                y1={0}
                x2={x2}
                y2={y2}
                stroke="rgba(201,153,58,0.12)"
                strokeWidth={1}
              />
            );
          })}
        </g>
      </svg>

      <div className="relative mx-auto flex min-h-[720px] max-w-[880px] items-center justify-center pt-4">
        {/* Hub */}
        <div className="absolute left-1/2 top-[44%] z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
          <div
            className={`cc-hub-value font-serif text-[64px] leading-none text-[hsl(var(--ac-gold))] ${loading ? "opacity-60" : "cc-hub-pulse"}`}
          >
            {loading ? "—" : hubValue}
          </div>
          <p className="mt-3 max-w-[280px] text-center text-[11px] uppercase tracking-[0.2em] text-[hsl(var(--ac-muted))]">
            today&apos;s leading signal
          </p>
          <p className="mt-1 text-center font-serif text-sm text-[hsl(var(--ac-heading))]">{hubLabel}</p>
        </div>

        {/* Spokes */}
        <div className="pointer-events-none absolute inset-0">
          {spokes.map((d, i) => {
            const a = ((-90 + i * (360 / SPOKE_COUNT)) * Math.PI) / 180;
            const x = Math.cos(a) * RADIUS_PX;
            const y = Math.sin(a) * RADIUS_PX;
            return (
              <div
                key={d.id}
                className="pointer-events-auto absolute left-1/2 top-[44%]"
                style={{
                  transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
                }}
              >
                <DoorClusterCard
                  doorId={d.id}
                  name={d.name}
                  count={d.count}
                  status={d.status}
                  lastAt={d.lastAt}
                  avgScore={d.avgScore}
                  onClick={() => onDoorClick(d.id)}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
