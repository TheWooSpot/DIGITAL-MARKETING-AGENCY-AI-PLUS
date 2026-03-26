/**
 * Vapi emits nested objects on `error` / `call-start-failed` (e.g. HTTP 403 bodies).
 * Flatten to a string for UI + logging.
 */
export function extractVapiErrorMessage(e: unknown): string {
  if (e == null) return "Something went wrong";
  if (typeof e === "string") return e;
  if (e instanceof Error) return e.message;

  const walk = (obj: unknown, depth: number): string | null => {
    if (depth > 6 || obj == null) return null;
    if (typeof obj === "string") return obj;
    if (typeof obj !== "object") return null;
    const o = obj as Record<string, unknown>;
    /** OpenAPI / fetch client: `{ response: { status, data } }` */
    if (o.response && typeof o.response === "object") {
      const r = o.response as Record<string, unknown>;
      const status = typeof r.status === "number" ? r.status : null;
      const fromData = r.data != null ? walk(r.data, depth + 1) : null;
      if (status != null && fromData) return `HTTP ${status}: ${fromData}`;
      if (fromData) return fromData;
    }
    if (typeof o.message === "string" && o.message.length > 0) return o.message;
    if (typeof o.detail === "string") return o.detail;
    if (typeof o.error === "string") return o.error;
    if (typeof o.statusCode === "number" && typeof o.message === "string") return o.message;
    if (o.message && typeof o.message === "object") {
      const inner = walk(o.message, depth + 1);
      if (inner) return inner;
    }
    if (o.error && typeof o.error === "object") {
      const inner = walk(o.error, depth + 1);
      if (inner) return inner;
    }
    if (o.data && typeof o.data === "object") {
      const inner = walk(o.data, depth + 1);
      if (inner) return inner;
    }
    return null;
  };

  const found = walk(e, 0);
  if (found) return found;
  try {
    return JSON.stringify(e).slice(0, 500);
  } catch {
    return "Something went wrong";
  }
}

/** User-facing hint when Vapi HTTP layer returns 403 / Forbidden. */
export function appendVapi403Hint(message: string): string {
  const lower = message.toLowerCase();
  if (!lower.includes("403") && !lower.includes("forbidden")) return message;
  return `${message} — Check: (1) Vapi Dashboard → API Keys → copy the **Public** key into Vercel as VITE_VAPI_PUBLIC_KEY (not the private key). (2) The assistant ID belongs to the **same** Vapi org as that key. (3) If your org uses **allowed domains / origins** for web calls, add your production host (e.g. socialutely-any-door-engine.vercel.app). Rebuild after changing env vars.`;
}
