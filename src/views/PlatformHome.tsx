import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import { PLATFORM_CATEGORIES, PLATFORM_SERVICE_COUNT } from "@/data/platformCatalog";
import { getSupabaseBrowserClient } from "@/anydoor/lib/supabaseBrowserClient";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const GOLD = "#c9973a";

/**
 * Five-stage readiness scale (homepage door cards + Supabase `anydoor_doors.status`):
 * planned → discovery → building → beta → live
 */
type DoorStatus = "planned" | "discovery" | "building" | "beta" | "live";

type DoorCta =
  | { kind: "link"; href: string; label: string; className?: string }
  | { kind: "muted"; label: string }
  | { kind: "planned"; label: string };

type DoorDef = {
  label: string;
  status: DoorStatus;
  title: string;
  description: string;
  cta: DoorCta;
};

/** Homepage AnyDoor cards — copy matches Door B1-style layout (see `AnyDoorEntryCard`). */
const DOOR_HOME_CARD_COPY: Record<
  string,
  { eyebrow: string; header: string; challenge: string; benefit: string }
> = {
  "D-1": {
    eyebrow: "D-1 · THE OPEN DOOR",
    header: "Reach Out. We Respond Intelligently.",
    challenge: "You reached out but weren't sure where to start.",
    benefit: "We meet you where you are and route you to exactly the right conversation.",
  },
  "D-2": {
    eyebrow: "D-2 · THE LENS",
    header: "URL Multipoint Diagnostic",
    challenge: "You don't know what your business looks like from the outside.",
    benefit: "See your digital presence clearly — strengths, gaps, and what to do first.",
  },
  "D-3": {
    eyebrow: "D-3 · THE MIRROR",
    header: "Seven Questions That Surface Something True",
    challenge: "You sense something isn't working but can't quite name it.",
    benefit: "Honest questions that surface what your business actually needs right now.",
  },
  "D-4": {
    eyebrow: "D-4 · THE COMPASS",
    header: "Find Out Exactly Where Your AI Stands",
    challenge: "You don't know where your organization stands on AI readiness.",
    benefit: "A real score across 10 dimensions and a clear path to where you go next.",
  },
  "D-5": {
    eyebrow: "D-5 · THE WORKBENCH",
    header: "What Would This Actually Be Worth?",
    challenge: "You can't justify the investment without knowing the return.",
    benefit: "See what smarter marketing could be worth to your business in real numbers.",
  },
  "D-6": {
    eyebrow: "D-6 · THE RIVAL",
    header: "You Know What You Want. Here's the Answer.",
    challenge: "You know what you need — you just want a number.",
    benefit: "A transparent, itemized quote built around your specific situation.",
  },
  "D-7": {
    eyebrow: "D-7 · THE ARCHITECT'S STUDIO",
    header: "Tell Us Where You Want to Go",
    challenge: "You know where you want to go but haven't said it out loud yet.",
    benefit: "A voice conversation that maps your vision and builds the path toward it.",
  },
  "D-8": {
    eyebrow: "D-8 · THE HANDSHAKE",
    header: "Someone Sent You Here. That Means Something.",
    challenge: "You arrived through a trusted referral and want to know what's next.",
    benefit: "Start with context — we already know a little about why you're here.",
  },
  "D-9": {
    eyebrow: "D-9 · THE THREAD",
    header: "You Saw Something. Let's Continue.",
    challenge: "Something specific caught your attention and brought you here.",
    benefit: "Pick up exactly where your interest began — no starting over.",
  },
};

function doorCardCopyOrFallback(door: DoorDef) {
  const fixed = DOOR_HOME_CARD_COPY[door.label];
  if (fixed) return fixed;
  return {
    eyebrow: `${door.label} · ${door.title.toUpperCase()}`,
    header: door.title,
    challenge: door.description,
    benefit: "",
  };
}

type AnyDoorDoorRow = {
  door_id: string;
  layer: string;
  sort_order: number;
  name: string;
  tagline: string | null;
  description: string | null;
  status: string | null;
  completion_pct: number | null;
  cta_label: string | null;
  cta_route: string | null;
};

