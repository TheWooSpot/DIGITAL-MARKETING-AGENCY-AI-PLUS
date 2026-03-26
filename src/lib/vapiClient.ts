import Vapi from "@vapi-ai/web";

const key = (import.meta.env.VITE_VAPI_PUBLIC_KEY as string | undefined)?.trim() ?? "";

/**
 * Single `@vapi-ai/web` client for the whole app. Krisp (noise cancellation) must load once;
 * multiple `new Vapi()` calls cause: "KrispSDK - The KrispSDK is duplicated."
 */
export const vapi: Vapi | null = key ? new Vapi(key) : null;
