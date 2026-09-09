import type { MotivationStat } from "@/lib/deals/motivation";

function percentValue(label: string): number {
  const value = Number.parseInt(label.replace("%", ""), 10);
  return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
}

/** Agent-facing motivation chart for the deal desk's top-right corner. */
export function DealMotivation({ stats }: { stats: MotivationStat[] }) {
  const quotes = stats.find((stat) => stat.id === "quotes-today");
  const bindRate = stats.find((stat) => stat.id === "bind-rate");
  if (!quotes || !bindRate) return null;

  const rate = percentValue(bindRate.valueLabel);
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const dash = (rate / 100) * circumference;

  return (
    <aside
      className="w-full rounded-xl border border-border bg-card px-4 py-3 shadow-sm"
      data-ff-deal-motivation=""
      title={bindRate.hint}
    >
      <div className="flex w-full items-center justify-between gap-5 px-2">
        <div className="min-w-0 flex-1 pl-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Monthly momentum
          </p>
          <p className="mt-1 text-base font-semibold text-navy">Your bind rate</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {rate > 0 ? "Keep the streak moving." : "Every quote is a new chance to bind."}
          </p>
          <div className="mt-2 inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
            {quotes.valueLabel} quotes pulled today
          </div>
        </div>
        <div
          className="relative h-[92px] w-[92px] shrink-0"
          aria-label={`${bindRate.label}: ${bindRate.valueLabel}`}
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
            {bindRate.valueLabel}
          </div>
        </div>
      </div>
    </aside>
  );
}
