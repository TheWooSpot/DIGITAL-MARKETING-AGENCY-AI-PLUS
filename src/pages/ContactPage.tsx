import { AnyDoorEntryScreen, AnyDoorPageShell } from "@/components/anydoor/AnyDoorExperience";

export default function ContactPage() {
  return (
    <div className="anydoor-door-page min-h-screen">
      <AnyDoorPageShell backHref="/" backLabel="← Home">
        <AnyDoorEntryScreen
          eyebrow="SOCIALUTELY · DISCOVERY"
          heading={"Let's talk."}
          subtext1="Schedule a discovery call with our team."
          subtext2={"We'll set up a time that fits your schedule — or reach us directly by email."}
        />

        <section className="mx-auto w-full">
          <div className="anydoor-surface-card border border-[#c9973a]/35 text-center">
            <p className="mt-4 text-sm leading-relaxed text-white/55">
              Calendly embed placeholder. For now, email us directly.
            </p>
            <a href="mailto:hello@socialutely.com" className="anydoor-btn-gold mt-6 inline-flex w-full items-center justify-center no-underline">
              hello@socialutely.com
            </a>
          </div>
        </section>
      </AnyDoorPageShell>
    </div>
  );
}
