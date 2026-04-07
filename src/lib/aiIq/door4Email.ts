/** Reject common personal email domains — business email expected. */
const BLOCKED_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.co.uk",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "msn.com",
  "icloud.com",
  "me.com",
  "aol.com",
  "protonmail.com",
  "proton.me",
  "gmx.com",
  "mail.com",
]);

export function getBusinessEmailError(email: string): string | null {
  const t = email.trim().toLowerCase();
  if (!t) return "Enter your business email.";
  const at = t.lastIndexOf("@");
  if (at < 1 || at === t.length - 1) return "Enter a valid email address.";
  const domain = t.slice(at + 1).trim();
  if (BLOCKED_DOMAINS.has(domain)) {
    return "Please use your work email (personal domains like Gmail or Yahoo are not accepted for this assessment).";
  }
  return null;
}
