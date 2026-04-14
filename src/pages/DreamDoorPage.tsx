import { AnyDoorEntryScreen, AnyDoorPageShell } from "@/components/anydoor/AnyDoorExperience";
import DreamScapeEntry from "@/components/dreamscape/DreamScapeEntry";

/**
 * Door 7 — DreamScape™ Vision Session (Amelia / Vapi).
 */
export default function DreamDoorPage() {
  return (
    <div className="anydoor-door-page min-h-screen">
      <AnyDoorPageShell backHref="/" backLabel="← Home">
        <AnyDoorEntryScreen
          eyebrow="ANYDOOR ENGINE · D-7 · THE DREAM"
          heading="Tell Us Where You Want to Go"
          subtext1={"You know where you want to go but haven't said it out loud yet."}
          subtext2="A voice conversation that maps your vision and builds the path toward it."
        />

        <DreamScapeEntry />
      </AnyDoorPageShell>
    </div>
  );
}
