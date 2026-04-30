import type { CampaignSurface } from "@/lib/adminCampaignSurfaces";

type Props = {
  id: CampaignSurface;
  label: string;
  active: boolean;
  onToggle: () => void;
};

/** Compact chip for partner card surface toggles (grant + include in send). */
export function CampaignSurfaceChip({ id, label, active, onToggle }: Props) {
  return (
    <button
      type="button"
      id={`chip-${id}`}
      className={`ac-surface-chip rounded px-2.5 py-1 text-[12px] font-medium transition-colors ${active ? "ac-surface-chip--on" : "ac-surface-chip--off"}`}
      style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}
      onClick={(e) => {
        e.preventDefault();
        onToggle();
      }}
    >
      {label}
    </button>
  );
}
