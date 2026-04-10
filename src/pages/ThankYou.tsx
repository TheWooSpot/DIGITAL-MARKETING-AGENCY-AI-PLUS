import { Link } from "react-router-dom";

export default function ThankYou() {
  return (
    <div className="thank-you-page min-h-screen selection:bg-[#c9973a]/25 selection:text-white">
      <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 py-16 text-center">
        <p
          className="text-[10px] uppercase tracking-[0.35em] text-[#c9973a]"
          style={{ fontFamily: "var(--font-dm-mono), ui-monospace, monospace" }}
        >
          Socialutely
        </p>
        <h1 className="thank-you-heading mt-6">You&apos;re in.</h1>
        <p className="thank-you-sub">
          Your package is confirmed. Someone from the team will be in touch within 24 hours to get things moving.
        </p>
        <Link to="/" className="thank-you-btn">
          Back to Home
        </Link>
      </main>
    </div>
  );
}
