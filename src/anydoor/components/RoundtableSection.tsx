import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type GridCell = {
  day_key: string;
  hour_local: number;
  available: boolean;
  slot_start_utc: string | null;
  overlap_count: number;
  is_own_tap: boolean;
};

type GridPayload = {
  session: {
    id: string;
    duration_minutes: number;
    quorum_threshold: number;
    total_partners_invited: number;
    status: string;
    window_start: string;
    window_end: string;
    expires_at: string | null;
  };
  cells?: GridCell[];
  partner: { timezone: string };
  consensus_slot_start?: string | null;
  locked?: boolean;
  message?: string;
  error?: string;
};

const LABEL_HOURS = [
  { h: 10, short: "10A" },
  { h: 12, short: "12P" },
  { h: 14, short: "2P" },
  { h: 16, short: "4P" },
];

function tierForRatio(count: number, total: number): number {
  if (count <= 0 || total <= 0) return 0;
  const ratio = count / total;
  if (ratio >= 1) return 6;
  if (ratio >= 0.9) return 5;
  if (ratio >= 0.8) return 4;
  if (ratio >= 0.7) return 3;
  if (ratio >= 0.6) return 2;
  return 1;
}

function formatWindow(startIso: string, endIso: string, tz: string): string {
  const o1 = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: tz,
  });
  const o2 = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: tz,
  });
  const a = new Date(startIso);
  const b = new Date(endIso);
  return `${o1.format(a)} – ${o2.format(b)}`;
}

function hoursRemaining(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / 3600000);
}

function setsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const x of a) if (!b.has(x)) return false;
  return true;
}

