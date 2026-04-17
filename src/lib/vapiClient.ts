import Vapi from "@vapi-ai/web";

const key = (import.meta.env.VITE_VAPI_PUBLIC_KEY as string | undefined)?.trim() ?? "";

// Log first 8 chars to confirm the key is loading (never log the full key)
if (key) {
  console.log("[vapiClient] Public key loaded:", key.slice(0, 8) + "...");
} else {
  console.warn("[vapiClient] VITE_VAPI_PUBLIC_KEY is missing or empty — voice will be disabled.");
}

/**
 * Single `@vapi-ai/web` client for the whole app. Krisp (noise cancellation) must load once;
 * multiple `new Vapi()` calls cause: "KrispSDK - The KrispSDK is duplicated."
 */
let _vapi: Vapi | null = null;
try {
  _vapi = key ? new Vapi(key) : null;
} catch (e) {
  console.error("[vapiClient] Failed to initialize Vapi client:", e);
  _vapi = null;
}
export const vapi: Vapi | null = _vapi;
