import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/anydoor/lib/supabaseBrowserClient";

export type CheckoutVariant = "A" | "B";

const FALLBACK: CheckoutVariant = "A";

function normalizeVariant(raw: string | null | undefined): CheckoutVariant {
  const v = (raw ?? "").trim().toUpperCase();
  if (v === "B") return "B";
  return "A";
}

/**
 * Active checkout experiment variant from Supabase `checkout_config.active_checkout_variant`.
 * Override: set `VITE_CHECKOUT_VARIANT_OVERRIDE` to `A` or `B` (non-empty) to bypass remote config.
 */
export function useCheckoutConfig(): {
  variant: CheckoutVariant;
  loading: boolean;
  error: string | null;
} {
  const [variant, setVariant] = useState<CheckoutVariant>(FALLBACK);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const override = (import.meta.env.VITE_CHECKOUT_VARIANT_OVERRIDE as string | undefined)?.trim();
    if (override) {
      setVariant(normalizeVariant(override));
      setLoading(false);
      setError(null);
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        if (!cancelled) {
          setVariant(FALLBACK);
          setError(null);
          setLoading(false);
        }
        return;
      }

      const { data, error: qErr } = await supabase
        .from("checkout_config")
        .select("config_value")
        .eq("config_key", "active_checkout_variant")
        .maybeSingle();

      if (cancelled) return;

      if (qErr) {
        setVariant(FALLBACK);
        setError(qErr.message);
        setLoading(false);
        return;
      }

      const v = normalizeVariant(data?.config_value as string | undefined);
      setVariant(v);
      setError(null);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { variant, loading, error };
}
