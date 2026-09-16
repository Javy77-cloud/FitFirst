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
  gathering: "Gathering",
  markets: "Markets",
  quote_review: "Quote review",
  shopping: "Gathering",
  quoting: "Markets",
  comparing: "Quote review",
  quote_sent: "Quote sent",
  bound: "Bound",
  policy_issued: "Policy issued",
  closed_won: "Closed won",
  closed_lost: "Closed lost",
  lost: "Closed lost",
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
