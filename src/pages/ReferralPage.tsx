import { Link } from "react-router-dom";
import { AnyDoorEntryScreen, AnyDoorPageShell } from "@/components/anydoor/AnyDoorExperience";

/** D-8 · The Referral */
export default function ReferralPage() {
  return (
    <div className="anydoor-door-page min-h-screen">
      <AnyDoorPageShell>
        <AnyDoorEntryScreen
          eyebrow="ANYDOOR ENGINE · D-8 · THE HANDSHAKE"
          heading="Someone Sent You Here. That Means Something."
          subtext1={"You arrived through a trusted referral and want to know what's next."}
          subtext2={"Start with context — we already know a little about why you're here."}
        />
        <Link to="/contact" className="anydoor-btn-gold inline-flex w-full items-center justify-center no-underline">
          Continue →
        </Link>
      </AnyDoorPageShell>
    </div>
  );
}
