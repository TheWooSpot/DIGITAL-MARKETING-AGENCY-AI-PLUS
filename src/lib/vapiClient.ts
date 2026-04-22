import Vapi from "@vapi-ai/web";

const VAPI_PUBLIC_KEY = import.meta.env.VITE_VAPI_PUBLIC_KEY;
export const hasVapiPublicKey = !!VAPI_PUBLIC_KEY;

if (!VAPI_PUBLIC_KEY) {
  console.error("[vapiClient] VITE_VAPI_PUBLIC_KEY is not set");
}

// Module-level singleton — exactly one Vapi instance across the whole app.
// This prevents Krisp noise-cancellation SDK duplication errors.
export const vapi: Vapi | null = VAPI_PUBLIC_KEY ? new Vapi(VAPI_PUBLIC_KEY) : null;

const DEFAULT_JORDAN_ASSISTANT_ID = "e48ee900-bfb0-4ee6-a645-e89a08233365";

function normalizedEnv(name: string): string {
  const raw = import.meta.env[name] as string | undefined;
  return (raw ?? "").replace(/[\r\n]/g, "").trim();
}

/**
 * Shared Evaluation Specialist assistant id.
 * Prefer env so the key+assistant stay in the same Vapi org.
 */
export function getEvaluationAssistantId(): string {
  return normalizedEnv("VITE_VAPI_ASSISTANT_ID") || DEFAULT_JORDAN_ASSISTANT_ID;
}

export const JORDAN_ASSISTANT_ID = getEvaluationAssistantId();
