import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminLoginForm } from "@/components/AdminLoginForm";
import { PartnerCampaignCard } from "@/components/admin/PartnerCampaignCard";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import { clearAdminSession, getAdminSessionToken } from "@/lib/adminSession";
import { campaignNeedsEmail, type CampaignSurface } from "@/lib/adminCampaignSurfaces";
import { toast } from "sonner";

const DEFAULT_SUBJECT = "AI Readiness Labs — Partner Brief";
const DEFAULT_BRIEF_TOPIC = "AI Readiness Labs";

type PartnerRow = {
  token: string;
  partner_first_name: string;
  partner_last_name: string | null;
  partner_name: string | null;
  partner_email: string;
  call_count?: number | null;
  created_at?: string | null;
};

const SAVED_GROUP_1_FIRST = new Set(["chris", "will", "eugene"]);
const SAVED_GROUP_2_FIRST = new Set(["anthony", "tony", "frank", "eugene"]);

function displayName(p: PartnerRow): string {
  const last = (p.partner_last_name ?? "").trim();
  if (last) return `${p.partner_first_name} ${last}`.trim();
  const legacy = (p.partner_name ?? "").trim();
  if (legacy) return `${p.partner_first_name} (${legacy})`;
  return p.partner_first_name;
}

function normFirst(s: string): string {
  return s.trim().toLowerCase();
}

function maskEmailClient(email: string): string {
  const at = email.indexOf("@");
  if (at <= 0) return "***";
  return `***${email.slice(at)}`;
}

function groupLabelForPartner(firstName: string): string {
  const f = normFirst(firstName);
  const in1 = SAVED_GROUP_1_FIRST.has(f);
  const in2 = SAVED_GROUP_2_FIRST.has(f);
  if (in1 && in2) return "Group 1 & 2";
  if (in1) return "Group 1";
  if (in2) return "Group 2";
  return "—";
}

