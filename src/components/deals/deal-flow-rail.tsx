import { DEAL_SHOP_FLOW, flowIndex, nextStepCopy, type DealFlowStepId } from "@/lib/deals/product-ui";
import { cn } from "@/lib/utils";

export function DealFlowRail({
  current,
  nextHint,
  productComplete,
  activeLabel,
  completed = [],
}: {
  current: DealFlowStepId;
  nextHint?: string | null;
  productComplete?: boolean;
  activeLabel?: string | null;
  /** Sticky completed steps — not “everything before the URL tab”. */
  completed?: readonly DealFlowStepId[];
}) {
  const here = flowIndex(current);
  const completedSet = new Set(completed);
  const hint =
    nextHint ??
    nextStepCopy({
      step: current,
      activeLabel,
      productComplete,
    });
  return (
    <div className="space-y-1.5" data-ff-deal-flow-rail="" data-ff-deal-flow-current={current}>
      <ol className="flex flex-wrap items-center gap-1">
        {DEAL_SHOP_FLOW.map((step, index) => {
          const done = completedSet.has(step.id);
          const active = index === here;
          return (
            <li key={step.id} className="flex items-center gap-1">
              {index > 0 ? (
                <span className="mx-0.5 text-[10px] text-muted-foreground" aria-hidden>
                  →
                </span>
              ) : null}
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                  active && "border-navy bg-navy text-white",
                  done && !active && "border-[var(--ff-green)] bg-[var(--ff-green-bg)] text-[var(--ff-green)]",
                  !active && !done && "border-border bg-[var(--ff-card)] text-muted-foreground",
                )}
                data-ff-deal-flow-step={step.id}
                data-ff-deal-flow-done={done ? "true" : "false"}
                data-active={active ? "true" : "false"}
              >
                <span className="tabular-nums opacity-80">{index + 1}</span>
                {step.label}
                {done ? <span aria-hidden>✓</span> : null}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="text-[13px] font-medium text-navy" data-ff-deal-flow-next="">
        {hint}
      </p>
    </div>
  );
}
