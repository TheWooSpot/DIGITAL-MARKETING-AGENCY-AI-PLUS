import type { CampaignSurface } from "@/lib/adminCampaignSurfaces";
import { CAMPAIGN_SURFACE_OPTIONS } from "@/lib/adminCampaignSurfaces";
import { CampaignSurfaceChip } from "@/components/admin/CampaignSurfaceChip";

export type PartnerCampaignCardPartner = {
  token: string;
  partner_first_name: string;
  partner_last_name: string | null;
  partner_name: string | null;
  partner_email: string;
  call_count?: number | null;
  /** When set (e.g. column exists), shown as relative time on subtitle line */
  last_activity_at?: string | null;
};

const SURFACE_CHIP_SHORT: Record<CampaignSurface, string> = {
  partner_brief_labs: "Brief",
  roundtable_calendar: "Roundtable",
  door_2_lens: "Door 2",
  door_4_compass: "Door 4",
  door_7_architect: "Door 7",
};

function surfaceLabelForId(id: string): string {
  return CAMPAIGN_SURFACE_OPTIONS.find((o) => o.id === id)?.label ?? id.replace(/_/g, " ");
}

function formatRelativeShort(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const now = Date.now();
  const sec = Math.round((now - then) / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 48) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  return `${d}d ago`;
}

type Props = {
  partner: PartnerCampaignCardPartner;
  groupLabel: string;
  maskedEmail: string;
  grantsActive: string[];
  checked: boolean;
  selectedSurfaces: Set<CampaignSurface>;
  onTogglePartner: () => void;
  onToggleSurface: (id: CampaignSurface) => void;
  showAdminBadge?: boolean;
};

export function PartnerCampaignCard({
  partner,
  groupLabel,
  maskedEmail,
  grantsActive,
  checked,
  selectedSurfaces,
  onTogglePartner,
  onToggleSurface,
  showAdminBadge,
}: Props) {
  const last = (partner.partner_last_name ?? "").trim();
  const title =
    last.length > 0
      ? `${partner.partner_first_name} ${last}`
      : `${partner.partner_first_name}`;

  const calls = partner.call_count ?? 0;
  const activity =
    partner.last_activity_at && partner.last_activity_at.length > 0
      ? formatRelativeShort(partner.last_activity_at)
      : null;

  const metaLine = [groupLabel, maskedEmail, `${calls} calls`, activity].filter(Boolean).join(" · ");

  return (
    <div
      className={`ac-partner-card rounded-[6px] border px-6 py-[18px] transition-colors ${checked ? "ac-partner-card--checked" : ""}`}
    >
      <div className="flex gap-4">
        <button
          type="button"
          className="ac-partner-check mt-0.5 shrink-0"
          aria-pressed={checked}
          onClick={onTogglePartner}
          aria-label={checked ? "Deselect partner" : "Select partner"}
        >
          <span className="ac-partner-check__box" data-checked={checked} />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="font-serif text-base leading-snug text-[hsl(var(--ac-heading))]">
                {title}
              </div>
              <div
                className="mt-1 text-[11px] leading-snug text-[hsl(var(--ac-muted))]"
                style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}
              >
                {metaLine}
              </div>
            </div>
            {showAdminBadge ? (
              <span
                className="shrink-0 rounded-full border border-[hsl(var(--ac-gold))]/45 bg-[hsl(var(--ac-gold))]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[hsl(var(--ac-gold))]"
                style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}
              >
                admin
              </span>
            ) : null}
          </div>

          <div
            className="mt-3 border-t border-[hsl(var(--ac-border))] pt-3 text-[13px] text-[hsl(var(--ac-muted))]"
            style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}
          >
            <span className="block text-[11px] uppercase tracking-wide text-[hsl(var(--ac-muted))]/90">
              Surfaces (tap to grant + include):
            </span>
            <div className="mt-2 flex flex-wrap gap-2">
              {CAMPAIGN_SURFACE_OPTIONS.map((opt) => (
                <CampaignSurfaceChip
                  key={opt.id}
                  id={opt.id}
                  label={SURFACE_CHIP_SHORT[opt.id]}
                  active={selectedSurfaces.has(opt.id)}
                  onToggle={() => onToggleSurface(opt.id)}
                />
              ))}
            </div>
            <p className="mt-3 text-[12px] italic text-[hsl(var(--ac-muted))]/90">
              Currently has:{" "}
              {grantsActive.length > 0 ? grantsActive.map(surfaceLabelForId).join(", ") : "none"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