/** Local fallback/skeleton dataset used while loading or if Supabase is unreachable. */
const FALLBACK_DOORS: DoorDef[] = [
  {
    label: "D-1",
    status: "discovery",
    title: "The Open Door",
    description:
      "One conversation starter — call, text, or email — routed so nothing important slips through.",
    cta: { kind: "link", href: "/direct-reach", label: "Connect now →" },
  },
  {
    label: "D-2",
    status: "live",
    title: "The Lens",
    description:
      "Paste your URL. See how visible, credible, and conversion-ready your digital presence really is.",
    cta: { kind: "link", href: "/diagnostic", label: "Run free diagnostic" },
  },
  {
    label: "D-3",
    status: "beta",
    title: "The Mirror",
    description:
      "Seven open answers — then a reflection of what you actually said, not what you meant to say.",
    cta: { kind: "link", href: "/self-discovery", label: "Start discovery" },
  },
  {
    label: "D-4",
    status: "live",
    title: "The Compass",
    description:
      "Twenty-one questions across seven domains — one score that shows where your organization sits on the adoption curve.",
    cta: { kind: "link", href: "/ai-iq", label: "Take the AI IQ™" },
  },
  {
    label: "D-5",
    status: "live",
    title: "The Workbench",
    description:
      "A few inputs — a sober projection of what stronger visibility and automation could mean in dollars, before you talk price.",
    cta: {
      kind: "link",
      href: "/calculator",
      label: "What could this be worth?",
      className: "normal-case text-[12px] font-sans tracking-normal text-[#c9973a] hover:text-[#c9973a]/90",
    },
  },
  {
    label: "D-6",
    status: "building",
    title: "The Rival",
    description:
      "Pick the outcomes you want — see a scoped quote that matches the work, not a generic menu.",
    cta: { kind: "link", href: "/quote", label: "Get my quote →" },
  },
  {
    label: "D-7",
    status: "live",
    title: "The Architect's Studio",
    description:
      "A short voice session to say where you want the business to go — and hear it reflected back with warmth and precision.",
    cta: { kind: "link", href: "/dream", label: "Begin vision session" },
  },
  {
    label: "D-8",
    status: "beta",
    title: "The Handshake",
    description:
      "You were sent here on purpose — this path honors that introduction and continues the right conversation.",
    cta: { kind: "link", href: "/referral", label: "Continue →" },
  },
  {
    label: "D-9",
    status: "beta",
    title: "The Thread",
    description: "Continue the exact promise you clicked — same offer, same framing, next step ready.",
    cta: { kind: "link", href: "/ad-response", label: "Continue →" },
  },
];

function normalizeDoorStatus(raw: string | null | undefined): DoorStatus {
  const s = (raw ?? "").trim().toLowerCase();
  if (s === "planned" || s === "discovery" || s === "building" || s === "beta" || s === "live") {
    return s;
  }
  if (s === "in_progress" || s === "dev" || s === "wip") return "building";
  return "planned";
}

