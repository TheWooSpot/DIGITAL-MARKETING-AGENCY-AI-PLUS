import { useSearchParams } from "react-router-dom";
import { AnyDoorHero, AnyDoorPageShell } from "@/components/anydoor/AnyDoorExperience";
import { BUSINESS_SIZE_LABEL, type BusinessSize } from "@/lib/calculator/door5Math";

const DIM = "rgba(232,238,245,0.55)";
const WHITE = "#e8eef5";

/**
 * D-6 · The Quote (placeholder).
 * Expects query: business_size, services (comma-separated catalog ids) from D-5.
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
    <AnyDoorPageShell backHref="/calculator" backLabel="← Back to calculator">
      <AnyDoorHero
        eyebrow="AnyDoor Engine · D-6 · The Quote"
        titleAccent="Your personalized"
        titleRest="quote"
        subtitle="Line-item pricing unlocks here after we confirm your business email. This step is wired for selections from the calculator."
      />

      <div className="anydoor-surface-card mx-auto mt-10 max-w-lg">
        <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-[#c9973a]">Pre-selected from D-5 · The Calculator</p>
        <ul className="mt-4 space-y-2 text-sm" style={{ color: DIM }}>
          <li>
            <span style={{ color: DIM }}>Business size: </span>
            <span style={{ color: WHITE }}>{size ? BUSINESS_SIZE_LABEL[size] : "—"}</span>
          </li>
          <li>
            <span style={{ color: DIM }}>Service focus ids: </span>
            <span style={{ color: WHITE }}>{ids.length > 0 ? ids.join(", ") : "—"}</span>
          </li>
        </ul>
      </div>

      <p className="mx-auto mt-8 max-w-lg text-xs" style={{ color: DIM }}>
        Full quote flow (email gate + pricing) can connect here next.
      </p>
    </AnyDoorPageShell>
  );
}
