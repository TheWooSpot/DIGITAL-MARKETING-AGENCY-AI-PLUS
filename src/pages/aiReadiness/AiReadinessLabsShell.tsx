import type { ReactNode } from "react";
import { Link } from "react-router-dom";

export const ARL_BG = "#070d1a";
export const ARL_CARD = "#0e1829";
export const ARL_GOLD = "#c9a227";
export const ARL_BORDER = "rgba(201,162,39,0.25)";
export const ARL_WHITE = "#f0f2f8";
export const ARL_DIM = "rgba(240,242,248,0.55)";

export function AiReadinessLabsShell({
  children,
  eyebrow,
}: {
  children: ReactNode;
  eyebrow: string;
}) {
  return (
    <div
      className="relative z-10 min-h-screen pb-20 selection:bg-[#c9a227]/30 selection:text-white"
      style={{
        color: ARL_WHITE,
        fontFamily: "'Archivo', system-ui, sans-serif",
      }}
    >
      <header
        className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-4 sm:px-8"
        style={{ borderBottomWidth: 1, borderBottomColor: ARL_GOLD }}
      >
        <Link to="/" className="text-sm font-semibold tracking-tight" style={{ color: ARL_GOLD }}>
          ← Home
        </Link>
        <span className="text-xs font-mono uppercase tracking-[0.2em]" style={{ color: ARL_DIM }}>
          {eyebrow}
        </span>
      </header>
      <div className="relative z-10 mx-auto max-w-3xl px-4 pt-10 sm:px-6">{children}</div>
    </div>
  );
}
