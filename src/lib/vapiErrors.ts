/**
 * Vapi emits nested objects on `error` / `call-start-failed` (e.g. HTTP 403 bodies).
 * Flatten to a string for UI + logging.
 */
export function extractVapiErrorMessage(e: unknown): string {
  if (e == null || e === undefined) return "Voice connection unavailable. Please try again in a moment.";
  if (typeof e === "string") return e.trim() || "Voice connection unavailable. Please try again in a moment.";
  if (e instanceof Error) return e.message || "Voice connection unavailable. Please try again in a moment.";

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
  if (found && found.trim()) return found;
  try {
    const s = JSON.stringify(e);
    if (!s || s === "undefined" || s === "null" || s === "{}") {
      return "Voice connection unavailable. Please try again in a moment.";
    }
    return s.slice(0, 500);
  } catch {
    return "Voice connection unavailable. Please try again in a moment.";
  }
}

/** User-facing hint when Vapi HTTP layer returns 403 / Forbidden. */
export function appendVapi403Hint(message: string): string {
  const lower = message.toLowerCase();
  if (!lower.includes("403") && !lower.includes("forbidden")) return message;
  return `${message} — Check: (1) Vapi Dashboard → API Keys → copy the **Public** key into Vercel as VITE_VAPI_PUBLIC_KEY (not the private key). (2) The assistant ID belongs to the **same** Vapi org as that key. (3) If your org uses **allowed domains / origins** for web calls, add your production host (e.g. socialutely-any-door-engine.vercel.app). Rebuild after changing env vars.`;
}

/**
 * Public key + assistant must belong to the same Vapi org, and the key's allowed-origins
 * list must include the current host. Vapi returns distinct messages for each case:
 *   - Origin not allowed:    "Key doesn't allow origin '<url>'"
 *   - Assistant not allowed: "Key doesn't allow assistantId '<uuid>'"
 */
export function appendVapiAssistantKeyHint(message: string): string {
  const lower = message.toLowerCase();
  const currentOrigin = typeof window !== "undefined" ? window.location.origin : "this host";

  /** Origin allowlist violation — most common during local dev. */
  if (lower.includes("doesn't allow origin") || lower.includes("does not allow origin")) {
    return `${message} — Fix: Your Vapi public key has an **allowed-origins list** that doesn't include \`${currentOrigin}\`. In Vapi Dashboard → API Keys, edit the public key and add \`${currentOrigin}\` to its allowed origins. Or use a separate key for local dev.`;
  }

  /** Assistant/org mismatch — key and assistant UUID belong to different Vapi orgs. */
  if (lower.includes("doesn't allow assistantid") || lower.includes("does not allow assistantid")) {
    return `${message} — Fix: Your VITE_VAPI_PUBLIC_KEY and the assistant UUID must be from the **same Vapi organization**. Either copy the **Public** key from the org that owns this assistant into Vercel, or change VITE_VAPI_ASSISTANT_ID (and redeploy) to an assistant that exists under the org for your current key.`;
  }

  /** Other "key doesn't allow …" variants — keep a generic helpful hint. */
  if (lower.includes("key doesn't allow") || lower.includes("key does not allow")) {
    return `${message} — Check your Vapi key permissions: origin allowlist, allowed assistants, and that the key belongs to the correct org.`;
  }

  return appendVapi403Hint(message);
}
