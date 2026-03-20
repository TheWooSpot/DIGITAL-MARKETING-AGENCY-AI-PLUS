import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { PLATFORM_CATEGORIES, PLATFORM_SERVICE_COUNT } from "@/data/platformCatalog";

const GOLD = "#c9973a";
const BG = "#07080d";

/**
 * Optional override if the URL diagnostic is hosted on another origin.
 * Default: same app — `/doors/url-diagnostic` on this Vite deployment.
 */
function getAnyDoorOrigin(): string {
  const env = import.meta.env.VITE_ANYDOOR_ORIGIN as string | undefined;
  if (env) return env.replace(/\/$/, "");
  return "";
}

type DoorStatus = "live" | "building" | "planned";

const DOORS: Array<{
  code: string;
  title: string;
  description: string;
  cta: string;
  status: DoorStatus;
  href?: string;
  active?: boolean;
}> = [
  {
    code: "b1",
    title: "URL Diagnostic",
    description: "Paste a URL. Get scored gaps, mapped services, and tier guidance in seconds.",
    cta: "Run Free Diagnostic",
    status: "live",
    href: "/doors/url-diagnostic",
    active: true,
  },
  {
    code: "b2",
    title: "Revenue Goal Planner",
    description: "Model growth targets and translate them into an execution-ready service stack.",
    cta: "Coming soon",
    status: "building",
  },
  {
    code: "a",
    title: "Guided Qualifier (Tally)",
    description: "Structured qualification flow that routes prospects to the right door.",
    cta: "Coming soon",
    status: "building",
  },
  {
    code: "c",
    title: "SMS Quick Scan",
    description: "Lightweight SMS capture for fast field diagnostics and follow-up.",
    cta: "Planned",
    status: "planned",
  },
  {
    code: "d",
    title: "AI Voice Conversation",
    description: "Voice-led discovery that feels consultative — not a chatbot demo.",
    cta: "Planned",
    status: "planned",
  },
  {
    code: "e",
    title: "AI Readiness Assessment",
    description: "Deeper maturity scoring for teams ready to operationalize AI safely.",
    cta: "Planned",
    status: "planned",
  },
];

