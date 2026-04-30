/** Bundled HTML (keep in sync with send-brief-invitation/brief-invitation-template.ts) */
export const BRIEF_INVITATION_HTML: string = `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Partner brief invitation</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#0a0c12;">
  <!-- {{consideration_hours}} {{window_days}} -->
  <div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;color:#07090f;">
    A private brief — about fifteen minutes — at your own pace.&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;
  </div>
  <!--[if mso | IE]>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#0a0c12;"><tr><td align="center">
  <![endif]-->
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#07090f;border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;">
    <tr>
      <td align="center" style="padding:32px 12px;background-color:#07090f;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="718" style="width:100%;max-width:718px;border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;">
          <tr>
            <td style="padding:0;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
                <tr>
                  <td align="center" style="padding:0 8px 8px 8px;">
                    <p style="margin:0;font-family:Arial,Helvetica,Verdana,system-ui,sans-serif;font-size:11px;line-height:1.5;letter-spacing:0.28em;text-transform:uppercase;color:#c9993a;">
                      AI READINESS LABS · PARTNER BRIEF
                    </p>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:0 8px 28px 8px;">
                    <h1 style="margin:0;font-family:Georgia,'Times New Roman',Times,serif;font-size:30px;line-height:1.25;font-weight:400;color:#ffffff;">
                      You've been invited.
                    </h1>
                  </td>
                </tr>
              </table>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
                <tr>
                  <td style="padding:0 8px 14px 8px;font-family:Arial,Helvetica,Verdana,system-ui,sans-serif;font-size:16px;line-height:1.6;color:#d6dadf;">
                    {{partner_first_name}},
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 8px 18px 8px;font-family:Arial,Helvetica,Verdana,system-ui,sans-serif;font-size:17px;line-height:1.6;color:#d6dadf;">
                    The team is preparing a private brief on {{brief_topic}}, and your perspective would be genuinely valuable.
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:0 8px 10px 8px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
                      <tr>
                        <td align="center" bgcolor="#c9993a" style="background-color:#c9993a;border-radius:4px;mso-padding-alt:14px 28px;">
                          <!--[if mso]>
                          <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="{{brief_url}}" style="height:48px;v-text-anchor:middle;width:638px;" arcsize="8%" stroke="f" fillcolor="#c9993a">
                            <w:anchorlock/>
                            <center style="color:#07090f;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;letter-spacing:0.04em;">Open my brief</center>
                          </v:roundrect>
                          <![endif]-->
                          <!--[if !mso]><!-- -->
                          <a href="{{brief_url}}" role="button" target="_blank" rel="noopener noreferrer" style="display:block;padding:14px 28px;font-family:Arial,Helvetica,Verdana,system-ui,sans-serif;font-size:16px;line-height:1.25;font-weight:700;letter-spacing:0.04em;color:#07090f;text-decoration:none;border-radius:4px;background-color:#c9993a;">
                            Open my brief
                          </a>
                          <!--<![endif]-->
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:0 8px 20px 8px;font-family:Arial,Helvetica,Verdana,system-ui,sans-serif;font-size:12px;line-height:1.5;color:#6b7280;word-break:break-all;">
                    {{brief_url}}
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 8px 28px 8px;border-top:1px solid #1f2330;font-size:1px;line-height:1px;">&nbsp;</td>
                </tr>
                <tr>
                  <td style="padding:0 8px 8px 8px;font-family:Arial,Helvetica,Verdana,system-ui,sans-serif;font-size:11px;line-height:1.5;letter-spacing:0.16em;text-transform:uppercase;color:#6b7280;">
                    Your access
                  </td>
                </tr>
                {{surfaces_shared_block}}
                <tr>
                  <td style="padding:0 8px 28px 8px;border-top:1px solid #1f2330;font-size:1px;line-height:1px;">&nbsp;</td>
                </tr>
                <tr>
                  <td style="padding:0 8px 14px 8px;font-family:Arial,Helvetica,Verdana,system-ui,sans-serif;font-size:17px;line-height:1.6;color:#d6dadf;">
                    The brief is about fifteen minutes — a one-on-one conversation with Mr. Mackleberry covering what {{brief_topic}} is, the four-rung structure, where things stand today, and where we'd welcome your thinking.
                  </td>
                </tr>
                {{include_roundtable_mention}}
                <tr>
                  <td style="padding:0 8px 22px 8px;font-family:Arial,Helvetica,Verdana,system-ui,sans-serif;font-size:17px;line-height:1.6;color:#d6dadf;">
                    Open the brief whenever it suits you. Your link stays active, and you can return to it as many times as you need.
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 8px 28px 8px;border-top:1px solid #1f2330;font-size:1px;line-height:1px;">&nbsp;</td>
                </tr>
                <tr>
                  <td style="padding:0 8px 14px 8px;font-family:Arial,Helvetica,Verdana,system-ui,sans-serif;font-size:14px;line-height:1.65;color:#9ca3af;">
                    Questions? Reply to this email — the team will see it.
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 8px 14px 8px;font-family:Arial,Helvetica,Verdana,system-ui,sans-serif;font-size:14px;line-height:1.65;color:#9ca3af;">
                    The conversation is private — between you, Mr. Mackleberry, and the team.
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:0 8px 8px 8px;font-family:Arial,Helvetica,Verdana,system-ui,sans-serif;font-size:11px;line-height:1.6;color:#6b7280;">
                    This invitation reaches you because you've been specifically invited as a partner. If you've received this in error, simply reply and the team will sort it out.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
  <!--[if mso | IE]>
  </td></tr></table>
  <![endif]-->
</body>
</html>
`;


export const SURFACE_LABELS: Record<string, string> = {
  partner_brief_labs: "Partner Brief — Mack",
  roundtable_calendar: "Roundtable Calendar",
  door_2_lens: "Door 2 Lens",
  door_4_compass: "Door 4 Compass",
  door_7_architect: "Door 7 Architect",
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
                    After the brief, you'll see a calendar of available times for a sixty-minute partner working session. Tap any times that work — when the group converges on a single hour, calendar invites go out automatically. You'll have ${hours} hours, no rush.
                  </td>
                </tr>`;
}

function surfacesSharedBlockHtml(surfaces: string[] | undefined): string {
  if (!surfaces?.length) return "";
  const text = surfaces
    .map((id) => {
      const label = SURFACE_LABELS[id] ?? id;
      return escapeHtml(label);
    })
    .join(" · ");
  return `<tr>
                  <td style="padding:0 8px 14px 8px;font-family:Arial,Helvetica,Verdana,system-ui,sans-serif;font-size:17px;line-height:1.6;color:#d6dadf;">
                    ${text}
                  </td>
                </tr>`;
}

export function buildBriefInvitationHtml(input: BriefInvitationBuildInput): string {
  const origin = input.brief_app_origin ?? DEFAULT_BRIEF_ORIGIN;
  const brief_url = `${origin}/partner-brief?token=${encodeURIComponent(input.brief_token)}`;
  const window_days = Math.max(1, Math.ceil(input.consideration_hours / 24));
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
    surfaces_shared_block,
  });
}
