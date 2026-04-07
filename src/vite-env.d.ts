/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_VAPI_PUBLIC_KEY: string;
  /** Evaluation Specialist assistant UUID (Vapi dashboard). Required for `vapi.start()`. */
  readonly VITE_VAPI_ASSISTANT_ID?: string;
  /** Door 13 · DreamScape™ Amelia (Vapi). Mirrors ElevenLabs agent; use for `vapi.start()` on that entry. */
  readonly VITE_DREAMSCAPE_ASSISTANT_ID?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** ElevenLabs Conversational AI agent ids (never hardcode in components). */
  readonly VITE_ELEVENLABS_JORDAN_AGENT_ID?: string;
  readonly VITE_ELEVENLABS_JESSICA_AGENT_ID?: string;
  /** Marcus — Solutions Coordinator (ElevenLabs ConvAI). */
  readonly VITE_ELEVENLABS_MARCUS_AGENT_ID?: string;
  /** When set to `A` or `B`, overrides Supabase `checkout_config.active_checkout_variant`. */
  readonly VITE_CHECKOUT_VARIANT_OVERRIDE?: string;
  readonly VITE_STRIPE_PUBLISHABLE_KEY?: string;
  /**
   * AI IQ™ assessment CTAs — same-origin paths or full URLs.
   * Defaults in app: /ai-readiness/rung-2, /ai-readiness/rung-3, discovery calendar placeholder.
   */
  readonly VITE_AI_IQ_RUNG2_URL?: string;
  readonly VITE_AI_IQ_RUNG3_URL?: string;
  readonly VITE_AI_IQ_DISCOVERY_CALENDAR_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
