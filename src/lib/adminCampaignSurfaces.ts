export type CampaignSurface =
  | "partner_brief_labs"
  | "roundtable_calendar"
  | "door_2_lens"
  | "door_7_dreamscape"
  | "door_9_ai_iq";

export type CampaignSurfaceOption = {
  id: CampaignSurface;
  label: string;
  /** When true, selecting this surface triggers the partner-brief email path (with aggregated surfaces in the template). */
  sendsEmailToday: boolean;
};

export const CAMPAIGN_SURFACE_OPTIONS: CampaignSurfaceOption[] = [
  { id: "partner_brief_labs", label: "Partner Brief", sendsEmailToday: true },
  { id: "roundtable_calendar", label: "Roundtable Calendar", sendsEmailToday: true },
  { id: "door_2_lens", label: "Door 2 · Lens", sendsEmailToday: false },
  { id: "door_7_dreamscape", label: "Door 7 · Dreamscape", sendsEmailToday: false },
  { id: "door_9_ai_iq", label: "Door 9 · AI IQ", sendsEmailToday: false },
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