function statusBadge(status: DoorStatus): { label: string; className: string } {
  switch (status) {
    case "live":
      return { label: "LIVE", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" };
    case "beta":
      return { label: "BETA", className: "bg-sky-500/15 text-sky-300 border-sky-500/35" };
    case "building":
      return { label: "BUILDING", className: "bg-amber-500/15 text-amber-400 border-amber-500/30" };
    case "discovery":
      return { label: "DISCOVERY", className: "bg-violet-500/12 text-violet-300 border-violet-500/30" };
    default:
      return { label: "PLANNED", className: "bg-white/5 text-white/45 border-white/10" };
  }
}

const navLinkClass =
  "text-[11px] font-medium uppercase tracking-[0.2em] text-white/55 transition-colors hover:text-white";

function AnyDoorEntryCard({ door, pulseLoading }: { door: DoorDef; pulseLoading?: boolean }) {
  const copy = doorCardCopyOrFallback(door);
  const badge = statusBadge(door.status);
  const ctaGoldClass =
    "anydoor-btn-gold inline-flex w-full max-w-[580px] items-center justify-center text-center text-sm no-underline";

  return (
    <div className={`anydoor-home-door-card flex flex-col ${pulseLoading ? "animate-pulse opacity-75" : ""}`}>
      <div className="anydoor-home-door-card-inner mx-auto flex w-full max-w-[580px] flex-col px-6 pb-10 pt-20">
        <div className="flex flex-col gap-12">
          <div className="flex items-start justify-between gap-3">
            <p className="anydoor-home-door-eyebrow pr-2">{copy.eyebrow}</p>
            <span
              className={`shrink-0 rounded-full border px-2 py-0.5 font-mono text-[9px] font-medium tracking-widest ${badge.className}`}
            >
              {badge.label}
            </span>
          </div>

          <div className="flex flex-col gap-4">
            <h3 className="anydoor-home-door-header">{copy.header}</h3>
            <p className="anydoor-home-door-platform">Socialutely | AI Marketing Platform</p>
            <p className="text-sm italic leading-relaxed text-white/50">{copy.challenge}</p>
            {copy.benefit ? <p className="text-sm leading-relaxed text-white/[0.72]">{copy.benefit}</p> : null}
          </div>

          <div className="w-full">
            {door.cta.kind === "link" && (
              <Link
                to={door.cta.href}
                className={`${ctaGoldClass} ${door.cta.className?.includes("normal-case") ? "!normal-case !tracking-normal" : ""}`}
              >
                {door.cta.label}
              </Link>
            )}
            {door.cta.kind === "muted" && <span className="anydoor-home-door-cta-muted">{door.cta.label}</span>}
            {door.cta.kind === "planned" && <span className="anydoor-home-door-cta-muted">{door.cta.label}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

const PlatformHome = () => {
  const [activeCategory, setActiveCategory] = useState(PLATFORM_CATEGORIES[0].slug);
  const [doors, setDoors] = useState<DoorDef[]>(FALLBACK_DOORS);
  const [doorsLoading, setDoorsLoading] = useState(true);
  const catalogScrollRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  const mapDbDoorToCard = useCallback((row: AnyDoorDoorRow): DoorDef => {
    const status = normalizeDoorStatus(row.status);

    const ctaLabelRaw = (row.cta_label ?? "").trim();
    const ctaRouteRaw = (row.cta_route ?? "").trim();
    const upperLabel = ctaLabelRaw.toUpperCase();
    const isPlannedLabel = upperLabel === "COMING SOON" || upperLabel === "PLANNED";

    const canLink =
      ctaRouteRaw &&
      !isPlannedLabel &&
      (status === "live" || status === "beta" || status === "building" || status === "discovery");

    let cta: DoorCta = { kind: "planned", label: "Planned" };
    if (canLink) {
      cta = { kind: "link", href: ctaRouteRaw, label: ctaLabelRaw || "Open" };
    } else if (isPlannedLabel || !ctaRouteRaw) {
      cta = { kind: "muted", label: ctaLabelRaw || "Coming soon" };
    }

    return {
      label: row.door_id,
      status,
      title: row.name,
      description: row.description?.trim() || row.tagline?.trim() || "",
      cta,
    };
  }, []);

  const scrollToId = useCallback((id: string) => {
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  useEffect(() => {
    if (location.pathname === "/" && location.hash === "#doors") {
      requestAnimationFrame(() => {
        document.getElementById("doors")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }, [location.pathname, location.hash]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setDoorsLoading(true);
      try {
        const supabase = getSupabaseBrowserClient();
        if (!supabase) {
          if (!cancelled) setDoors(FALLBACK_DOORS);
          return;
        }
        const { data, error } = await supabase
          .from("anydoor_doors")
          .select("*")
          .eq("layer", "experience")
          .order("sort_order", { ascending: true });
        if (cancelled) return;
        if (error || !data || data.length === 0) {
          setDoors(FALLBACK_DOORS);
          return;
        }
        setDoors((data as AnyDoorDoorRow[]).map(mapDbDoorToCard));
      } catch {
        if (!cancelled) setDoors(FALLBACK_DOORS);
      } finally {
        if (!cancelled) setDoorsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mapDbDoorToCard]);

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

  const doorD3Spotlight = (doorsLoading ? FALLBACK_DOORS : doors).find((d) => d.label === "D-3");

  return (
    <div
      className="platform-home min-h-screen text-[#e8eef5] selection:bg-[#c9973a]/30 selection:text-white"
      style={{
        fontFamily: "'Archivo', system-ui, sans-serif",
      }}
    >
      {/* Background: global grid + grain on body (index.css); no duplicate full-page overlays here */}

      {/* Nav */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] bg-[#07080d]/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <button
            type="button"
            onClick={() => scrollToId("platform")}
            className="shrink-0 text-left text-sm font-medium tracking-tight text-white"
          >
            Socialutely <span style={{ color: GOLD }}>|</span>{" "}
            <span className="text-white/80">AI</span>
          </button>

          <nav className="hidden flex-1 justify-center gap-8 lg:flex" aria-label="Primary">
            <button type="button" className={navLinkClass} onClick={() => scrollToId("platform")}>
              Platform
            </button>
            <button type="button" className={navLinkClass} onClick={() => scrollToId("catalog")}>
              Services
            </button>
            <Link to="/#doors" className={navLinkClass}>
              AnyDoor Engine
            </Link>
            <Link to="/ai-iq" className={navLinkClass}>
              AI Readiness Labs
            </Link>
            <button type="button" className={navLinkClass} onClick={() => scrollToId("about")}>
              About
            </button>
          </nav>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger
                type="button"
                className="flex items-center gap-2 rounded border border-white/15 px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-white/80 outline-none hover:border-white/25 hover:text-white lg:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-4 w-4" />
                Menu
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="min-w-[12rem] border border-white/10 bg-[#07080d] text-white shadow-xl"
              >
                <DropdownMenuItem
                  className="cursor-pointer focus:bg-white/10 focus:text-white"
                  onClick={() => scrollToId("platform")}
                >
                  Platform
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer focus:bg-white/10 focus:text-white"
                  onClick={() => scrollToId("catalog")}
                >
                  Services
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer focus:bg-white/10 focus:text-white">
                  <Link to="/#doors">AnyDoor Engine</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer focus:bg-white/10 focus:text-white">
                  <Link to="/ai-iq">AI Readiness Labs</Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer focus:bg-white/10 focus:text-white"
                  onClick={() => scrollToId("about")}
                >
                  About
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Link
              to="/diagnostic"
              className="rounded border border-[#c9973a] bg-[#c9973a] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#07080d] transition-colors hover:bg-[#c9973a]/90 sm:px-4"
            >
              GET DIAGNOSTIC
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section
        id="platform"
        className="relative z-10 flex min-h-screen scroll-mt-24 flex-col justify-center px-4 pb-20 pt-28 sm:px-6 sm:pb-28 lg:px-8"
      >
        <div className="relative z-10 mx-auto w-full max-w-6xl">
          <h1
            className="platform-fade platform-fade-1 max-w-4xl font-serif font-light leading-[0.98] tracking-tight text-white"
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "clamp(2.5rem, 6vw, 4.5rem)" }}
          >
            Every door is the right door.
          </h1>
          <p className="platform-fade platform-fade-3 mt-8 max-w-2xl text-base leading-relaxed text-white/55 sm:text-lg">
            One intelligent engine. Nine ways in. One unified experience — powered by AI.
          </p>
          <div className="platform-fade platform-fade-4 mt-10 flex flex-col gap-4 sm:flex-row sm:flex-wrap">
            <Link
              to="/diagnostic"
              className="inline-flex items-center justify-center rounded border border-[#c9973a] bg-[#c9973a] px-8 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#07080d] hover:bg-[#c9973a]/90"
            >
              GET YOUR FREE DIAGNOSTIC
            </Link>
            <Link
              to="/ai-iq"
              className="inline-flex items-center justify-center rounded border border-[#c9973a]/45 bg-transparent px-8 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#c9973a] hover:border-[#c9973a]/80 hover:bg-[#c9973a]/10"
            >
              TAKE THE AI IQ™
            </Link>
          </div>

          {/* D-3 · The Self-Discovery — same card model as AnyDoor grid */}
          <div className="platform-fade platform-fade-4 mt-8 max-w-[580px]">
            {doorD3Spotlight ? (
              <AnyDoorEntryCard door={doorD3Spotlight} pulseLoading={doorsLoading} />
            ) : null}
          </div>
        </div>
      </section>

      {/* AnyDoor Engine — doors */}
      <section id="doors" className="relative z-10 scroll-mt-24 border-t border-white/[0.06] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-white/50">THE ANYDOOR ENGINE™</p>
          <h2
            className="mt-4 font-serif text-3xl font-light text-white sm:text-4xl"
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
          >
            Choose your entry point.
          </h2>
          <p className="mt-3 max-w-2xl text-sm text-white/50">
            Every door leads to rewarding outcomes.
          </p>

          <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {(doorsLoading ? FALLBACK_DOORS : doors).map((door) => (
              <AnyDoorEntryCard key={door.label} door={door} pulseLoading={doorsLoading} />
            ))}
          </div>
        </div>
      </section>

      {/* Platform callout */}
      <section id="about" className="relative z-10 scroll-mt-24 border-t border-white/[0.06] px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-white/45">AI Readiness Labs™</p>
            <h2
              className="mt-4 font-serif text-2xl font-light leading-snug text-white sm:text-3xl"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
            >
              Find out where you stand on the AI adoption curve.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-white/50">
              The AI IQ™ Assessment scores your organization across 7 domains and routes you to the right Rung —
              Adaptation, Optimization, or Stewardship.
            </p>
            <Link to="/ai-iq" className="mt-6 inline-block font-mono text-[11px] uppercase tracking-[0.25em] text-[#c9973a] hover:text-[#c9973a]/90">
              Take the AI IQ™
            </Link>
          </div>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-white/45">Dreamscape™</p>
            <h2
              className="mt-4 font-serif text-2xl font-light leading-snug text-white sm:text-3xl"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
            >
              Tell us about the world you want to create.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-white/50">
              Amelia leads a warm, voice-based session that draws out your vision — and delivers a personalized Vision
              Report™ to your inbox.
            </p>
            <Link
              to="/dream"
              className="mt-6 inline-block font-mono text-[11px] uppercase tracking-[0.25em] text-[#c9973a] hover:text-[#c9973a]/90"
            >
              Begin DreamScape™ vision session →
            </Link>
          </div>
        </div>
      </section>

      {/* Catalog */}
      <section id="catalog" className="relative z-10 scroll-mt-24 border-t border-white/[0.06] px-4 py-20 sm:px-6 lg:px-8">
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

          <div ref={catalogScrollRef} className="platform-catalog-scroll min-w-0 flex-1 space-y-16">
            {PLATFORM_CATEGORIES.map((cat) => (
              <div key={cat.slug} id={`category-${cat.slug}`} className="scroll-mt-32">
                <div className="flex flex-wrap items-baseline gap-3 border-b border-white/[0.06] pb-4">
                  <span className="font-mono text-xs text-white/35">{cat.number}</span>
                  <h3
                    className="font-serif text-2xl font-light text-white"
                    style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                  >
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

      {/* Footer */}
      <footer id="footer" className="relative z-10 scroll-mt-24 border-t border-white/[0.06] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 text-sm text-white/45 sm:flex-row sm:items-center">
          <div className="text-white/60">
            Socialutely <span style={{ color: GOLD }}>|</span> AI — © 2026
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 font-mono text-[11px] uppercase tracking-[0.2em]">
            <button type="button" className="hover:text-white/80" onClick={() => scrollToId("platform")}>
              Platform
            </button>
            <button type="button" className="hover:text-white/80" onClick={() => scrollToId("catalog")}>
              Services
            </button>
            <button type="button" className="hover:text-white/80" onClick={() => scrollToId("about")}>
              About
            </button>
            <Link to="/privacy" className="hover:text-white/80">
              Privacy
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
};

export default PlatformHome;
