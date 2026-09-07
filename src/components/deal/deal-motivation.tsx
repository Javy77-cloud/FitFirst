import type { MotivationStat } from "@/lib/deals/motivation";

function Spark({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  const w = 72;
  const h = 22;
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

export function DealMotivation({ stats }: { stats: MotivationStat[] }) {
  const primary = stats[0];
  const secondary = stats[1];
  if (!primary) return null;

  return (
    <aside
      className="min-w-0 w-full max-w-[11rem] rounded-md border border-border bg-card px-2.5 py-2"
      data-ff-deal-motivation
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {primary.label}
      </p>
      <div className="mt-0.5 flex items-end justify-between gap-2">
        <p className="text-lg font-semibold leading-none text-navy">{primary.valueLabel}</p>
        <Spark values={primary.spark} />
      </div>
      {secondary ? (
        <p className="mt-1 text-[11px] text-navy">
          {secondary.label}: <span className="font-semibold">{secondary.valueLabel}</span>
        </p>
      ) : null}
      <p className="mt-1 text-[10px] leading-snug text-muted-foreground">
        {primary.sample || secondary?.sample ? "Sample · " : ""}
        {primary.sample ? primary.hint : secondary?.sample ? secondary.hint : primary.hint}
      </p>
    </aside>
  );
}
