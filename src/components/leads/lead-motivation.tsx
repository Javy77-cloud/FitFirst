import type { LeadMotivationStat } from "@/lib/leads/motivation";

/** Agent-facing live counts for the Leads list. No invented percents. */
export function LeadMotivation({ stats }: { stats: LeadMotivationStat[] }) {
  const leadsToday = stats.find((stat) => stat.id === "leads-today");
  const converted = stats.find((stat) => stat.id === "converted-this-month");
  if (!leadsToday || !converted) return null;

  const spark = converted.spark;
  const sparkMax = Math.max(1, ...spark);

  return (
    <aside
      className="rounded-xl border border-border bg-card px-4 py-3 shadow-sm"
      data-ff-lead-motivation=""
      title={converted.hint}
    >
      <div className="flex w-full items-center justify-between gap-5 px-2">
        <div className="min-w-0 flex-1 pl-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Lead momentum
          </p>
          <p className="mt-1 text-base font-semibold text-navy">Converted this month</p>

          <div className="mt-2 inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
            {leadsToday.valueLabel} new leads today
          </div>
          <div
            className="mt-2.5 flex h-7 items-end gap-0.5"
            aria-hidden
            data-ff-lead-motivation-spark=""
          >
            {spark.map((n, i) => (
              <span
                key={i}
                className="w-2.5 rounded-sm bg-primary/70"
                style={{ height: `${Math.max(12, Math.round((n / sparkMax) * 28))}px` }}
              />
            ))}
          </div>
        </div>
        <div
          className="relative flex h-[92px] w-[92px] shrink-0 items-center justify-center rounded-full border-[10px] border-[#dbe3ee]"
          aria-label={`${converted.label}: ${converted.valueLabel}`}
          data-ff-motivation-chart=""
        >
          <div className="text-lg font-bold text-navy">{converted.valueLabel}</div>
        </div>
      </div>
    </aside>
  );
}
