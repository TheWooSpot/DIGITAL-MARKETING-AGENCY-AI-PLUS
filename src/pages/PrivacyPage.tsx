import { Link } from "react-router-dom";

/** Minimal privacy placeholder — inherits global grid background from index.css */
export default function PrivacyPage() {
  return (
    <div className="relative z-10 min-h-screen px-4 py-24 text-[#e8eef5]">
      <div className="mx-auto max-w-lg text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-white/45">Socialutely | AI</p>
        <h1 className="mt-6 font-serif text-3xl font-light text-white" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
          Privacy
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-white/50">
          We&apos;re preparing a clear, readable privacy policy for this site. Check back soon.
        </p>
        <Link to="/" className="mt-10 inline-block text-sm font-medium text-[#c9973a] hover:text-[#c9973a]/90">
          ← Back home
        </Link>
      </div>
    </div>
  );
}
