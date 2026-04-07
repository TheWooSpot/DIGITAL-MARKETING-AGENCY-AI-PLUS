import { AnyDoorHero, AnyDoorPageShell } from "@/components/anydoor/AnyDoorExperience";

export default function ContactPage() {
  return (
    <AnyDoorPageShell backHref="/" backLabel="← Platform home">
      <AnyDoorHero
        eyebrow="SOCIALUTELY · DISCOVERY"
        titleAccent="Let's"
        titleRest="talk."
        subtitle="Schedule a discovery call with our team."
      />

      <section className="mx-auto max-w-xl">
        <div className="anydoor-surface-card border border-[#c9973a]/35 text-center">
          <p
            className="text-[10px] uppercase tracking-[0.35em] text-[#c9973a]"
            style={{ fontFamily: "var(--font-dm-mono), ui-monospace, monospace" }}
          >
            Contact
          </p>
          <p
            className="mt-4 text-2xl font-medium text-white sm:text-3xl"
            style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}
          >
            Schedule a discovery call with our team.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-white/55">
            Calendly embed placeholder. For now, email us directly and we&apos;ll set up a time that fits your schedule.
          </p>
          <a
            href="mailto:hello@socialutely.com"
            className="mt-6 inline-block w-full rounded border border-[#c9973a] bg-[#c9973a] px-6 py-3 text-center text-xs font-semibold uppercase tracking-widest text-[#07080d] hover:bg-[#c9973a]/90"
          >
            hello@socialutely.com
          </a>
        </div>
      </section>
    </AnyDoorPageShell>
  );
}
