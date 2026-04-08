import { Link } from "react-router-dom";

const GOLD = "#c9a227";
const BG = "#07080d";
const WHITE = "#e8eef5";
const DIM = "rgba(232,238,245,0.55)";

/**
 * Door 7 — Dream (placeholder). Full Dreamscape™ flow can replace this route later.
 */
export default function DreamDoorPage() {
  return (
    <div className="min-h-screen px-4 pb-20 pt-16" style={{ backgroundColor: BG, color: WHITE }}>
      <div className="mx-auto max-w-lg text-center">
        <Link to="/" className="text-sm font-medium" style={{ color: GOLD }}>
          ← Home
        </Link>
        <p className="mt-10 font-mono text-[10px] uppercase tracking-[0.35em]" style={{ color: GOLD }}>
          Dreamscape™ · Door 7
        </p>
        <h1 className="mt-4 text-3xl font-light" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
          Talk to Amelia
        </h1>
        <p className="mt-4 text-sm leading-relaxed" style={{ color: DIM }}>
          Voice-led sessions that draw out your vision and deliver a personalized Vision Report™. Full experience is
          rolling out — for now, reach us from the platform home or complete another AnyDoor step first.
        </p>
        <p className="mt-8 font-mono text-[11px] uppercase tracking-[0.25em]" style={{ color: DIM }}>
          Coming soon
        </p>
      </div>
    </div>
  );
}
