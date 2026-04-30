/** Bundled HTML (keep in sync with send-brief-invitation/brief-invitation-template.ts) */
export const BRIEF_INVITATION_HTML: string = "<!DOCTYPE html>\r\n<html lang=\"en\" xmlns=\"http://www.w3.org/1999/xhtml\" xmlns:v=\"urn:schemas-microsoft-com:vml\" xmlns:o=\"urn:schemas-microsoft-com:office:office\">\r\n<head>\r\n  <meta charset=\"utf-8\" />\r\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />\r\n  <meta http-equiv=\"X-UA-Compatible\" content=\"IE=edge\" />\r\n  <title>Partner brief invitation</title>\r\n  <!--[if mso]>\r\n  <noscript>\r\n    <xml>\r\n      <o:OfficeDocumentSettings>\r\n        <o:PixelsPerInch>96</o:PixelsPerInch>\r\n      </o:OfficeDocumentSettings>\r\n    </xml>\r\n  </noscript>\r\n  <![endif]-->\r\n</head>\r\n<body style=\"margin:0;padding:0;background-color:#0a0c12;\">\r\n  <!-- {{consideration_hours}} {{window_days}} -->\r\n  <div style=\"display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;color:#07090f;\">\r\n    A private brief — about fifteen minutes — at your own pace.&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;\r\n  </div>\r\n  <!--[if mso | IE]>\r\n  <table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" width=\"100%\" style=\"background-color:#0a0c12;\"><tr><td align=\"center\">\r\n  <![endif]-->\r\n  <table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" width=\"100%\" style=\"background-color:#07090f;border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;\">\r\n    <tr>\r\n      <td align=\"center\" style=\"padding:32px 16px;background-color:#07090f;\">\r\n        <table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" width=\"600\" style=\"width:100%;max-width:600px;border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;\">\r\n          <tr>\r\n            <td style=\"padding:0;\">\r\n              <table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" width=\"100%\" style=\"border-collapse:collapse;\">\r\n                <tr>\r\n                  <td align=\"center\" style=\"padding:0 8px 8px 8px;\">\r\n                    <p style=\"margin:0;font-family:Arial,Helvetica,Verdana,system-ui,sans-serif;font-size:11px;line-height:1.5;letter-spacing:0.28em;text-transform:uppercase;color:#c9993a;\">\r\n                      AI READINESS LABS · PARTNER BRIEF\r\n                    </p>\r\n                  </td>\r\n                </tr>\r\n                <tr>\r\n                  <td align=\"center\" style=\"padding:0 8px 28px 8px;\">\r\n                    <h1 style=\"margin:0;font-family:Georgia,'Times New Roman',Times,serif;font-size:30px;line-height:1.25;font-weight:400;color:#ffffff;\">\r\n                      You've been invited.\r\n                    </h1>\r\n                  </td>\r\n                </tr>\r\n              </table>\r\n              <table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" width=\"100%\" style=\"border-collapse:collapse;\">\r\n                <tr>\r\n                  <td style=\"padding:0 8px 14px 8px;font-family:Arial,Helvetica,Verdana,system-ui,sans-serif;font-size:16px;line-height:1.6;color:#d6dadf;\">\r\n                    {{partner_first_name}},\r\n                  </td>\r\n                </tr>\r\n                {{custom_intro_block}}{{surfaces_shared_block}}\r\n                <tr>\r\n                  <td style=\"padding:0 8px 14px 8px;font-family:Arial,Helvetica,Verdana,system-ui,sans-serif;font-size:17px;line-height:1.6;color:#d6dadf;\">\r\n                    <p style=\"margin:0 0 14px 0;\">The team behind {{brief_topic}} is preparing a private brief on the program we've been building, and your perspective would be genuinely valuable.</p>\r\n                    <p style=\"margin:0;\">The brief is about fifteen minutes. It's a one-on-one conversation with Mr. Mackleberry, who walks through what {{brief_topic}} is, the four-rung structure we've designed, where things stand today, and where we'd welcome your thinking.</p>\r\n                  </td>\r\n                </tr>\r\n                {{include_roundtable_mention}}\r\n                <tr>\r\n                  <td style=\"padding:0 8px 22px 8px;font-family:Arial,Helvetica,Verdana,system-ui,sans-serif;font-size:17px;line-height:1.6;color:#d6dadf;\">\r\n                    Open the brief whenever it suits you. Your link stays active, and you can return to it as many times as you need.\r\n                  </td>\r\n                </tr>\r\n              </table>\r\n              <table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" width=\"100%\" style=\"border-collapse:collapse;\">\r\n                <tr>\r\n                  <td align=\"center\" style=\"padding:0 8px 12px 8px;\">\r\n                    <table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" width=\"100%\" style=\"border-collapse:collapse;\">\r\n                      <tr>\r\n                        <td align=\"center\" bgcolor=\"#c9993a\" style=\"background-color:#c9993a;border-radius:4px;mso-padding-alt:14px 28px;\">\r\n                          <!--[if mso]>\r\n                          <v:roundrect xmlns:v=\"urn:schemas-microsoft-com:vml\" xmlns:w=\"urn:schemas-microsoft-com:office:word\" href=\"{{brief_url}}\" style=\"height:48px;v-text-anchor:middle;width:520px;\" arcsize=\"8%\" stroke=\"f\" fillcolor=\"#c9993a\">\r\n                            <w:anchorlock/>\r\n                            <center style=\"color:#07090f;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;letter-spacing:0.04em;\">Open my brief</center>\r\n                          </v:roundrect>\r\n                          <![endif]-->\r\n                          <!--[if !mso]><!-- -->\r\n                          <a href=\"{{brief_url}}\" role=\"button\" target=\"_blank\" rel=\"noopener noreferrer\" style=\"display:block;padding:14px 28px;font-family:Arial,Helvetica,Verdana,system-ui,sans-serif;font-size:16px;line-height:1.25;font-weight:700;letter-spacing:0.04em;color:#07090f;text-decoration:none;border-radius:4px;background-color:#c9993a;\">\r\n                            Open my brief\r\n                          </a>\r\n                          <!--<![endif]-->\r\n                        </td>\r\n                      </tr>\r\n                    </table>\r\n                  </td>\r\n                </tr>\r\n              </table>\r\n              <table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" width=\"100%\" style=\"border-collapse:collapse;\">\r\n                <tr>\r\n                  <td align=\"center\" style=\"padding:0 8px 24px 8px;font-family:Arial,Helvetica,Verdana,system-ui,sans-serif;font-size:12px;line-height:1.5;color:#6b7280;word-break:break-all;\">\r\n                    {{brief_url}}\r\n                  </td>\r\n                </tr>\r\n              </table>\r\n              <table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" width=\"100%\" style=\"border-collapse:collapse;\">\r\n                <tr>\r\n                  <td style=\"padding:0 8px 28px 8px;font-family:Arial,Helvetica,Verdana,system-ui,sans-serif;font-size:14px;line-height:1.65;color:#9ca3af;\">\r\n                    The conversation is private — between you, Mr. Mackleberry, and the team. Nothing is shared elsewhere. There's no preparation required; bring whatever you'd like to think out loud about.\r\n                  </td>\r\n                </tr>\r\n              </table>\r\n              <table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" width=\"100%\" style=\"border-collapse:collapse;\">\r\n                <tr>\r\n                  <td align=\"center\" style=\"padding:0 8px 8px 8px;font-family:Arial,Helvetica,Verdana,system-ui,sans-serif;font-size:11px;line-height:1.6;color:#6b7280;\">\r\n                    This invitation reaches you because you've been specifically invited as a partner. If you've received this in error, simply reply and the team will sort it out.\r\n                  </td>\r\n                </tr>\r\n              </table>\r\n            </td>\r\n          </tr>\r\n        </table>\r\n      </td>\r\n    </tr>\r\n  </table>\r\n  <!--[if mso | IE]>\r\n  </td></tr></table>\r\n  <![endif]-->\r\n</body>\r\n</html>\r\n";


export const SURFACE_LABELS: Record<string, string> = {
  partner_brief_labs: "Partner Brief — Mack",
  roundtable_calendar: "Roundtable Calendar",
  door_2_lens: "Door 2 · Lens (URL diagnostic)",
  door_4_compass: "Door 4 · Compass (AI IQ)",
  door_7_architect: "Door 7 · Architect's Studio (Vision)",
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
