import { cn } from "@/lib/utils";
import {
  compareSummary,
  formatDeltaPct,
  formatSignedMoney,
  type PremiumChange,
} from "@/lib/renewal/compare";
import { formatMoney } from "@/lib/domain";

export function PremiumChangeSummary({
  change,
  className,
}: {
  change: PremiumChange;
  className?: string;
}) {
  const tone =
    change.direction === "up"
      ? "bg-fit-red-bg text-fit-red"
      : change.direction === "down"
        ? "bg-fit-green-bg text-fit-green"
        : "bg-secondary text-navy";

  return (
    <section className={cn("ff-card p-4", className)}>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
        Premium change
      </div>
      <div className="mt-1 flex flex-wrap items-end gap-3">
        <div className={cn("rounded-md px-2.5 py-1 text-xl font-semibold", tone)}>
          {formatSignedMoney(change.delta)}
          <span className="ml-2 text-base font-medium">{formatDeltaPct(change.pct)}</span>
        </div>
        <div className="text-sm text-muted-foreground">
          {formatMoney(change.current)} → {formatMoney(change.proposed)}
        </div>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{compareSummary(change)}</p>
    </section>
  );
}
