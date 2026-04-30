export type CampaignSurface =
  | "partner_brief_labs"
  | "roundtable_calendar"
  | "door_2_lens"
  | "door_4_compass"
  | "door_7_architect";

export type CampaignSurfaceOption = {
  id: CampaignSurface;
  label: string;
  /** When true, selecting this surface triggers the partner-brief email path (with aggregated surfaces in the template). */
  sendsEmailToday: boolean;
};

export const CAMPAIGN_SURFACE_OPTIONS: CampaignSurfaceOption[] = [
  { id: "partner_brief_labs", label: "Partner Brief — Mack", sendsEmailToday: true },
  { id: "roundtable_calendar", label: "Roundtable Calendar", sendsEmailToday: true },
  { id: "door_2_lens", label: "Door 2 · Lens (URL diagnostic)", sendsEmailToday: false },
  { id: "door_4_compass", label: "Door 4 · Compass (AI IQ)", sendsEmailToday: false },
  { id: "door_7_architect", label: "Door 7 · Architect's Studio (Vision)", sendsEmailToday: false },
];

export const EMAIL_SURFACE_IDS: CampaignSurface[] = CAMPAIGN_SURFACE_OPTIONS.filter(
  (s) => s.sendsEmailToday,
).map((s) => s.id);

export function campaignNeedsEmail(surfaces: Iterable<CampaignSurface>): boolean {
  for (const s of surfaces) {
    if (s === "partner_brief_labs" || s === "roundtable_calendar") return true;
  }
  return false;
}
