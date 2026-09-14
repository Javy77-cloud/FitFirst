import type { LeadMotivationStat } from "@/lib/leads/motivation";

function percentValue(label: string): number {
  const value = Number.parseInt(label.replace("%", ""), 10);
  return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
}

/** Agent-facing motivation chart for the Leads list top-right corner. */
export function LeadMotivation({ stats }: { stats: LeadMotivationStat[] }) {
  const leadsToday = stats.find((stat) => stat.id === "leads-today");
  const convertRate = stats.find((stat) => stat.id === "convert-rate");
  if (!leadsToday || !convertRate) return null;

  const rate = percentValue(convertRate.valueLabel);
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const dash = (rate / 100) * circumference;
  const spark = convertRate.spark;
  const sparkMax = Math.max(1, ...spark);

  return (
    <aside
      className="w-full rounded-xl border border-border bg-card px-4 py-3 shadow-sm"
      data-ff-lead-motivation=""
      title={convertRate.hint}
    >
      <div className="flex w-full items-center justify-between gap-5 px-2">
        <div className="min-w-0 flex-1 pl-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Lead momentum
          </p>
          <p className="mt-1 text-base font-semibold text-navy">Your convert rate</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {rate > 0 ? "Keep turning leads into deals." : "Every new lead is a shot to convert."}
          </p>
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
          className="relative h-[92px] w-[92px] shrink-0"
          aria-label={`${convertRate.label}: ${convertRate.valueLabel}`}
          data-ff-motivation-chart=""
        >
          <svg viewBox="0 0 92 92" className="block h-[92px] w-[92px] -rotate-90" aria-hidden>
            <circle cx="46" cy="46" r={radius} fill="none" stroke="#dbe3ee" strokeWidth="10" />
            <circle
              cx="46"
              cy="46"
              r={radius}
              fill="none"
              stroke="var(--ff-accent)"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${circumference - dash}`}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-lg font-bold text-navy">
            {convertRate.valueLabel}
          </div>
        </div>
      </div>
    </aside>
  );
}