async function postAdminJson<T>(body: Record<string, unknown>): Promise<{
  data?: T;
  error?: string;
  status: number;
}> {
  const sessionToken = getAdminSessionToken();
  if (!sessionToken) {
    return { error: "Not signed in.", status: 401 };
  }
  const url = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, "");
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return { error: "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.", status: 0 };
  }
  const res = await fetch(`${url}/functions/v1/admin-send-invitations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: key,
      Authorization: `Bearer ${key}`,
      "X-Admin-Session": sessionToken,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data: T | undefined;
  try {
    data = text ? (JSON.parse(text) as T) : undefined;
  } catch {
    data = undefined;
  }
  if (!res.ok) {
    const err = (data as { error?: string } | undefined)?.error ?? text.slice(0, 240);
    return { error: err, status: res.status, data };
  }
  return { data, status: res.status };
}

function AdminCampaignsInner() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [partners, setPartners] = useState<PartnerRow[]>([]);
  const [grantsByToken, setGrantsByToken] = useState<Record<string, string[]>>({});

  const [selectedTokens, setSelectedTokens] = useState<Set<string>>(new Set());
  const [selectionOrder, setSelectionOrder] = useState<string[]>([]);

  /** Per-partner surface picks for the next send (not global). */
  const [surfaceSelections, setSurfaceSelections] = useState<Record<string, CampaignSurface[]>>({});

  const [emailSubject, setEmailSubject] = useState(DEFAULT_SUBJECT);
  const [briefTopic, setBriefTopic] = useState(DEFAULT_BRIEF_TOPIC);
  const [customIntro, setCustomIntro] = useState("");
  const [considerationHours, setConsiderationHours] = useState(96);

  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [sendBusy, setSendBusy] = useState(false);
  const [sendMessage, setSendMessage] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [addBusy, setAddBusy] = useState(false);
  const [newFirst, setNewFirst] = useState("");
  const [newLast, setNewLast] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newMaxCalls, setNewMaxCalls] = useState(5);
  const [newNotes, setNewNotes] = useState("");

  const refresh = useCallback(async () => {
    if (!supabase) {
      setLoadError("Supabase client is not configured.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    const { data: pRows, error: pErr } = await supabase
      .from("partner_brief_tokens")
      .select(
        "token, partner_first_name, partner_last_name, partner_name, partner_email, is_active, call_count, created_at",
      )
      .eq("is_active", true)
      .not("partner_first_name", "is", null);

    if (pErr) {
      setLoadError(pErr.message);
      setLoading(false);
      return;
    }

    const list = (pRows ?? []) as PartnerRow[];
    setPartners(list);

    const { data: gRows, error: gErr } = await supabase
      .from("share_grants")
      .select("partner_token, surface")
      .is("revoked_at", null);

    if (gErr) {
      setLoadError(gErr.message);
      setLoading(false);
      return;
    }

    const map: Record<string, string[]> = {};
    for (const row of gRows ?? []) {
      const tok = row.partner_token as string;
      const surf = row.surface as string;
      if (!tok || !surf) continue;
      if (!map[tok]) map[tok] = [];
      map[tok].push(surf);
    }
    for (const k of Object.keys(map)) {
      map[k].sort();
    }
    setGrantsByToken(map);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /** Keep per-partner surface maps aligned with loaded partner rows (preserve selections). */
  useEffect(() => {
    setSurfaceSelections((prev) => {
      const next = { ...prev };
      for (const p of partners) {
        if (!(p.token in next)) next[p.token] = [];
      }
      for (const k of Object.keys(next)) {
        if (!partners.some((p) => p.token === k)) delete next[k];
      }
      return next;
    });
  }, [partners]);

  const togglePartner = (token: string) => {
    setSelectedTokens((prev) => {
      const next = new Set(prev);
      if (next.has(token)) {
        next.delete(token);
        setSelectionOrder((o) => o.filter((t) => t !== token));
      } else {
        next.add(token);
        setSelectionOrder((o) => [...o.filter((t) => t !== token), token]);
      }
      return next;
    });
  };

  const applySavedGroup = (which: 1 | 2) => {
    const want = which === 1 ? SAVED_GROUP_1_FIRST : SAVED_GROUP_2_FIRST;
    const next = new Set<string>();
    const order: string[] = [];
    for (const p of partners) {
      if (want.has(normFirst(p.partner_first_name))) {
        next.add(p.token);
        order.push(p.token);
      }
    }
    setSelectedTokens(next);
    setSelectionOrder(order);
  };

  const toggleSurfaceForPartner = useCallback((token: string, id: CampaignSurface) => {
    setSurfaceSelections((prev) => {
      const cur = new Set(prev[token] ?? []);
      if (cur.has(id)) cur.delete(id);
      else cur.add(id);
      return { ...prev, [token]: Array.from(cur) };
    });
  }, []);

  const previewRecipientToken = useMemo(() => {
    for (const t of selectionOrder) {
      if (selectedTokens.has(t)) return t;
    }
    return null;
  }, [selectionOrder, selectedTokens]);

  const previewPartner = useMemo(() => {
    if (!previewRecipientToken) return null;
    return partners.find((p) => p.token === previewRecipientToken) ?? null;
  }, [partners, previewRecipientToken]);

  const previewSurfaceList = previewRecipientToken
    ? surfaceSelections[previewRecipientToken] ?? []
    : [];

  const canSend = useMemo(() => {
    if (selectedTokens.size === 0) return false;
    for (const t of selectedTokens) {
      const arr = surfaceSelections[t];
      if (!arr || arr.length === 0) return false;
    }
    return true;
  }, [selectedTokens, surfaceSelections]);

  const submitNewPartner = async () => {
    const fn = newFirst.trim();
    const ln = newLast.trim();
    const em = newEmail.trim().toLowerCase();
    if (!fn) {
      toast.error("First name is required.");
      return;
    }
    if (!ln) {
      toast.error("Last name is required.");
      return;
    }
    if (!em || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      toast.error("Enter a valid email address.");
      return;
    }
    setAddBusy(true);
    const { data, error, status } = await postAdminJson<{ partner?: PartnerRow; error?: string }>({
      action: "create_partner",
      partner_first_name: fn,
      partner_last_name: ln,
      partner_email: em,
      max_calls: Number.isFinite(newMaxCalls) ? newMaxCalls : 5,
      notes: newNotes.trim() || undefined,
    });
    setAddBusy(false);
    if (status === 401 || error) {
      toast.error(status === 401 ? "Session expired. Sign in again." : error ?? "Could not create partner.");
      return;
    }
    if (data?.partner) {
      toast.success(`Partner added — token ends …${data.partner.token.slice(-8)}`);
      setAddOpen(false);
      setNewFirst("");
      setNewLast("");
      setNewEmail("");
      setNewMaxCalls(5);
      setNewNotes("");
      await refresh();
      return;
    }
    toast.error("Unexpected response from server.");
  };

  const handleLogout = async () => {
    if (!supabase) return;
    const t = getAdminSessionToken();
    if (t) {
      await supabase.rpc("admin_logout", { p_token: t });
    }
    clearAdminSession();
    window.location.assign("/admin/campaigns");
  };

  const runPreview = async () => {
    if (!previewPartner || !getAdminSessionToken()) return;
    setPreviewLoading(true);
    setPreviewError(null);
    const surfaces = previewSurfaceList;
    if (surfaces.length === 0) {
      setPreviewLoading(false);
      setPreviewError("Choose at least one surface on this partner’s card to preview.");
      return;
    }
    const { data, error, status } = await postAdminJson<{ html?: string }>({
      action: "preview",
      invitation: {
        partner_email: previewPartner.partner_email,
        partner_first_name: previewPartner.partner_first_name,
        brief_token: previewPartner.token,
        brief_topic: briefTopic.trim() || DEFAULT_BRIEF_TOPIC,
        surfaces,
        custom_intro: customIntro.trim() || undefined,
        consideration_hours: considerationHours,
      },
    });
    setPreviewLoading(false);
    if (error || !data?.html) {
      setPreviewError(
        status === 401 ? "Session expired or unauthorized. Sign in again." : error ?? "Preview failed.",
      );
      setPreviewHtml(null);
      return;
    }
    setPreviewHtml(data.html);
    setPreviewOpen(true);
  };

  const runSend = async () => {
    if (!supabase || !getAdminSessionToken()) return;
    const tokens = Array.from(selectedTokens);
    if (tokens.length === 0) {
      setSendMessage("Select at least one partner.");
      return;
    }
    if (!canSend) {
      setSendMessage("Each checked partner needs at least one surface selected on their card.");
      return;
    }

    setSendBusy(true);
    setSendMessage(null);

    try {
      const invitations = tokens
        .map((t) => partners.find((p) => p.token === t))
        .filter((p): p is PartnerRow => Boolean(p))
        .map((p) => ({
          partner_email: p.partner_email,
          partner_first_name: p.partner_first_name,
          brief_token: p.token,
          brief_topic: briefTopic.trim() || DEFAULT_BRIEF_TOPIC,
          surfaces: surfaceSelections[p.token] ?? [],
          email_subject: emailSubject.trim() || DEFAULT_SUBJECT,
          custom_intro: customIntro.trim() || undefined,
          consideration_hours: considerationHours,
        }));

      if (invitations.length === 0) {
        setSendMessage("No matching partners for the selected recipients. Try refreshing the list.");
        return;
      }

      type SendRow = {
        success: boolean;
        http_status?: number;
        error?: string;
        brief_token_suffix: string;
        resend_id?: string;
        surfaces_granted?: string[];
        surfaces_failed?: Array<{ surface: string; reason: string }>;
      };

      const { data, error, status } = await postAdminJson<{ results?: SendRow[] }>({
        action: "send_invitations",
        invitations,
      });

      let emailSummary = "";
      let anyEmail401 = false;

      if (status === 401 || error) {
        anyEmail401 = status === 401;
        emailSummary = error ?? "Request failed.";
      } else if (data?.results) {
        const failed = data.results.filter((r) => !r.success);
        anyEmail401 = failed.some((r) => r.http_status === 401);
        const withEmail = invitations.some((inv) => campaignNeedsEmail(inv.surfaces));
        if (failed.length === 0) {
          const emailed = data.results.filter((r) => r.resend_id);
          emailSummary = withEmail
            ? emailed.length > 0
              ? `Sent or queued: ${emailed.length} email(s). Grants: server-confirmed.`
              : "Grants saved (no Partner Brief / Roundtable in this send — no email)."
            : `Grants only: ${data.results.length} partner(s) updated.`;
        } else {
          const detail = failed
            .map((r) => {
              const sf = r.surfaces_failed?.length
                ? ` — grants: ${r.surfaces_failed.map((f) => `${f.surface} (${f.reason})`).join("; ")}`
                : "";
              return `${r.brief_token_suffix}: ${r.error ?? "failed"}${sf}`;
            })
            .join(" | ");
          emailSummary = `Some operations failed (${failed.length}/${data.results.length}). ${detail}`;
        }
      } else {
        emailSummary = "Unexpected response from server.";
      }

      await refresh();

      const parts: string[] = [emailSummary];
      if (anyEmail401) {
        parts.push("Authorization failed (401). Sign in again or check your admin session.");
      }
      setSendMessage(parts.join(" "));
    } finally {
      setSendBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-campaign-shell ac-sans px-4 py-12 text-sm text-[hsl(var(--ac-muted))]">
        Loading partners…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="admin-campaign-shell ac-sans px-4 py-12">
        <p className="text-red-400">{loadError}</p>
        <Button type="button" variant="outline" className="mt-4" onClick={() => void refresh()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="admin-campaign-shell ac-sans min-h-screen px-4 py-10">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 max-[720px]:max-w-full">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-[hsl(var(--ac-gold))]">
              AI Readiness Labs
            </p>
            <h1 className="mt-2 font-serif text-3xl font-normal text-[hsl(var(--ac-heading))]">
              Admin · Campaigns
            </h1>
            <p className="mt-2 max-w-xl text-sm text-[hsl(var(--ac-muted))]">
              Check partners to include in a send. Each card has its own surface chips — group presets only change who is
              checked, not surfaces. Preview uses the first checked partner’s surfaces. Grants run first; email sends
              when Partner Brief or Roundtable is included.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="shrink-0 border-[hsl(var(--ac-border))] text-[hsl(var(--ac-muted))] hover:text-[hsl(var(--ac-text))]"
            onClick={() => void handleLogout()}
          >
            Log out
          </Button>
        </header>

        {/* Controls: group presets + add partner */}
        <section className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="border-[hsl(var(--ac-gold))]/50 text-[hsl(var(--ac-text))]"
              onClick={() => applySavedGroup(1)}
            >
              Group 1
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="border-[hsl(var(--ac-gold))]/50 text-[hsl(var(--ac-text))]"
              onClick={() => applySavedGroup(2)}
            >
              Group 2
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="border-[hsl(var(--ac-gold))]/50 text-[hsl(var(--ac-text))]"
              onClick={() => setAddOpen(true)}
            >
              Add new partner +
            </Button>
          </div>
        </section>

        {/* Partner cards (stack) */}
        <section className="flex flex-col gap-4">
          {partners.map((p) => (
            <PartnerCampaignCard
              key={p.token}
              partner={{
                token: p.token,
                partner_first_name: p.partner_first_name,
                partner_last_name: p.partner_last_name,
                partner_name: p.partner_name,
                partner_email: p.partner_email,
                call_count: p.call_count,
              }}
              groupLabel={groupLabelForPartner(p.partner_first_name)}
              maskedEmail={maskEmailClient(p.partner_email)}
              grantsActive={grantsByToken[p.token] ?? []}
              checked={selectedTokens.has(p.token)}
              selectedSurfaces={new Set(surfaceSelections[p.token] ?? [])}
              onTogglePartner={() => togglePartner(p.token)}
              onToggleSurface={(id) => toggleSurfaceForPartner(p.token, id)}
              showAdminBadge={false}
            />
          ))}
        </section>

        {/* Composition */}
        <section className="rounded-lg border border-[hsl(var(--ac-border))] bg-[hsl(var(--ac-panel))] p-5 shadow-sm">
          <h2 className="font-serif text-xl text-[hsl(var(--ac-heading))]">Composition</h2>
          <div className="mt-4 grid gap-4">
            <div className="space-y-2">
              <Label className="text-[hsl(var(--ac-muted))]">Email subject</Label>
              <Input
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="border-[hsl(var(--ac-border))] bg-[hsl(var(--ac-bg))] text-[hsl(var(--ac-text))]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[hsl(var(--ac-muted))]">Brief topic (template)</Label>
              <Input
                value={briefTopic}
                onChange={(e) => setBriefTopic(e.target.value)}
                className="border-[hsl(var(--ac-border))] bg-[hsl(var(--ac-bg))] text-[hsl(var(--ac-text))]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[hsl(var(--ac-muted))]">Consideration hours (roundtable copy)</Label>
              <Input
                type="number"
                min={1}
                value={considerationHours}
                onChange={(e) => setConsiderationHours(Number(e.target.value) || 96)}
                className="border-[hsl(var(--ac-border))] bg-[hsl(var(--ac-bg))] text-[hsl(var(--ac-text))]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[hsl(var(--ac-muted))]">Custom intro (optional, plain text)</Label>
              <Textarea
                value={customIntro}
                onChange={(e) => setCustomIntro(e.target.value)}
                rows={4}
                className="border-[hsl(var(--ac-border))] bg-[hsl(var(--ac-bg))] text-[hsl(var(--ac-text))]"
              />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={!previewPartner || previewLoading || previewSurfaceList.length === 0}
              onClick={() => void runPreview()}
              className="border-[hsl(var(--ac-gold))] text-[hsl(var(--ac-gold))]"
            >
              {previewLoading ? "Preview…" : "Preview"}
            </Button>

            <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
              <DialogContent className="max-h-[90vh] max-w-3xl border-[hsl(var(--ac-border))] bg-[hsl(var(--ac-panel))] text-[hsl(var(--ac-text))]">
                <DialogHeader>
                  <DialogTitle className="font-serif text-[hsl(var(--ac-heading))]">
                    Email preview
                    {previewPartner ? ` — ${displayName(previewPartner)}` : ""}
                  </DialogTitle>
                </DialogHeader>
                {previewError ? <p className="text-sm text-red-400">{previewError}</p> : null}
                {previewHtml ? (
                  <ScrollArea className="mt-2 h-[70vh] rounded border border-[hsl(var(--ac-border))] bg-white">
                    <iframe
                      title="Email preview"
                      className="h-[800px] w-full border-0"
                      srcDoc={previewHtml}
                    />
                  </ScrollArea>
                ) : null}
              </DialogContent>
            </Dialog>

            <Button
              type="button"
              disabled={sendBusy || !canSend}
              onClick={() => void runSend()}
              className="bg-[hsl(var(--ac-gold))] text-[hsl(var(--ac-bg))] hover:bg-[hsl(var(--ac-gold))]/90"
            >
              {sendBusy ? "Sending…" : "Send"}
            </Button>
          </div>
          {sendMessage ? (
            <p className="mt-4 text-sm text-[hsl(var(--ac-muted))]">{sendMessage}</p>
          ) : null}
        </section>

        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogContent className="max-w-md border-[hsl(var(--ac-border))] bg-[hsl(var(--ac-panel))] text-[hsl(var(--ac-text))]">
            <DialogHeader>
              <DialogTitle className="font-serif text-[hsl(var(--ac-heading))]">Add new partner</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 pt-2">
              <div className="space-y-2">
                <Label className="text-[hsl(var(--ac-muted))]">First name</Label>
                <Input
                  value={newFirst}
                  onChange={(e) => setNewFirst(e.target.value)}
                  className="border-[hsl(var(--ac-border))] bg-[hsl(var(--ac-bg))]"
                  autoComplete="given-name"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[hsl(var(--ac-muted))]">Last name</Label>
                <Input
                  value={newLast}
                  onChange={(e) => setNewLast(e.target.value)}
                  className="border-[hsl(var(--ac-border))] bg-[hsl(var(--ac-bg))]"
                  autoComplete="family-name"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[hsl(var(--ac-muted))]">Email</Label>
                <Input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="border-[hsl(var(--ac-border))] bg-[hsl(var(--ac-bg))]"
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[hsl(var(--ac-muted))]">Max calls (optional, default 5)</Label>
                <Input
                  type="number"
                  min={0}
                  value={newMaxCalls}
                  onChange={(e) => setNewMaxCalls(Number(e.target.value) || 5)}
                  className="border-[hsl(var(--ac-border))] bg-[hsl(var(--ac-bg))]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[hsl(var(--ac-muted))]">Notes (optional)</Label>
                <Textarea
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  rows={3}
                  className="border-[hsl(var(--ac-border))] bg-[hsl(var(--ac-bg))]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={addBusy}
                  className="bg-[hsl(var(--ac-gold))] text-[hsl(var(--ac-bg))]"
                  onClick={() => void submitNewPartner()}
                >
                  {addBusy ? "Saving…" : "Create token"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

type AdminGate = "checking" | "login" | "authed";

export default function AdminCampaigns() {
  const [gate, setGate] = useState<AdminGate>("checking");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!supabase) {
        if (!cancelled) setGate("login");
        return;
      }
      const token = getAdminSessionToken();
      if (!token) {
        if (!cancelled) setGate("login");
        return;
      }
      const { data, error } = await supabase.rpc("admin_validate_session", { p_token: token });
      if (cancelled) return;
      if (error || data !== true) {
        clearAdminSession();
        setGate("login");
        return;
      }
      setGate("authed");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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

  return <AdminCampaignsInner />;
}
