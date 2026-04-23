import { Link } from "react-router-dom";
import { AnyDoorEntryScreen, AnyDoorPageShell } from "@/components/anydoor/AnyDoorExperience";

/** D-9 · The Ad Response */
export default function AdResponsePage() {
  return (
    <div className="anydoor-door-page min-h-screen">
      <AnyDoorPageShell>
        <AnyDoorEntryScreen
          eyebrow="ANYDOOR ENGINE · D-9 · THE THREAD"
          heading={"You Saw Something. Let's Continue."}
          subtext1="Something specific caught your attention and brought you here."
          subtext2="Pick up exactly where your interest began — no starting over."
        />
        <Link to="/contact" className="anydoor-btn-gold inline-flex w-full items-center justify-center no-underline">
          Continue →
        </Link>
      </AnyDoorPageShell>
    </div>
  );
}
