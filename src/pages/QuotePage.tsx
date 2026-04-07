import { Link, useSearchParams } from "react-router-dom";
import { BUSINESS_SIZE_LABEL, type BusinessSize } from "@/lib/calculator/door5Math";

const BG = "#070d1a";
const GOLD = "#c9a227";
const DIM = "rgba(240,242,248,0.55)";
const WHITE = "#f0f2f8";

/**
 * Door 6 — Quote (placeholder).
 * Expects query: business_size, services (comma-separated catalog ids) from Door 5.
 */
export default function QuotePage() {
  const [params] = useSearchParams();
  const sizeRaw = params.get("business_size") ?? "";
  const servicesRaw = params.get("services") ?? "";
  const size = (["solo", "small", "mid", "enterprise"] as const).includes(sizeRaw as BusinessSize)
    ? (sizeRaw as BusinessSize)
    : null;
  const ids = servicesRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <div className="min-h-screen px-4 pb-20 pt-12" style={{ backgroundColor: BG, color: WHITE }}>
      <div className="mx-auto max-w-lg">
        <Link to="/calculator" className="text-sm font-medium" style={{ color: GOLD }}>
          ← Back to calculator
        </Link>
        <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.35em]" style={{ color: GOLD }}>
          Door 6 · Quote
        </p>
        <h1 className="mt-3 text-3xl font-bold" style={{ fontFamily: "'Syne', system-ui, sans-serif" }}>
          Your personalized quote
        </h1>
        <p className="mt-3 text-sm leading-relaxed" style={{ color: DIM }}>
          Line-item pricing unlocks here after we confirm your business email. This step is wired for selections from the
          calculator.
        </p>

        <div className="mt-8 rounded-xl border border-white/10 bg-[#0e1829] p-6">
          <p className="text-xs uppercase tracking-widest" style={{ color: DIM }}>
            Pre-selected from Door 5
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <span style={{ color: DIM }}>Business size: </span>
              {size ? BUSINESS_SIZE_LABEL[size] : "—"}
            </li>
            <li>
              <span style={{ color: DIM }}>Service focus ids: </span>
              {ids.length > 0 ? ids.join(", ") : "—"}
            </li>
          </ul>
        </div>

        <p className="mt-8 text-xs" style={{ color: DIM }}>
          Full quote flow (email gate + pricing) can connect here next.
        </p>
      </div>
    </div>
  );
}
