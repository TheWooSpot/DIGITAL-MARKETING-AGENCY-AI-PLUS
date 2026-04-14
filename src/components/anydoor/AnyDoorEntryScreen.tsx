/**
 * Shared “entry / splash” block for AnyDoor inner pages — matches /diagnostic hierarchy:
 * eyebrow → muted platform line → gold DM Serif heading → two-line subtext (+ optional body).
 */
export type AnyDoorEntryScreenProps = {
  eyebrow: string;
  heading: string;
  subtext1: string;
  subtext2: string;
  bodyText?: string;
  /** Defaults to Socialutely | AI Marketing Platform */
  platformLine?: string;
};

export function AnyDoorEntryScreen({
  eyebrow,
  heading,
  subtext1,
  subtext2,
  bodyText,
  platformLine = "Socialutely | AI Marketing Platform",
}: AnyDoorEntryScreenProps) {
  return (
    <header className="mb-10 text-left sm:mb-12">
      <p className="anydoor-entry-eyebrow">{eyebrow}</p>
      <p className="anydoor-entry-platform mt-2">{platformLine}</p>
      <h1 className="anydoor-entry-heading mt-8">{heading}</h1>
      <p className="anydoor-entry-sub1 mt-6">{subtext1}</p>
      <p className="anydoor-entry-sub2 mt-3">{subtext2}</p>
      {bodyText ? <p className="anydoor-entry-body mt-4">{bodyText}</p> : null}
    </header>
  );
}
