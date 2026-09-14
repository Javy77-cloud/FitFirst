import { StatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";
import type { FitBand } from "@/lib/domain";
import { stageColorFromNameOrSlug } from "@/lib/desk/status-colors";

const copy: Record<FitBand, string> = {
  green: "In appetite",
  yellow: "Stretch / override",
  red: "Skip",
};

export function FitBadge({ band, className }: { band: FitBand; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm px-1.5 py-0.5 text-caption font-semibold uppercase tracking-wide",
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

const STAGE_LABEL: Record<string, string> = {
  shopping: "Shopping",
  quoting: "Quoting",
  comparing: "Comparing",
  quote_sent: "Quote Sent",
  bound: "Bound",
  closed_won: "Closed Won",
  lost: "Lost",
};

export function StagePill({
  stage,
  color,
  className,
}: {
  stage: string;
  color?: string | null;
  className?: string;
}) {
  const label = STAGE_LABEL[stage] ?? stage.replaceAll("_", " ");
  return (
    <StatusBadge
      color={stageColorFromNameOrSlug(stage, color)}
      className={cn("max-w-none whitespace-nowrap", className)}
    >
      {label}
    </StatusBadge>
  );
}
