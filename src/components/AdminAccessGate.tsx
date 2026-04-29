import { type ReactNode, useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AdminAccessGateProps = {
  /** Expected phrase from `import.meta.env.VITE_ADMIN_ACCESS_PHRASE`. */
  expectedPhrase: string;
  children: ReactNode;
};

const STORAGE_KEY = "admin_campaigns_phrase_ok_v1";

/**
 * Lightweight v1 gate: phrase is checked in the browser only.
 * Server-side enforcement still happens on `admin-send-invitations` via `ADMIN_ACCESS_PHRASE`.
 */
export function AdminAccessGate({ expectedPhrase, children }: AdminAccessGateProps) {
  const [unlocked, setUnlocked] = useState(() => {
    if (typeof sessionStorage === "undefined") return false;
    if (!expectedPhrase) return false;
    return sessionStorage.getItem(STORAGE_KEY) === "1";
  });
  const [phrase, setPhrase] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(() => {
    if (!expectedPhrase) {
      setError("This page is not configured (missing VITE_ADMIN_ACCESS_PHRASE).");
      return;
    }
    if (phrase.trim() !== expectedPhrase.trim()) {
      setError("That phrase does not match.");
      return;
    }
    sessionStorage.setItem(STORAGE_KEY, "1");
    setError(null);
    setUnlocked(true);
  }, [expectedPhrase, phrase]);

  if (!expectedPhrase) {
    return (
      <div className="admin-campaign-shell ac-sans mx-auto max-w-md px-4 py-16 text-center text-sm text-[hsl(var(--ac-muted))]">
        <p>Set <code className="text-xs">VITE_ADMIN_ACCESS_PHRASE</code> in your environment to use this page.</p>
      </div>
    );
  }

  if (unlocked) {
    return <>{children}</>;
  }

  return (
    <div className="admin-campaign-shell ac-sans mx-auto flex min-h-[60vh] max-w-sm flex-col justify-center gap-6 px-4 py-16">
      <div>
        <h1 className="font-serif text-2xl font-normal text-[hsl(var(--ac-heading))]">Admin access</h1>
        <p className="mt-2 text-sm text-[hsl(var(--ac-muted))]">Enter the admin phrase to continue.</p>
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
          onKeyDown={(e) => e.key === "Enter" && submit()}
          className="border-[hsl(var(--ac-border))] bg-[hsl(var(--ac-panel))] text-[hsl(var(--ac-text))]"
        />
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
      </div>
      <Button
        type="button"
        onClick={submit}
        className="bg-[hsl(var(--ac-gold))] text-[hsl(var(--ac-bg))] hover:bg-[hsl(var(--ac-gold))]/90"
      >
        Unlock
      </Button>
    </div>
  );
}
