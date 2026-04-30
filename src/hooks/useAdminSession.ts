import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { clearAdminSession, getAdminSessionToken } from "@/lib/adminSession";

export type AdminSessionGate = "checking" | "login" | "authed";

/**
 * Shared admin gate: sessionStorage token + `admin_validate_session` RPC.
 * Same pattern as `/admin/campaigns`.
 */
export function useAdminSession(): { gate: AdminSessionGate; setGate: (g: AdminSessionGate) => void } {
  const [gate, setGate] = useState<AdminSessionGate>("checking");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!supabase) {
        if (!cancelled) setGate("login");
        return;
      }
      const token = getAdminSessionToken();
      if (!token) {
        if (!cancelled) setGate("login");
        return;
      }
      const { data, error } = await supabase.rpc("admin_validate_session", { p_token: token });
      if (cancelled) return;
      if (error || data !== true) {
        clearAdminSession();
        setGate("login");
        return;
      }
      setGate("authed");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { gate, setGate };
}
