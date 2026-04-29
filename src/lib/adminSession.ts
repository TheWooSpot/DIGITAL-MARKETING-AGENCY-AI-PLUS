/** Session token from `admin_login` RPC; stored client-side only after login. */
export const ADMIN_SESSION_STORAGE_KEY = "socialutely_admin_session";

export function getAdminSessionToken(): string | null {
  if (typeof sessionStorage === "undefined") return null;
  const t = sessionStorage.getItem(ADMIN_SESSION_STORAGE_KEY);
  const trimmed = t?.trim();
  return trimmed || null;
}

export function setAdminSessionToken(token: string): void {
  sessionStorage.setItem(ADMIN_SESSION_STORAGE_KEY, token.trim());
}

export function clearAdminSession(): void {
  sessionStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
}
