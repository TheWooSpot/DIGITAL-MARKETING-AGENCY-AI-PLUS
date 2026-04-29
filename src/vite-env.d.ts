/// <reference types="vite/client" />

declare module "*.html?raw" {
  const content: string;
  export default content;
}

interface ImportMetaEnv {
  readonly VITE_VAPI_PUBLIC_KEY: string;
  /** Evaluation Specialist assistant UUID (Vapi dashboard). Required for `vapi.start()`. */
  readonly VITE_VAPI_ASSISTANT_ID?: string;
  /** Door 13 · DreamScape™ Amelia (Vapi). Mirrors ElevenLabs agent; use for `vapi.start()` on that entry. */
  readonly VITE_DREAMSCAPE_ASSISTANT_ID?: string;
  /** Door 7 · DreamScape™ Amelia — ElevenLabs ConvAI agent id for `Conversation.startSession` on /dream. */
  readonly VITE_DREAMSCAPE_ELEVENLABS_AGENT_ID?: string;
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
  readonly VITE_STRIPE_PAYMENT_LINK_ESSENTIALS?: string;
  readonly VITE_STRIPE_PAYMENT_LINK_MOMENTUM?: string;
  readonly VITE_STRIPE_PAYMENT_LINK_SIGNATURE?: string;
  readonly VITE_STRIPE_PAYMENT_LINK_VANGUARD?: string;
  /**
   * AI IQ™ assessment CTAs — same-origin paths or full URLs.
   * Defaults in app: /ai-readiness/rung-2, /ai-readiness/rung-3; Rung 4 CTA defaults to /ai-readiness/rung-4 if unset.
   */
  readonly VITE_AI_IQ_RUNG2_URL?: string;
  readonly VITE_AI_IQ_RUNG3_URL?: string;
  readonly VITE_AI_IQ_DISCOVERY_CALENDAR_URL?: string;
  /** Partner brief gate (/partner-brief). Case-insensitive match. Default scaffold: PARTNER */
  readonly VITE_PARTNER_BRIEF_ACCESS_PHRASE?: string;
  /** Lite admin (/admin/campaigns). Must match Supabase secret `ADMIN_ACCESS_PHRASE` for server actions. */
  readonly VITE_ADMIN_ACCESS_PHRASE?: string;
  /** Supabase table for `?token=` partner brief access rows (default: partner_brief_tokens). */
  readonly VITE_PARTNER_BRIEF_SUPABASE_TABLE?: string;
  /** Column matched against the URL `token` query param (default: token). */
  readonly VITE_PARTNER_BRIEF_TOKEN_COLUMN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