export default function RoundtableSection() {
  const baseUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<string | null>(null);
  const [payload, setPayload] = useState<GridPayload | null>(null);

  /** Working selections — POSTed on confirm; initialized from server after each load. */
  const [draft, setDraft] = useState<Set<string>>(new Set());
  const [lastSaved, setLastSaved] = useState<Set<string>>(new Set());

  const [consensusModal, setConsensusModal] = useState(false);
  const [lockSlotIso, setLockSlotIso] = useState<string | null>(null);

  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("token");
    setToken(t ? String(t).trim() : null);
  }, []);

  const loadGrid = useCallback(async () => {
    if (!token || !baseUrl || !anon) {
      setLoading(false);
      setBanner("Scheduling is unavailable right now.");
      return;
    }
    setLoading(true);
    setBanner(null);
    try {
      const res = await fetch(`${baseUrl}/functions/v1/roundtable-grid-load`, {
        method: "POST",
        headers: {
          apikey: anon,
          Authorization: `Bearer ${anon}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ brief_token: token }),
      });
      const data = (await res.json()) as GridPayload & { message?: string; error?: string };

      if (data.locked) {
        setPayload(null);
        setBanner(
          data.message ??
            "This Roundtable is set. The invite is in your inbox.",
        );
        setLoading(false);
        return;
      }

      if (!res.ok || data.error) {
        setPayload(null);
        setBanner(
          typeof data.error === "string"
            ? data.error
            : "We couldn't load the calendar right now. Please try again.",
        );
        setLoading(false);
        return;
      }

      setPayload(data);
      const own = new Set<string>();
      for (const c of data.cells ?? []) {
        if (c.is_own_tap && c.slot_start_utc) own.add(c.slot_start_utc);
      }
      setLastSaved(own);
      setDraft(own);

      if (data.session?.status === "lock_pending" && data.consensus_slot_start) {
        setLockSlotIso(data.consensus_slot_start);
        setConsensusModal(true);
      }
    } catch {
      setBanner("We couldn't load the calendar right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [anon, baseUrl, token]);

  useEffect(() => {
    void loadGrid();
  }, [loadGrid]);

  const session = payload?.session;
  const tz = payload?.partner?.timezone ?? "America/Los_Angeles";
  const total = session?.total_partners_invited ?? 1;
  const quorum = session?.quorum_threshold ?? 3;

  const dayKeys = useMemo(() => {
    const cells = payload?.cells ?? [];
    const keys = [...new Set(cells.map((c) => c.day_key))];
    return keys.sort();
  }, [payload?.cells]);

  const pendingTray = useMemo(() => {
    const out: string[] = [];
    for (const k of draft) {
      if (!lastSaved.has(k)) out.push(k);
    }
    for (const k of lastSaved) {
      if (!draft.has(k)) out.push(k);
    }
    return [...new Set(out)];
  }, [draft, lastSaved]);

  const toggleTile = (cell: GridCell) => {
    if (!cell.available || !cell.slot_start_utc || !session) return;
    if (session.status !== "open") return;
    const key = cell.slot_start_utc;
    setDraft((prev) => {
      const n = new Set(prev);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });
  };

  const confirmSelections = async () => {
    if (!token || !baseUrl || !anon) return;
    try {
      const res = await fetch(
        `${baseUrl}/functions/v1/roundtable-confirm-availability`,
        {
          method: "POST",
          headers: {
            apikey: anon,
            Authorization: `Bearer ${anon}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            brief_token: token,
            slot_starts: [...draft],
          }),
        },
      );
      const data = (await res.json()) as {
        lock_pending?: boolean;
        lock_slot_start?: string;
        error?: string;
      };
      if (data.error) {
        setBanner(data.error);
        return;
      }
      await loadGrid();
      if (data.lock_pending && data.lock_slot_start) {
        setLockSlotIso(data.lock_slot_start);
        setConsensusModal(true);
      }
    } catch {
      setBanner("We couldn't save your selections. Please try again.");
    }
  };

  const confirmLock = async () => {
    if (!token || !baseUrl || !anon || !lockSlotIso) return;
    try {
      const res = await fetch(`${baseUrl}/functions/v1/roundtable-lock`, {
        method: "POST",
        headers: {
          apikey: anon,
          Authorization: `Bearer ${anon}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          brief_token: token,
          slot_start_utc: lockSlotIso,
        }),
      });
      const data = (await res.json()) as {
        success?: boolean;
        message?: string;
      };
      if (!data.success) {
        setConsensusModal(false);
        setBanner(
          data.message ??
            "That slot just filled on the calendar. Pick another — your other selections are still saved.",
        );
        await loadGrid();
        return;
      }
      setConsensusModal(false);
      setBanner("Working session set. The invite is in your inbox.");
      await loadGrid();
    } catch {
      setBanner("Something went wrong. Please try again.");
    }
  };

  const showTooltip = (
    e: React.MouseEvent,
    cell: GridCell,
    displayCount: number,
    pendingStyle: boolean,
    confirmedStyle: boolean,
  ) => {
    const el = tooltipRef.current;
    if (!el) return;
    const tierConsensus = displayCount >= total;
    let html = "";
    const dayStr = formatDayTooltip(cell.day_key);
    const timeStr = formatHourTooltip(cell.hour_local);
    if (pendingStyle) {
      el.className = "rt-tooltip show is-pending";
      html = `<span class="rt-tooltip-count">Pending</span> · tap again to remove<br/><span class="rt-tooltip-detail">${dayStr} · ${timeStr}</span>`;
    } else if (displayCount === 0) {
      el.className = "rt-tooltip show";
      html = `<span class="rt-tooltip-time">${dayStr} · ${timeStr}</span><div class="rt-tooltip-detail">Tap if you're free</div>`;
    } else {
      el.className = tierConsensus ? "rt-tooltip show is-consensus" : "rt-tooltip show";
      const pct = Math.round((displayCount / total) * 100);
      html = tierConsensus
        ? `<span class="rt-tooltip-count">All partners free · ${pct}%</span>`
        : `<span class="rt-tooltip-count">${displayCount} of ${total}</span> partners free · ${pct}%`;
      html += `<div class="rt-tooltip-detail">${dayStr} · ${timeStr}${confirmedStyle ? " · including you" : ""}</div>`;
    }
    el.innerHTML = html;
    positionTooltip(e);
  };

  function formatDayTooltip(dayKey: string): string {
    const [y, m, d] = dayKey.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    }).format(dt);
  }

  function formatHourTooltip(h: number): string {
    const ampm = h >= 12 ? "PM" : "AM";
    const hr = h % 12 === 0 ? 12 : h % 12;
    return `${hr}:00 ${ampm}`;
  }

  function positionTooltip(e: React.MouseEvent) {
    const el = tooltipRef.current;
    if (!el) return;
    const pad = 14;
    let x = e.clientX + pad;
    let y = e.clientY + pad;
    const rect = el.getBoundingClientRect();
    if (x + rect.width > window.innerWidth - 10) x = e.clientX - rect.width - pad;
    if (y + rect.height > window.innerHeight - 10) y = e.clientY - rect.height - pad;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
  }

  const hideTooltip = () => {
    tooltipRef.current?.classList.remove("show");
  };

  if (!token) return null;

  if (loading) {
    return (
      <section className="rt-wrap" aria-busy="true">
        <p className="rt-muted">Loading scheduling…</p>
      </section>
    );
  }

  if (banner && !payload) {
    return (
      <section className="rt-wrap">
        <p className="rt-banner">{banner}</p>
      </section>
    );
  }

  if (!session || !payload?.cells) return null;

  const hrLeft = hoursRemaining(session.expires_at);
  const hasUnsaved = !setsEqual(draft, lastSaved);

  return (
    <section className="rt-wrap">
      {banner && <p className="rt-banner">{banner}</p>}

      <div className="rt-eyebrow">The Roundtable</div>
      <h2 className="rt-title">Lock in our working session</h2>
      <p className="rt-sub">
        Tap times that work, then confirm — the others are doing the same.
      </p>
      <p className="rt-meta">
        <strong>{session.duration_minutes} min</strong>
        {" · "}Window{" "}
        <strong>{formatWindow(session.window_start, session.window_end, tz)}</strong>
        {" · "}
        <strong>
          {quorum} of {total}
        </strong>{" "}
        partners needed
        {hrLeft !== null && (
          <>
            {" · "}Closes in{" "}
            <strong>{hrLeft}h</strong>
          </>
        )}
      </p>

      <div className="rt-grid-wrap">
        <div
          className="rt-grid"
          style={{
            gridTemplateColumns: `44px repeat(${dayKeys.length}, minmax(0, 1fr))`,
          }}
        >
          <div className="rt-corner" />
          {dayKeys.map((dk) => {
            const parts = dk.split("-").map(Number);
            const dt = new Date(parts[0], parts[1] - 1, parts[2]);
            const dow = dt.toLocaleDateString("en-US", { weekday: "short" });
            const anyConsensus = (payload.cells ?? []).some((c) => {
              if (c.day_key !== dk || !c.slot_start_utc) return false;
              const inc =
                c.overlap_count +
                (draft.has(c.slot_start_utc) && !lastSaved.has(c.slot_start_utc)
                  ? 1
                  : 0) -
                (!draft.has(c.slot_start_utc) && lastSaved.has(c.slot_start_utc)
                  ? 1
                  : 0);
              return tierForRatio(inc, total) >= 6;
            });
            return (
              <div
                key={dk}
                className={`rt-day-head${anyConsensus ? " day-consensus" : ""}`}
              >
                <span className="rt-dow">{dow}</span>
                <span className="rt-date">
                  {parts[1]}/{parts[2]}
                </span>
              </div>
            );
          })}

          {LABEL_HOURS.flatMap(({ h, short }) => [
            <div key={`tl-${h}`} className="rt-time-label">
              {short}
            </div>,
            ...dayKeys.map((dk) => {
              const cell =
                payload.cells?.find(
                  (c) => c.day_key === dk && c.hour_local === h,
                ) ?? null;
              if (!cell) {
                return <div key={`${dk}-${h}`} className="rt-tile unavailable" />;
              }
              if (!cell.available || !cell.slot_start_utc) {
                return (
                  <div key={`${dk}-${h}`} className="rt-tile unavailable" />
                );
              }

              const key = cell.slot_start_utc;
              const inDraft = draft.has(key);
              const wasSaved = lastSaved.has(key);
              const pendingStyle = inDraft !== wasSaved;
              const confirmedStyle = inDraft && wasSaved;

              let displayCount = cell.overlap_count;
              if (inDraft && !wasSaved) displayCount += 1;
              if (!inDraft && wasSaved) displayCount -= 1;

              const tier = tierForRatio(displayCount, total);
              const fillPct = Math.min(100, (displayCount / total) * 100);

              return (
                <button
                  key={key}
                  type="button"
                  className={`rt-tile available t${tier}${pendingStyle ? " pending" : ""}${inDraft && wasSaved && !pendingStyle ? " confirmed" : ""}${tier === 6 ? " consensus" : ""}`}
                  data-tier={tier > 0 && tier < 6 ? tier : ""}
                  onClick={() => toggleTile(cell)}
                  onMouseEnter={(e) =>
                    showTooltip(e, cell, displayCount, pendingStyle, confirmedStyle)
                  }
                  onMouseMove={positionTooltip}
                  onMouseLeave={hideTooltip}
                >
                  {tier > 0 && tier < 6 ? (
                    <div
                      className="rt-battery"
                      style={{ height: `${fillPct}%` }}
                    />
                  ) : null}
                  {tier === 6 ? <div className="rt-battery full" /> : null}
                  <span className="rt-tile-time">{short}</span>
                </button>
              );
            }),
          ])}
        </div>
      </div>

      {pendingTray.length > 0 && (
        <div className="rt-pending-tray visible">
          <div className="rt-pending-head">
            <span className="rt-pending-dot" />
            <span>
              {pendingTray.length === 1
                ? "1 selection — not yet confirmed"
                : `${pendingTray.length} selections — not yet confirmed`}
            </span>
          </div>
          <div className="rt-pending-list">
            {pendingTray.map((k) => (
              <div key={k} className="rt-chip">
                {formatChipLabel(k, tz)}
                <button
                  type="button"
                  className="rt-chip-x"
                  aria-label="Remove"
                  onClick={() =>
                    setDraft((prev) => {
                      const n = new Set(prev);
                      if (n.has(k)) n.delete(k);
                      else n.add(k);
                      return n;
                    })
                  }
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <div className="rt-pending-actions">
            <button
              type="button"
              className="rt-btn-discard"
              onClick={() => setDraft(new Set(lastSaved))}
            >
              Clear all
            </button>
            <button
              type="button"
              className="rt-btn-confirm"
              onClick={confirmSelections}
              disabled={!hasUnsaved}
            >
              Confirm my availability
            </button>
          </div>
        </div>
      )}

      <p className="rt-foot">
        Hover any tile for exact count · Lime glow = all partners free.
      </p>

      <div ref={tooltipRef} className="rt-tooltip" />

      {consensusModal && (
        <div
          className="rt-modal-overlay show"
          role="dialog"
          aria-modal="true"
          aria-labelledby="rt-modal-title"
        >
          <div className="rt-modal">
            <div className="rt-modal-eyebrow">
              The Roundtable · Consensus Reached
            </div>
            <h3 id="rt-modal-title" className="rt-modal-title">
              Working session set.
            </h3>
            <p className="rt-modal-msg">
              All partners are free. Confirm to lock the time and send out calendar
              invites.
            </p>
            <button type="button" className="rt-modal-confirm" onClick={confirmLock}>
              Confirm and send invites
            </button>
            <button
              type="button"
              className="rt-modal-cancel"
              onClick={() => setConsensusModal(false)}
            >
              Wait, let me reconsider
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function formatChipLabel(iso: string, tz: string): string {
  const d = new Date(iso);
  const day = d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: tz,
  });
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: tz,
  });
  return `${day} · ${time}`;
}
