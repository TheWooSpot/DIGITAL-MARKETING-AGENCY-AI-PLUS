/**
 * Canonical diagnostic report URLs.
 * Primary: permanent public link `/report/{prospectId}?k={report_access_key}` (capability URL, stored server-side).
 * Legacy: `/report/{share_token}` when id/key are unavailable.
 */

export type ReportLinkInput = {
  siteBaseUrl: string;
  /** Row UUID from layer5_prospects after insert */
  prospectId?: string;
  /** Opaque secret issued with the row; required with prospectId */
  reportAccessKey?: string;
  /** Legacy short token (client-generated) */
  shareToken?: string;
  /** When API returns a full canonical URL, prefer it */
  shareUrl?: string;
};

/**
 * Build the shareable report URL. Prefer `shareUrl` from API when present (includes correct production host).
 */
export function generateReportLink(input: ReportLinkInput): string {
  const fromApi = input.shareUrl?.trim();
  if (fromApi) return fromApi;

  const base = input.siteBaseUrl.replace(/\/$/, "");
  const id = input.prospectId?.trim();
  const key = input.reportAccessKey?.trim();
  if (id && key) {
    const q = new URLSearchParams({ k: key });
    return `${base}/report/${encodeURIComponent(id)}?${q.toString()}`;
  }

  const tok = input.shareToken;
  if (tok != null && tok !== "") return `${base}/report/${tok}`;

  return "";
}