function statusBadge(status: DoorStatus): { label: string; className: string } {
  if (status === "live") return { label: "LIVE", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" };
  if (status === "building")
    return { label: "BUILDING", className: "bg-amber-500/15 text-amber-400 border-amber-500/30" };
  return { label: "PLANNED", className: "bg-white/5 text-white/45 border-white/10" };
}

const PlatformHome = () => {
  const [activeCategory, setActiveCategory] = useState(PLATFORM_CATEGORIES[0].slug);
  const [diagnosticUrl, setDiagnosticUrl] = useState("");
  const anyDoorOrigin = useMemo(() => getAnyDoorOrigin(), []);
  const catalogScrollRef = useRef<HTMLDivElement>(null);

  const scrollToId = useCallback((id: string) => {
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  useLayoutEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");

    function mountObserver() {
      const scrollRoot = catalogScrollRef.current;
      const useInnerScrollRoot = mq.matches && scrollRoot != null;
      const root = useInnerScrollRoot ? scrollRoot : null;
      const rootMargin = useInnerScrollRoot ? "-28% 0px -32% 0px" : "-40% 0px -45% 0px";

      const obs = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting && e.target.id) {
              setActiveCategory(e.target.id.replace("category-", ""));
            }
          }
        },
        { root: root ?? undefined, rootMargin, threshold: 0 }
      );

      PLATFORM_CATEGORIES.forEach((c) => {
        const node = document.getElementById(`category-${c.slug}`);
        if (node) obs.observe(node);
      });

      return obs;
    }

    let obs = mountObserver();

    function onMqChange() {
      obs.disconnect();
      obs = mountObserver();
    }

    mq.addEventListener("change", onMqChange);
    return () => {
      mq.removeEventListener("change", onMqChange);
      obs.disconnect();
    };
  }, []);

  const analyzeHref =
    diagnosticUrl.trim().length > 0
      ? `${anyDoorOrigin}/doors/url-diagnostic?url=${encodeURIComponent(diagnosticUrl.trim())}`
      : `${anyDoorOrigin}/doors/url-diagnostic`;

  return (
    <div
      className="platform-home min-h-screen text-[#e8eef5] selection:bg-[#c9973a]/30 selection:text-white"
      style={{
        backgroundColor: BG,
        cursor: "crosshair",
        fontFamily: "'Archivo', system-ui, sans-serif",
      }}
    >
      {/* Grain + grid overlay */}
      <div className="pointer-events-none fixed inset-0 z-0 platform-grain" aria-hidden />
      <div className="pointer-events-none fixed inset-0 z-0 platform-grid opacity-[0.02]" aria-hidden />

      {/* Nav */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] bg-[#07080d]/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <button
            type="button"
            onClick={() => scrollToId("hero")}
            className="text-left text-sm font-medium tracking-tight text-white"
          >
            Socialutely <span style={{ color: GOLD }}>|</span>{" "}
            <span className="text-white/80">AI</span>
          </button>
          <nav className="hidden items-center gap-6 text-[11px] font-medium uppercase tracking-[0.2em] text-white/55 md:flex">
            <button type="button" className="hover:text-white" onClick={() => scrollToId("hero")}>
              Platform
            </button>
            <button type="button" className="hover:text-white" onClick={() => scrollToId("catalog")}>
              Services
            </button>
            <button type="button" className="hover:text-white" onClick={() => scrollToId("anydoor")}>
              AnyDoor Engine
            </button>
            <button type="button" className="hover:text-white" onClick={() => scrollToId("footer")}>
              About
            </button>
            <Link
              to="/doors/url-diagnostic"
              className="rounded border border-[#c9973a] bg-[#c9973a] px-4 py-2 text-[10px] font-semibold tracking-[0.18em] text-[#07080d] hover:bg-[#c9973a]/90"
            >
              Get Diagnostic
            </Link>
          </nav>
          <Link
            to="/doors/url-diagnostic"
            className="md:hidden rounded border border-[#c9973a] px-3 py-2 text-[10px] font-semibold tracking-widest text-[#c9973a]"
          >
            Diagnostic
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section
        id="hero"
        className="platform-hero-grid relative z-10 flex min-h-screen flex-col justify-end px-4 pb-16 pt-28 sm:px-6 sm:pb-24 lg:px-8"
      >
        <div className="relative z-10 mx-auto w-full max-w-6xl">
          <div className="platform-fade platform-fade-1 mb-6 font-mono text-[11px] uppercase tracking-[0.35em] text-white/40">
            AI Marketing Platform · AnyDoor Engine
          </div>
          <h1
            className="platform-fade platform-fade-2 max-w-4xl font-serif font-light leading-[0.95] tracking-tight text-white"
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "clamp(2.75rem, 7vw, 5.75rem)" }}
          >
            <span className="block">Intelligence that</span>
            <span className="block italic" style={{ color: GOLD }}>
              finds, scores,
            </span>
            <span className="block">and converts.</span>
          </h1>
          <p className="platform-fade platform-fade-3 mt-8 max-w-2xl text-base leading-relaxed text-white/55 sm:text-lg">
            Socialutely is an AI marketing platform built for operators who want clarity: what&apos;s broken, what to fix
            first, and which services actually move revenue. AnyDoor Engine is the product layer that opens multiple entry
            doors — starting with a live URL diagnostic — while the catalog stays anchored to{" "}
            <span className="text-white/75">{PLATFORM_SERVICE_COUNT} services</span> across{" "}
            <span className="text-white/75">10 categories</span>.
          </p>
          <div className="platform-fade platform-fade-4 mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
            <Link
              to="/doors/url-diagnostic"
              className="inline-flex items-center justify-center rounded border border-[#c9973a] bg-[#c9973a] px-8 py-3 text-xs font-semibold tracking-[0.2em] text-[#07080d] hover:bg-[#c9973a]/90"
            >
              Run Free Diagnostic
            </Link>
            <button
              type="button"
              onClick={() => scrollToId("catalog")}
              className="inline-flex items-center justify-center gap-2 rounded border border-white/15 bg-transparent px-8 py-3 text-xs font-semibold tracking-[0.2em] text-white/80 hover:border-white/25 hover:text-white"
            >
              Explore the platform <span aria-hidden>→</span>
            </button>
          </div>
        </div>

        {/* Stats — desktop */}
        <div className="pointer-events-none absolute bottom-24 right-6 z-10 hidden text-right font-mono text-[11px] leading-loose text-white/35 lg:block xl:right-12">
          <div>
            <span style={{ color: GOLD }}>{PLATFORM_SERVICE_COUNT}</span> services
          </div>
          <div>
            <span style={{ color: GOLD }}>10</span> categories
          </div>
          <div>
            <span style={{ color: GOLD }}>5</span> tiered packages
          </div>
        </div>
      </section>

      {/* AnyDoor doors */}
      <section id="anydoor" className="relative z-10 border-t border-white/[0.06] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.35em]" style={{ color: GOLD }}>
            AnyDoor Engine
          </p>
          <h2
            className="mt-4 font-serif text-4xl font-light text-white sm:text-5xl"
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
          >
            Many doors. One engine.
          </h2>
          <p className="mt-4 max-w-2xl text-sm text-white/50">
            Each door is an entry point. Behind them is the same orchestration philosophy: diagnose, map, recommend,
            and operationalize — without turning the platform into a noisy dashboard.
          </p>

          <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {DOORS.map((door) => {
              const badge = statusBadge(door.status);
              const content = (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-white/35">{door.code}</span>
                    <span
                      className={`rounded-full border px-2 py-0.5 font-mono text-[9px] font-medium tracking-widest ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                  </div>
                  <div
                    className="mt-5 flex h-10 w-10 items-center justify-center border"
                    style={{ borderColor: "rgba(255,255,255,0.12)" }}
                  >
                    <span className="font-mono text-[10px] text-white/25">◇</span>
                  </div>
                  <h3 className="mt-4 text-[15px] font-semibold leading-snug text-white">{door.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-white/45">{door.description}</p>
                  <div className="mt-6 font-mono text-[10px] uppercase tracking-[0.25em]" style={{ color: GOLD }}>
                    {door.cta}
                  </div>
                </>
              );

              const cardClass = `group relative rounded-lg border border-white/[0.08] bg-white/[0.02] p-5 transition-colors ${
                door.active ? "border-emerald-500/40" : ""
              } hover:border-[#c9973a]/60`;

              if (door.href) {
                return (
                  <Link key={door.code} to={door.href} className={cardClass}>
                    {content}
                  </Link>
                );
              }
              return (
                <div key={door.code} className={cardClass}>
                  {content}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Catalog */}
      <section id="catalog" className="relative z-10 border-t border-white/[0.06] px-4 py-20 sm:px-6 lg:px-8">
        <div className="platform-catalog-row mx-auto grid max-w-6xl grid-cols-1 gap-12 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start lg:gap-16">
          <aside className="platform-catalog-nav w-full min-w-0 self-start lg:sticky lg:top-[100px] lg:z-10 lg:w-auto">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.35em]" style={{ color: GOLD }}>
                Service catalog
              </p>
              <h2
                className="mt-3 font-serif text-3xl font-light text-white"
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
              >
                The full stack
              </h2>
              <nav className="mt-8 space-y-1 border-t border-white/[0.06] pt-6">
                {PLATFORM_CATEGORIES.map((cat) => {
                  const active = activeCategory === cat.slug;
                  return (
                    <button
                      key={cat.slug}
                      type="button"
                      onClick={() => {
                        setActiveCategory(cat.slug);
                        document.getElementById(`category-${cat.slug}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                      className={`flex w-full items-center gap-3 rounded px-2 py-2.5 text-left text-sm transition-colors ${
                        active ? "text-[#c9973a]" : "text-white/50 hover:text-white/75"
                      }`}
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full transition-colors"
                        style={{ backgroundColor: active ? GOLD : "rgba(255,255,255,0.2)" }}
                      />
                      <span className="flex-1">
                        {cat.number} {cat.name}
                      </span>
                      <span className="font-mono text-[11px] text-white/35">{cat.services.length}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </aside>

          <div
            ref={catalogScrollRef}
            className="platform-catalog-scroll min-w-0 flex-1 space-y-16"
          >
            {PLATFORM_CATEGORIES.map((cat) => (
              <div key={cat.slug} id={`category-${cat.slug}`} className="scroll-mt-32">
                <div className="flex flex-wrap items-baseline gap-3 border-b border-white/[0.06] pb-4">
                  <span className="font-mono text-xs text-white/35">{cat.number}</span>
                  <h3 className="font-serif text-2xl font-light text-white" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
                    {cat.name}
                  </h3>
                  <span className="font-mono text-[11px] text-white/35">{cat.services.length} services</span>
                </div>
                <div className="mt-6 grid grid-cols-1 gap-x-10 gap-y-4 sm:grid-cols-2">
                  {cat.services.map((s) => (
                    <div key={`${cat.slug}-${s.id}`} className="flex gap-3 border-b border-white/[0.04] pb-4">
                      <span className="font-mono text-sm tabular-nums" style={{ color: GOLD }}>
                        {s.id}
                      </span>
                      <span className="text-sm text-white/70">{s.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Diagnostic CTA */}
      <section id="diagnostic" className="relative z-10 border-t border-white/[0.06] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl rounded-lg border border-[#c9973a]/35 bg-white/[0.02] p-6 sm:p-10 lg:p-12">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <h2
                className="font-serif text-3xl font-light leading-tight text-white sm:text-4xl"
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
              >
                Enter a URL. Get a diagnosis.
              </h2>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <input
                  type="text"
                  value={diagnosticUrl}
                  onChange={(e) => setDiagnosticUrl(e.target.value)}
                  placeholder="yourbusiness.com"
                  className="min-h-[48px] flex-1 rounded border border-white/10 bg-[#07080d] px-4 text-sm text-white placeholder:text-white/30 focus:border-[#c9973a]/50 focus:outline-none"
                />
                <a
                  href={analyzeHref}
                  className="inline-flex min-h-[48px] items-center justify-center rounded border border-[#c9973a] bg-[#c9973a] px-6 text-xs font-semibold tracking-[0.2em] text-[#07080d] hover:bg-[#c9973a]/90"
                >
                  Analyze
                </a>
              </div>
              <ul className="mt-10 space-y-4 text-sm text-white/55">
                {[
                  "Structured scoring across visibility, engagement, and conversion.",
                  "Gap detection mapped to your live service catalog (v12).",
                  "Five tier pathways — Essentials through Vanguard.",
                  "Results designed to drop into pipeline follow-up.",
                ].map((t) => (
                  <li key={t} className="flex gap-3">
                    <span className="mt-1 h-2 w-2 flex-shrink-0 border border-[#c9973a]/50" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-6 text-sm leading-relaxed text-white/50">
              <p>
                <span className="text-white/75">3-dimension scoring</span> — keep diagnostics legible: visibility,
                engagement, conversion — then roll up to an overall signal you can act on immediately.
              </p>
              <p>
                <span className="text-white/75">Gap-to-service mapping</span> — every gap should point to a real
                service ID and a real name — not a generic “optimize SEO” platitude.
              </p>
              <p>
                <span className="text-white/75">Five tiered packages</span> — recommendations stay tied to commercial
                packaging, so sales conversations start in the right lane.
              </p>
              <p>
                <span className="text-white/75">Saved to pipeline</span> — diagnostics are operational artifacts: stored,
                auditable, and ready for fulfillment handoff.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="footer" className="relative z-10 border-t border-white/[0.06] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 text-[11px] font-mono uppercase tracking-[0.25em] text-white/40 sm:flex-row sm:items-center">
          <div className="text-white/60">
            Socialutely <span style={{ color: GOLD }}>|</span> AI Marketing Platform
          </div>
          <div>
            ANYDOOR ENGINE · {PLATFORM_SERVICE_COUNT} SERVICES · 10 CATEGORIES · v12
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PlatformHome;
