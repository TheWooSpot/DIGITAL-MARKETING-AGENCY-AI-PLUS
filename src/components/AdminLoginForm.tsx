import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { setAdminSession } from "@/lib/adminSession";

type AdminLoginRow = {
  success: boolean;
  session_token: string | null;
  expires_at: string | null;
  error_message: string | null;
};

type AdminLoginFormProps = {
  onSuccess: () => void;
};

/**
 * Calls `admin_login` RPC. Stores opaque session token + expiry — never the plaintext phrase.
 */
export function AdminLoginForm({ onSuccess }: AdminLoginFormProps) {
  const [phrase, setPhrase] = useState("");
  const [error, setError] = useState<string | null>(null);

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

    if (rpcErr) {
      setError("Could not reach the server. Try again.");
      return;
    }

    const result = (data as AdminLoginRow[] | null | undefined)?.[0];
    if (!result?.success) {
      setError(result?.error_message?.trim() || "Login failed");
      return;
    }

    const token = result.session_token?.trim();
    if (!token) {
      setError(result?.error_message?.trim() || "Login failed");
      return;
    }

    setAdminSession(token, result.expires_at);
    setPhrase("");
    onSuccess();
  }, [phrase, onSuccess]);

  if (!supabase) {
    return (
      <div className="admin-campaign-shell ac-sans mx-auto flex min-h-[60vh] max-w-sm flex-col justify-center gap-6 px-4 py-16">
        <p className="text-sm text-red-400">Supabase is not configured.</p>
      </div>
    );
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
