import type { ReactNode } from "react";
import { Link } from "react-router-dom";

/** Matches D-2 · The Mirror / Door B1 URL diagnostic: centered nav, Cormorant hero — inherits global grid from `body`. */
export function AnyDoorPageShell({
  children,
  backHref = "/",
  backLabel = "← Platform home",
}: {
  children: ReactNode;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="anydoor-exp-body min-h-screen selection:bg-[#c9973a]/25 selection:text-white">
      <main className="mx-auto max-w-5xl px-4 py-8 sm:py-12 lg:max-w-6xl">
        <nav className="no-print mb-8 text-center">
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
