export type DoorClusterStatus = "LIVE" | "BUILDING" | "PLANNED";

type Props = {
  doorId: string;
  name: string;
  count: number;
  status: DoorClusterStatus;
  lastAt: string | null;
  avgScore: number | null;
  onClick: () => void;
};

function statusPillClass(s: DoorClusterStatus): string {
  if (s === "LIVE") return "bg-[#6b9b5e]/20 text-[#6b9b5e] border-[#6b9b5e]/50";
  if (s === "BUILDING") return "bg-[#c9993a]/15 text-[#c9993a] border-[#c9993a]/45";
  return "bg-white/5 text-[hsl(var(--ac-muted))] border-[hsl(var(--ac-border))]";
}

export function DoorClusterCard({ doorId, name, count, status, lastAt, avgScore, onClick }: Props) {
  const sub =
    avgScore != null && !Number.isNaN(avgScore)
      ? `avg ${avgScore.toFixed(1)}`
      : lastAt
        ? new Date(lastAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
        : "—";

  return (
    <button
      type="button"
      onClick={onClick}
      className="cc-door-cluster group w-[148px] rounded-md border border-[hsl(var(--ac-border))] bg-[hsl(var(--ac-panel))] px-3 py-2.5 text-left shadow-sm transition-colors hover:border-[hsl(var(--ac-gold))]/55 hover:shadow-[0_0_12px_rgba(201,153,58,0.12)]"
    >
      <div className="flex items-start justify-between gap-1">
        <span className="font-mono text-[11px] font-semibold text-[hsl(var(--ac-gold))]">{doorId}</span>
        <span
          className={`rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${statusPillClass(status)}`}
        >
          {status}
        </span>
      </div>
      <div className="mt-1 font-serif text-[13px] leading-tight text-[hsl(var(--ac-heading))]">{name}</div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="rounded bg-black/25 px-2 py-0.5 font-mono text-[14px] font-semibold text-[hsl(var(--ac-text))]">
          {count}
        </span>
        <span className="truncate text-[10px] text-[hsl(var(--ac-muted))]" title={lastAt ?? ""}>
          {sub}
        </span>
      </div>
    </button>
  );
}
