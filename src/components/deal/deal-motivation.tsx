import type { MotivationStat } from "@/lib/deals/motivation";

function Spark({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  const w = 48;
  const h = 14;
  const step = values.length > 1 ? w / (values.length - 1) : w;
  const points = values
    .map((value, i) => `${i * step},${h - (value / max) * (h - 2) - 1}`)
    .join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden className="text-primary shrink-0">
      <polyline fill="none" stroke="currentColor" strokeWidth="1.5" points={points} />
    </svg>
  );
}

/** Compact quotes-pulled chip for the top-right header corner. */
export function DealMotivation({ stats }: { stats: MotivationStat[] }) {
  const primary = stats[0];
  const secondary = stats[1];
  if (!primary) return null;

  return (
    <aside
      className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1.5 shadow-sm"
      data-ff-deal-motivation=""
      title={primary.hint}
    >
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase leading-none tracking-wide text-muted-foreground">
          {primary.label}
        </p>
        <p className="mt-0.5 text-sm font-semibold leading-none text-navy">
          {primary.valueLabel}
          {secondary ? (
            <span className="ml-1.5 text-[10px] font-medium text-muted-foreground">
              · {secondary.label} {secondary.valueLabel}
            </span>
          ) : null}
        </p>
      </div>
      <Spark values={primary.spark} />
    </aside>
  );
}
