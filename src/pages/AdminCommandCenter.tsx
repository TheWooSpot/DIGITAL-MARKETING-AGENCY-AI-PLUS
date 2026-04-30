import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AdminLoginForm } from "@/components/AdminLoginForm";
import { HubConstellation, type HubDoorPayload } from "@/components/admin/HubConstellation";
import { TimelineRiver } from "@/components/admin/TimelineRiver";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAdminSession } from "@/hooks/useAdminSession";
import { postCommandCenter } from "@/lib/commandCenterApi";
import { clearAdminSession, getAdminSessionToken } from "@/lib/adminSession";
import { supabase } from "@/lib/supabase";

function TrendBars({
  trend,
}: {
  trend: { day: string; count: number }[];
}) {
  const max = Math.max(1, ...trend.map((t) => t.count));
  return (
    <div className="flex h-28 items-end gap-1 border-b border-[hsl(var(--ac-border))] pb-1">
      {trend.map((t) => (
        <div key={t.day} className="flex flex-1 flex-col items-center gap-1">
          <div
            className="w-full max-w-[28px] rounded-t bg-[hsl(var(--ac-gold))]/40"
            style={{ height: `${(t.count / max) * 100}%`, minHeight: t.count ? 4 : 0 }}
            title={`${t.day}: ${t.count}`}
          />
          <span className="rotate-45 text-[9px] text-[hsl(var(--ac-muted))]">{t.day.slice(5)}</span>
        </div>
      ))}
    </div>
  );
}

