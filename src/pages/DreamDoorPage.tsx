import { Link } from "react-router-dom";
import { AnyDoorPageShell } from "@/components/anydoor/AnyDoorExperience";
import DreamScapeEntry from "@/components/dreamscape/DreamScapeEntry";

const GOLD = "#c9a227";

/**
 * Door 7 — DreamScape™ Vision Session (Amelia / Vapi).
 */
export default function DreamDoorPage() {
  return (
    <AnyDoorPageShell backHref="/" backLabel="← Home">
      <header className="mb-8 text-center sm:mb-10">
        <p className="font-mono text-[10px] uppercase tracking-[0.35em]" style={{ color: GOLD }}>
          AnyDoor Engine · D-7 · DreamScape™
        </p>
        <h1
          className="mt-3 text-2xl font-light text-white sm:text-3xl"
          style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}
        >
          DreamScape™
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-sm text-white/50">
          A short voice-led session to articulate where you want your business to go — and what success looks like for
          you.
        </p>
      </header>

      <DreamScapeEntry />

      <p className="mt-10 text-center text-[11px] text-white/35">
        <Link to="/" className="text-[#c9973a]/80 underline-offset-4 hover:text-[#c9973a] hover:underline">
          Platform home
        </Link>
      </p>
    </AnyDoorPageShell>
  );
}
