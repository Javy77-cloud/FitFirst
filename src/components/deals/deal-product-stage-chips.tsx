import { listProductStageLabel, type ListProductStageChip } from "@/lib/deals/product-stages";
import { cn } from "@/lib/utils";

export function DealProductStageChips({
  chips,
  className,
}: {
  chips: readonly ListProductStageChip[];
  className?: string;
}) {
  if (!chips.length) return null;
  return (
    <div
      className={cn("flex flex-wrap items-center gap-1", className)}
      data-ff-deal-product-stage-chips=""
    >
      {chips.map((chip) => (
        <span
          key={chip.product}
          className="inline-flex max-w-full items-center gap-1 rounded-full border border-border bg-card px-1.5 py-0.5 text-[10px] font-semibold leading-tight text-navy"
          data-ff-list-product-stage-chip={chip.product}
          data-ff-list-product-stage={chip.stage}
          title={`${chip.label} · ${chip.stageLabel || listProductStageLabel(chip.stage)}`}
        >
          <span>{chip.label}</span>
          <span className="font-medium text-muted-foreground">
            {chip.stageLabel || listProductStageLabel(chip.stage)}
          </span>
        </span>
      ))}
    </div>
  );
}
