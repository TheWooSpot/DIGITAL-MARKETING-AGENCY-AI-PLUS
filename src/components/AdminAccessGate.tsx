import { type ReactNode, useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import {
  clearAdminSession,
  getAdminSessionToken,
  setAdminSessionToken,
} from "@/lib/adminSession";

type GateState = "checking" | "login" | "authed";

type AdminAccessGateProps = {
  children: ReactNode;
};

type LoginRow = {
  session_token: string;
  expires_at: string;
};

/**
 * Server-backed admin login via `admin_login` / `admin_validate_session` RPCs.
 * Stores opaque session token in sessionStorage — never the plaintext phrase.
 */
export function AdminAccessGate({ children }: AdminAccessGateProps) {
  const [gate, setGate] = useState<GateState>("checking");
  const [phrase, setPhrase] = useState("");
  const [error, setError] = useState<string | null>(null);

  const validateStoredSession = useCallback(async (): Promise<boolean> => {
    if (!supabase) return false;
    const token = getAdminSessionToken();
    if (!token) return false;
    const { data, error: rpcErr } = await supabase.rpc("admin_validate_session", {
      p_token: token,
    });
    if (rpcErr) {
      clearAdminSession();
      return false;
    }
    return data === true;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!supabase) {
        if (!cancelled) {
          setError("Supabase is not configured.");
          setGate("login");
        }
        return;
      }
      const ok = await validateStoredSession();
      if (cancelled) return;
      if (ok) {
        setGate("authed");
      } else {
        setGate("login");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [validateStoredSession]);

  const submit = useCallback(async () => {
    if (!supabase) {
      setError("Supabase is not configured.");
      return;
    }
    setError(null);
    const { data, error: rpcErr } = await supabase.rpc("admin_login", {
      p_phrase: phrase,
      p_user_agent: typeof navigator !== "undefined" ? navigator.userAgent : "",
    });
    if (rpcErr || !data?.length) {
      setError("Invalid phrase");
      return;
    }
    const row = (data as LoginRow[])[0];
    if (!row?.session_token) {
      setError("Invalid phrase");
      return;
    }
    setAdminSessionToken(row.session_token);
    setPhrase("");
    setGate("authed");
  }, [phrase]);

  if (gate === "checking") {
    return (
      <div className="admin-campaign-shell ac-sans px-4 py-16 text-center text-sm text-[hsl(var(--ac-muted))]">
        Checking session…
      </div>
    );
  }

  if (gate === "authed") {
    return <>{children}</>;
  }

  return (
    <div className="admin-campaign-shell ac-sans mx-auto flex min-h-[60vh] max-w-sm flex-col justify-center gap-6 px-4 py-16">
      <div>
        <h1 className="font-serif text-2xl font-normal text-[hsl(var(--ac-heading))]">Admin access</h1>
        <p className="mt-2 text-sm text-[hsl(var(--ac-muted))]">Sign in with the admin phrase.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="admin-phrase" className="text-[hsl(var(--ac-muted))]">
          Phrase
        </Label>
        <Input
          id="admin-phrase"
          type="password"
          autoComplete="off"
          value={phrase}
          onChange={(e) => setPhrase(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void submit()}
          className="border-[hsl(var(--ac-border))] bg-[hsl(var(--ac-panel))] text-[hsl(var(--ac-text))]"
        />
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
      </div>
      <Button
        type="button"
        onClick={() => void submit()}
        className="bg-[hsl(var(--ac-gold))] text-[hsl(var(--ac-bg))] hover:bg-[hsl(var(--ac-gold))]/90"
      >
        Sign in
      </Button>
    </div>
  );
}