export default function AdminCommandCenter() {
  const { gate, setGate } = useAdminSession();
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get("view") === "timeline" ? "timeline" : "hub";

  const setView = (next: "hub" | "timeline") => {
    setSearchParams(next === "hub" ? {} : { view: "timeline" }, { replace: true });
  };

  const [hubLoading, setHubLoading] = useState(true);
  const [hubValue, setHubValue] = useState(0);
  const [hubLabel, setHubLabel] = useState("");
  const [doors, setDoors] = useState<HubDoorPayload[]>([]);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetDoor, setSheetDoor] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailRecent, setDetailRecent] = useState<Record<string, unknown>[]>([]);
  const [detailTrend, setDetailTrend] = useState<{ day: string; count: number }[]>([]);

  const loadHub = useCallback(async () => {
    setHubLoading(true);
    const { data, error } = await postCommandCenter<{
      hubValue?: number;
      hubLabel?: string;
      doors?: HubDoorPayload[];
    }>({ query: "hub_metrics" });
    setHubLoading(false);
    if (error || !data?.doors) {
      setDoors([]);
      return;
    }
    setHubValue(data.hubValue ?? 0);
    setHubLabel(data.hubLabel ?? "");
    setDoors(data.doors as HubDoorPayload[]);
  }, []);

  useEffect(() => {
    if (gate !== "authed") return;
    void postCommandCenter({ query: "cc_log_page_view", view });
  }, [gate, view]);

  useEffect(() => {
    if (gate !== "authed" || view !== "hub") return;
    void loadHub();
  }, [gate, view, loadHub]);

  const openDoor = async (doorId: string) => {
    setSheetDoor(doorId);
    setSheetOpen(true);
    setDetailLoading(true);
    setDetailRecent([]);
    setDetailTrend([]);
    const { data, error } = await postCommandCenter<{
      recent?: Record<string, unknown>[];
      trend?: { day: string; count: number }[];
    }>({ query: "door_detail", door_id: doorId });
    setDetailLoading(false);
    if (error || !data) return;
    setDetailRecent(data.recent ?? []);
    setDetailTrend(data.trend ?? []);
  };

  const handleLogout = async () => {
    if (!supabase) return;
    const t = getAdminSessionToken();
    if (t) await supabase.rpc("admin_logout", { p_token: t });
    clearAdminSession();
    window.location.assign("/admin/command-center");
  };

  if (gate === "checking") {
    return (
      <div className="admin-campaign-shell ac-sans px-4 py-16 text-center text-sm text-[hsl(var(--ac-muted))]">
        Checking session…
      </div>
    );
  }

  if (gate === "login") {
    return <AdminLoginForm onSuccess={() => setGate("authed")} />;
  }

  return (
    <div className="admin-campaign-shell ac-sans min-h-screen px-4 py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-[hsl(var(--ac-gold))]">AI Readiness Labs</p>
            <h1 className="mt-2 font-serif text-3xl font-normal text-[hsl(var(--ac-heading))]">
              Admin · Command Center
            </h1>
            <p className="mt-2 max-w-xl text-sm text-[hsl(var(--ac-muted))]">
              Operational pulse across doors — constellation overview or full timeline.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" size="sm" className="border-[hsl(var(--ac-border))]">
              <Link to="/admin/campaigns">Campaigns</Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-[hsl(var(--ac-border))] text-[hsl(var(--ac-muted))]"
              onClick={() => void handleLogout()}
            >
              Log out
            </Button>
          </div>
        </header>

        <nav className="flex flex-wrap gap-2 border-b border-[hsl(var(--ac-border))] pb-3">
          <Button
            type="button"
            variant={view === "hub" ? "default" : "ghost"}
            className={view === "hub" ? "bg-[hsl(var(--ac-gold))] text-[hsl(var(--ac-bg))]" : ""}
            onClick={() => setView("hub")}
          >
            Hub Constellation
          </Button>
          <Button
            type="button"
            variant={view === "timeline" ? "default" : "ghost"}
            className={view === "timeline" ? "bg-[hsl(var(--ac-gold))] text-[hsl(var(--ac-bg))]" : ""}
            onClick={() => setView("timeline")}
          >
            Timeline River
          </Button>
        </nav>

        {view === "hub" ? (
          <div className="overflow-x-auto pb-6">
            <div className="flex min-w-[720px] justify-center">
              <HubConstellation
                hubValue={hubValue}
                hubLabel={hubLabel || "Today's signal"}
                doors={doors}
                loading={hubLoading}
                onDoorClick={(id) => void openDoor(id)}
              />
            </div>
            <div className="mt-6 flex justify-center">
              <Button type="button" variant="outline" className="border-[hsl(var(--ac-gold))]" onClick={() => void loadHub()}>
                Refresh metrics
              </Button>
            </div>
          </div>
        ) : (
          <TimelineRiver active />
        )}
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="right"
          className="w-full overflow-y-auto border-[hsl(var(--ac-border))] bg-[hsl(var(--ac-panel))] sm:max-w-lg"
        >
          <SheetHeader>
            <SheetTitle className="font-serif text-[hsl(var(--ac-heading))]">
              {sheetDoor} · Door detail
            </SheetTitle>
          </SheetHeader>
          {detailLoading ? (
            <p className="mt-4 text-sm text-[hsl(var(--ac-muted))]">Loading…</p>
          ) : (
            <div className="mt-6 space-y-6">
              <div>
                <h3 className="text-xs uppercase tracking-wide text-[hsl(var(--ac-muted))]">Last 7 days</h3>
                <TrendBars trend={detailTrend} />
              </div>
              <div>
                <h3 className="text-xs uppercase tracking-wide text-[hsl(var(--ac-muted))]">Recent (10)</h3>
                <ul className="mt-2 space-y-2 text-sm text-[hsl(var(--ac-text))]">
                  {detailRecent.map((r, i) => (
                    <li key={i} className="rounded border border-[hsl(var(--ac-border))] bg-black/20 p-2 font-mono text-[11px]">
                      <pre className="whitespace-pre-wrap break-all">{JSON.stringify(r, null, 2)}</pre>
                    </li>
                  ))}
                </ul>
                {detailRecent.length === 0 ? (
                  <p className="text-sm italic text-[hsl(var(--ac-muted))]">No rows yet for this door.</p>
                ) : null}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
