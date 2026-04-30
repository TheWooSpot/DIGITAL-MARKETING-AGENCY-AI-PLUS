import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { postCommandCenter } from "@/lib/commandCenterApi";

export type TimelineRow = {
  stream_at: string;
  kind: string;
  subtype: string;
  title_hint: string;
  payload: Record<string, unknown>;
  source_row_id: string;
};

function relativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return iso;
  const sec = Math.round((Date.now() - t) / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 48) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  return d === 1 ? "yesterday" : `${d}d ago`;
}

function kindIcon(kind: string): string {
  if (kind === "admin_action") return "⚙";
  if (kind === "voice_call") return "📞";
  if (kind === "prospect") return "🔗";
  if (kind === "submission") return "📋";
  if (kind === "roundtable") return "📅";
  return "·";
}

function headline(row: TimelineRow): string {
  if (row.kind === "voice_call") {
    const agent = String(row.payload.agent_name ?? "Voice");
    const dur = row.payload.duration_seconds;
    const ds = typeof dur === "number" ? `${Math.round(dur / 60)} min` : "";
    const out = String(row.payload.outcome ?? "").slice(0, 40);
    return `${agent} call${ds ? ` · ${ds}` : ""}${out ? ` · ${out}` : ""}`;
  }
  if (row.kind === "admin_action") {
    return String(row.payload.details ? row.subtype : row.title_hint);
  }
  return row.title_hint || row.subtype;
}

type Props = {
  /** When false, parent hides this block */
  active: boolean;
};

export function TimelineRiver({ active }: Props) {
  const [category, setCategory] = useState("all");
  const [range, setRange] = useState("7d");
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [rows, setRows] = useState<TimelineRow[]>([]);
  const [nextOffset, setNextOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(false);

  const loadPage = useCallback(
    async (fromOffset: number, append: boolean) => {
      if (!active || loadingRef.current) return;
      loadingRef.current = true;
      setLoading(true);
      const { data, error } = await postCommandCenter<{
        rows?: TimelineRow[];
        hasMore?: boolean;
      }>({
        query: "timeline_page",
        offset: fromOffset,
        limit: 50,
        category,
        range,
        search: appliedSearch.trim(),
      });
      loadingRef.current = false;
      setLoading(false);
      if (error || !data?.rows) {
        if (!append) setRows([]);
        setHasMore(false);
        return;
      }
      setRows((prev) => (append ? [...prev, ...data.rows!] : data.rows!));
      setHasMore(Boolean(data.hasMore));
      setNextOffset(fromOffset + data.rows!.length);
    },
    [active, category, range, appliedSearch],
  );

  useEffect(() => {
    if (!active) return;
    setNextOffset(0);
    setHasMore(true);
    void loadPage(0, false);
  }, [active, category, range, appliedSearch, loadPage]);

  useEffect(() => {
    if (!active || !sentinelRef.current) return;
    const el = sentinelRef.current;
    const obs = new IntersectionObserver(
      (entries) => {
        const hit = entries.some((e) => e.isIntersecting);
        if (hit && hasMore && !loadingRef.current) {
          void loadPage(nextOffset, true);
        }
      },
      { root: null, rootMargin: "160px", threshold: 0 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [active, hasMore, nextOffset, loadPage]);

  const applyFilters = () => {
    setAppliedSearch(search);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["all", "All"],
              ["admin", "Admin"],
              ["calls", "Calls"],
              ["submissions", "Submissions"],
              ["sessions", "Sessions"],
            ] as const
          ).map(([id, label]) => (
            <Button
              key={id}
              type="button"
              size="sm"
              variant={category === id ? "default" : "outline"}
              className={
                category === id
                  ? "bg-[hsl(var(--ac-gold))] text-[hsl(var(--ac-bg))]"
                  : "border-[hsl(var(--ac-border))] text-[hsl(var(--ac-muted))]"
              }
              onClick={() => setCategory(id)}
            >
              {label}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["today", "Today"],
              ["7d", "7d"],
              ["30d", "30d"],
              ["all", "All"],
            ] as const
          ).map(([id, label]) => (
            <Button
              key={id}
              type="button"
              size="sm"
              variant={range === id ? "secondary" : "outline"}
              className="border-[hsl(var(--ac-border))]"
              onClick={() => setRange(id)}
            >
              {label}
            </Button>
          ))}
        </div>
        <div className="flex max-w-md flex-1 gap-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search labels, payload…"
            className="border-[hsl(var(--ac-border))] bg-[hsl(var(--ac-bg))]"
            onKeyDown={(e) => e.key === "Enter" && applyFilters()}
          />
          <Button type="button" variant="outline" className="shrink-0" onClick={applyFilters}>
            Search
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {rows.map((row) => {
          const key = `${row.stream_at}-${row.source_row_id}-${row.kind}`;
          const open = expanded === key;
          return (
            <button
              key={key}
              type="button"
              className="flex w-full flex-col gap-1 rounded-md border border-[hsl(var(--ac-border))] bg-[hsl(var(--ac-panel))] px-4 py-3 text-left transition-colors hover:border-[hsl(var(--ac-gold))]/35"
              onClick={() => setExpanded(open ? null : key)}
            >
              <div className="flex flex-wrap items-start gap-3">
                <span className="text-lg leading-none">{kindIcon(row.kind)}</span>
                <span className="rounded bg-black/30 px-2 py-0.5 text-[10px] uppercase tracking-wide text-[hsl(var(--ac-muted))]">
                  {row.kind}
                </span>
                <span className="min-w-0 flex-1 font-serif text-[15px] text-[hsl(var(--ac-heading))]">
                  {headline(row)}
                </span>
                <span className="shrink-0 text-[12px] text-[hsl(var(--ac-muted))]">
                  {relativeTime(row.stream_at)}
                </span>
              </div>
              {open ? (
                <pre className="mt-2 max-h-[240px] overflow-auto rounded border border-[hsl(var(--ac-border))] bg-black/30 p-3 text-[11px] text-[hsl(var(--ac-muted))]">
                  {JSON.stringify(row.payload, null, 2)}
                </pre>
              ) : null}
            </button>
          );
        })}
      </div>

      {loading && rows.length === 0 ? (
        <p className="text-sm text-[hsl(var(--ac-muted))]">Loading timeline…</p>
      ) : null}
      <div ref={sentinelRef} className="h-8 w-full" aria-hidden />
      {!hasMore && rows.length > 0 ? (
        <p className="text-center text-xs text-[hsl(var(--ac-muted))]">End of stream</p>
      ) : null}
    </div>
  );
}
