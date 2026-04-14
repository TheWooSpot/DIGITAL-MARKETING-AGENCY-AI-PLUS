import { AnyDoorEntryScreen, AnyDoorPageShell } from "@/components/anydoor/AnyDoorExperience";

/**
 * D-1 · The Direct Reach — lightweight entry; primary action is email connect.
 */
export default function DirectReachPage() {
  return (
    <div className="anydoor-door-page min-h-screen">
      <AnyDoorPageShell>
        <AnyDoorEntryScreen
          eyebrow="ANYDOOR ENGINE · D-1 · THE DIRECT REACH"
          heading="Reach Out. We Respond Intelligently."
          subtext1={"You reached out but weren't sure where to start."}
          subtext2="We meet you where you are and connect you to exactly the right next step."
        />
        <a href="mailto:hello@socialutely.com?subject=Direct%20Reach%20(D-1)" className="anydoor-btn-gold inline-flex w-full items-center justify-center no-underline">
          Connect now →
        </a>
      </AnyDoorPageShell>
    </div>
  );
}
