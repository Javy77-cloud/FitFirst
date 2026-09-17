import type { MotivationStat } from "@/lib/deals/motivation";

/** Agent-facing live counts for the deal desk's top-right corner. No invented percents. */
export function DealMotivation({ stats }: { stats: MotivationStat[] }) {
  const quotes = stats.find((stat) => stat.id === "quotes-today");
  const bound = stats.find((stat) => stat.id === "bound-this-month");
  if (!quotes || !bound) return null;

  return (
    <aside
      className="w-full rounded-xl border border-border bg-card px-4 py-3 shadow-sm"
      data-ff-deal-motivation=""
      title={bound.hint}
    >
      <div className="flex w-full items-center justify-between gap-5 px-2">
        <div className="min-w-0 flex-1 pl-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Monthly momentum
          </p>
          <p className="mt-1 text-base font-semibold text-navy">Bound this month</p>
          <p className="mt-1 text-sm text-muted-foreground">{bound.hint}</p>
          <div className="mt-2 inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
            {quotes.valueLabel} quotes pulled today
          </div>
        </div>
        <div
          className="relative flex h-[92px] w-[92px] shrink-0 items-center justify-center rounded-full border-[10px] border-[#dbe3ee]"
          aria-label={`${bound.label}: ${bound.valueLabel}`}
          data-ff-motivation-chart=""
        >
          <div className="text-lg font-bold text-navy">{bound.valueLabel}</div>
        </div>
      </div>
    </aside>
  );
}
