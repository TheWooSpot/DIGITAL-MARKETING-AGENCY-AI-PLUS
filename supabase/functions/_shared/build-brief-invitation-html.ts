import { BRIEF_INVITATION_HTML } from "../send-brief-invitation/brief-invitation-template.ts";

export const SURFACE_LABELS: Record<string, string> = {
  partner_brief_labs: "Partner Brief",
  roundtable_calendar: "Roundtable Calendar",
  door_2_lens: "Door 2 · Lens",
  door_7_dreamscape: "Door 7 · Dreamscape",
  door_9_ai_iq: "Door 9 · AI IQ",
};

export type BriefInvitationBuildInput = {
  partner_first_name: string;
  brief_topic: string;
  brief_token: string;
  /** Defaults to production brief host. */
  brief_app_origin?: string;
  consideration_hours: number;
  include_roundtable_mention: boolean;
  custom_intro?: string;
  surfaces?: string[];
};

const DEFAULT_BRIEF_ORIGIN = "https://socialutely-any-door-engine.vercel.app";

function replaceVars(html: string, vars: Record<string, string>): string {
  let out = html;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{{${k}}}`).join(v);
  }
  return out;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Whole `<tr>...</tr>` for the optional roundtable paragraph, or empty. */
function roundtableSectionHtml(include: boolean, considerationHours: number): string {
  if (!include) return "";
  const hours = String(considerationHours);
  return `<tr>
                  <td style="padding:0 8px 14px 8px;font-family:Arial,Helvetica,Verdana,system-ui,sans-serif;font-size:17px;line-height:1.6;color:#d6dadf;">
                    After the brief, you'll see a calendar of available times for a sixty-minute partner working session. Tap any times that work for you — when the group converges on a single hour, calendar invites go out automatically. You'll have ${hours} hours to tap, so there's no rush.
                  </td>
                </tr>`;
}

function customIntroBlockHtml(intro: string | undefined): string {
  if (!intro?.trim()) return "";
  const paras = intro
    .trim()
    .split(/\n\n+/)
    .map((p) => `<p style="margin:0 0 14px 0;">${escapeHtml(p).replace(/\n/g, "<br/>")}</p>`)
    .join("");
  return `<tr>
                  <td style="padding:0 8px 14px 8px;font-family:Arial,Helvetica,Verdana,system-ui,sans-serif;font-size:17px;line-height:1.6;color:#d6dadf;">
                    ${paras}
                  </td>
                </tr>`;
}

function surfacesSharedBlockHtml(surfaces: string[] | undefined): string {
  if (!surfaces?.length) return "";
  const items = surfaces
    .map((id) => {
      const label = SURFACE_LABELS[id] ?? id;
      return `<li style="margin:0 0 6px 0;">${escapeHtml(label)}</li>`;
    })
    .join("");
  return `<tr>
                  <td style="padding:0 8px 14px 8px;font-family:Arial,Helvetica,Verdana,system-ui,sans-serif;font-size:17px;line-height:1.6;color:#d6dadf;">
                    <p style="margin:0 0 10px 0;">This update includes access to:</p>
                    <ul style="margin:0;padding-left:20px;">${items}</ul>
                  </td>
                </tr>`;
}

export function buildBriefInvitationHtml(input: BriefInvitationBuildInput): string {
  const origin = input.brief_app_origin ?? DEFAULT_BRIEF_ORIGIN;
  const brief_url = `${origin}/partner-brief?token=${encodeURIComponent(input.brief_token)}`;
  const window_days = Math.max(1, Math.ceil(input.consideration_hours / 24));
  const custom_intro_block = customIntroBlockHtml(input.custom_intro);
  const surfaces_shared_block = surfacesSharedBlockHtml(input.surfaces);

  return replaceVars(BRIEF_INVITATION_HTML, {
    partner_first_name: input.partner_first_name,
    brief_topic: input.brief_topic,
    brief_url,
    consideration_hours: String(input.consideration_hours),
    window_days: String(window_days),
    include_roundtable_mention: roundtableSectionHtml(
      input.include_roundtable_mention,
      input.consideration_hours,
    ),
    custom_intro_block,
    surfaces_shared_block,
  });
}
