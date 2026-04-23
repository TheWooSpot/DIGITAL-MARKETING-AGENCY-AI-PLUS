import { useSearchParams } from "react-router-dom";
import { AnyDoorEntryScreen, AnyDoorPageShell } from "@/components/anydoor/AnyDoorExperience";
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
    <div className="anydoor-door-page min-h-screen">
    <AnyDoorPageShell backHref="/calculator" backLabel="← Back to calculator">
      <AnyDoorEntryScreen
        eyebrow="ANYDOOR ENGINE · D-6 · THE RIVAL"
        heading={"You Know What You Want. Here's the Answer."}
        subtext1="You know what you need — you just want a number."
        subtext2="A transparent, itemized quote built around your specific situation."
      />

      <div className="anydoor-surface-card mx-auto w-full">
        <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-[#c9973a]">Pre-selected from D-5 · The Workbench</p>
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

      <p className="mx-auto mt-8 text-xs" style={{ color: DIM }}>
        Full quote flow (email gate + pricing) can connect here next.
      </p>

      <a
        href="mailto:hello@socialutely.com?subject=Quote%20request%20(D-6)"
        className="anydoor-btn-gold mt-8 inline-flex w-full items-center justify-center no-underline"
      >
        Get my quote →
      </a>
    </AnyDoorPageShell>
    </div>
  );
}
