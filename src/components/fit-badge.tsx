import { cn } from "@/lib/utils";
import type { FitBand } from "@/lib/domain";

const copy: Record<FitBand, string> = {
  green: "In appetite",
  yellow: "Stretch / override",
  red: "Skip",
};

export function FitBadge({ band, className }: { band: FitBand; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        band === "green" && "bg-fit-green-bg text-fit-green",
        band === "yellow" && "bg-fit-yellow-bg text-fit-yellow",
        band === "red" && "bg-fit-red-bg text-fit-red",
        className,
      )}
    >
      {copy[band]}
    </span>
  );
}

export function StagePill({ stage }: { stage: string }) {
  return (
    <span className="inline-flex rounded-sm bg-secondary px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-navy">
      {stage}
    </span>
  );
}
