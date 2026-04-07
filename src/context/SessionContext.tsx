import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "socialutely.session.v1";

export type SessionState = {
  name: string;
  email: string;
  url: string;
  /** Overall diagnostic score (e.g. URL diagnostic `scores.overall`) or AI IQ total when set from that flow. */
  diagnostic_score: number | null;
  /** Public report / scan token from diagnostic (e.g. `share_token`). */
  scan_token: string;
  recommended_tier: string;
};

const defaultSession: SessionState = {
  name: "",
  email: "",
  url: "",
  diagnostic_score: null,
  scan_token: "",
  recommended_tier: "",
};

function loadSession(): SessionState {
  if (typeof window === "undefined") return { ...defaultSession };
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultSession };
    const parsed = JSON.parse(raw) as Partial<SessionState>;
    return {
      ...defaultSession,
      ...parsed,
      diagnostic_score:
        typeof parsed.diagnostic_score === "number" && !Number.isNaN(parsed.diagnostic_score)
          ? parsed.diagnostic_score
          : parsed.diagnostic_score === null
            ? null
            : defaultSession.diagnostic_score,
    };
  } catch {
    return { ...defaultSession };
  }
}

export type SessionContextValue = SessionState & {
  mergeSession: (partial: Partial<SessionState>) => void;
  clearSession: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>(loadSession);

  const mergeSession = useCallback((partial: Partial<SessionState>) => {
    setState((prev) => {
      const next = { ...prev, ...partial };
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore quota / private mode */
      }
      return next;
    });
  }, []);

  const clearSession = useCallback(() => {
    setState({ ...defaultSession });
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      ...state,
      mergeSession,
      clearSession,
    }),
    [state, mergeSession, clearSession]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession must be used within SessionProvider");
  }
  return ctx;
}
