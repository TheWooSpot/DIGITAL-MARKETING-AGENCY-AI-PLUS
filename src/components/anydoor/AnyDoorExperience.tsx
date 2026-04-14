import type { ReactNode } from "react";
import { Link } from "react-router-dom";

export { AnyDoorEntryScreen } from "./AnyDoorEntryScreen";

/** AnyDoor inner pages: generous top padding, back link top-left. Use `narrow` for 580px door entries (default). */
export function AnyDoorPageShell({
  children,
  backHref = "/",
  backLabel = "← Home",
  narrow = true,
}: {
  children: ReactNode;
  backHref?: string;
  backLabel?: string;
  /** Default true — max 580px centered (nine doors). Set false for labs / long-form layouts. */
  narrow?: boolean;
}) {
  return (
    <div className="anydoor-exp-body min-h-screen selection:bg-[#c9973a]/25 selection:text-white">
      <main
        className={`relative mx-auto w-full px-4 pb-16 pt-20 sm:px-6 ${
          narrow ? "max-w-[580px]" : "max-w-5xl lg:max-w-6xl"
        }`}
      >
        <nav className="no-print mb-10 text-left">
          <Link to={backHref} className="anydoor-exp-navlink">
            {backLabel}
          </Link>
        </nav>
        {children}
      </main>
    </div>
  );
}

export function AnyDoorHero({
  eyebrow,
  titleAccent,
  titleRest,
  subtitle,
  className,
}: {
  eyebrow: string;
  titleAccent: string;
  titleRest: string;
  subtitle?: string;
  className?: string;
}) {
  return (
    <header className={className ?? "mb-10 text-center sm:mb-14"}>
      <p className="anydoor-exp-eyebrow">{eyebrow}</p>
      <h1 className="anydoor-exp-title">
        <span className="anydoor-exp-title-accent">{titleAccent}</span>
        <span className="anydoor-exp-title-rest">{titleRest}</span>
      </h1>
      {subtitle ? <p className="anydoor-exp-subtitle">{subtitle}</p> : null}
    </header>
  );
}
