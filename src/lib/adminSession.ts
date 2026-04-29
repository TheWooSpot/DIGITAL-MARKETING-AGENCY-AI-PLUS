/** Session token from `admin_login` RPC; stored client-side only after login. */
export const ADMIN_SESSION_STORAGE_KEY = "socialutely_admin_session";

/** ISO expiry from `admin_login` (`expires_at`); informational — server validates on each request. */
export const ADMIN_SESSION_EXPIRES_KEY = "socialutely_admin_session_expires";

export function getAdminSessionToken(): string | null {
  if (typeof sessionStorage === "undefined") return null;
  const t = sessionStorage.getItem(ADMIN_SESSION_STORAGE_KEY);
  const trimmed = t?.trim();
  return trimmed || null;
}

export function setAdminSession(token: string, expiresAt: string | null): void {
  sessionStorage.setItem(ADMIN_SESSION_STORAGE_KEY, token.trim());
  if (expiresAt?.trim()) {
    sessionStorage.setItem(ADMIN_SESSION_EXPIRES_KEY, expiresAt.trim());
  } else {
    sessionStorage.removeItem(ADMIN_SESSION_EXPIRES_KEY);
  }
}

export function clearAdminSession(): void {
  sessionStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
  sessionStorage.removeItem(ADMIN_SESSION_EXPIRES_KEY);
}
