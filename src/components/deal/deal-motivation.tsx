import type { MotivationStat } from "@/lib/deals/motivation";

function Spark({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  const w = 56;
  const h = 16;
  const step = values.length > 1 ? w / (values.length - 1) : w;
  const points = values
    .map((value, i) => `${i * step},${h - (value / max) * (h - 2) - 1}`)
    .join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden className="text-primary">
      <polyline fill="none" stroke="currentColor" strokeWidth="1.5" points={points} />
    </svg>
  );
}

/** Compact "Quotes pulled" corner chip — sits above the panels, not in the right rail. */
export function DealMotivation({ stats }: { stats: MotivationStat[] }) {
  const primary = stats[0];
  const secondary = stats[1];
  if (!primary) return null;

  return (
    <aside
      className="inline-flex max-w-[13rem] flex-col rounded-md border border-border bg-card px-2 py-1.5 shadow-sm"
      data-ff-deal-motivation=""
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {primary.label}
        </p>
        <Spark values={primary.spark} />
      </div>
      <p className="text-base font-semibold leading-tight text-navy">{primary.valueLabel}</p>
      {secondary ? (
        <p className="text-[10px] leading-tight text-navy">
          {secondary.label}: <span className="font-semibold">{secondary.valueLabel}</span>
        </p>
      ) : null}
    </aside>
  );
}
