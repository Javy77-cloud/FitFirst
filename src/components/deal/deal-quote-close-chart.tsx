import {
  quoteCloseFromStats,
  type MotivationStat,
  type QuoteCloseChart,
} from "@/lib/deals/motivation";

const DONUT_PX = 64;
const DONUT_R = 22;
const DONUT_STROKE = 9;

/** Quotes-to-bound donut for the gap under Monthly momentum. Real counts only. */
export function DealQuoteCloseChart({ stats }: { stats: MotivationStat[] }) {
  const chart = quoteCloseFromStats(stats);
  if (!chart) return null;

  return (
    <aside
      className="w-full rounded-xl border border-border bg-card px-4 py-2.5 shadow-sm"
      data-ff-deal-quote-close=""
    >
      <div className="flex w-full items-center justify-between gap-4 px-1">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Quotes to bound
          </p>
          <p className="mt-1 text-base font-semibold text-navy">This month</p>
          <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1" data-ff-quote-close-legend="">
            {chart.slices.map((slice) => (
              <li key={slice.key} className="flex items-center gap-1.5 text-sm">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ background: slice.color }}
                  data-ff-quote-close-swatch={slice.key}
                />
                <span className="font-medium text-navy">{slice.label}</span>
                <span className="font-semibold tabular-nums text-navy" data-ff-quote-close-count={slice.key}>
                  {slice.count}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <QuoteCloseDonut chart={chart} />
      </div>
    </aside>
  );
}

function QuoteCloseDonut({ chart }: { chart: QuoteCloseChart }) {
  const circ = 2 * Math.PI * DONUT_R;
  const drawn = chart.slices.filter((slice) => slice.share > 0);
  const total = drawn.reduce((sum, slice) => sum + slice.share, 0);
  const gap = drawn.length > 1 ? 2.5 : 0;
  let offset = 0;
  const arcs = drawn.map((slice) => {
    const len = Math.max(0, (slice.share / total) * circ - gap);
    const arc = { key: slice.key, color: slice.color, len, offset };
    offset += len + gap;
    return arc;
  });

  return (
    <svg
      viewBox="0 0 64 64"
      width={DONUT_PX}
      height={DONUT_PX}
      className="shrink-0"
      style={{ width: DONUT_PX, height: DONUT_PX }}
      role="img"
      aria-label={`Quotes to bound ${chart.rateLabel}. Bound ${chart.bound}. Open ${chart.open}.`}
      data-ff-quote-close-chart="donut"
    >
      <circle cx="32" cy="32" r={DONUT_R} fill="none" stroke="#dbe3ee" strokeWidth={DONUT_STROKE} />
      {arcs.map((arc) => (
        <circle
          key={arc.key}
          cx="32"
          cy="32"
          r={DONUT_R}
          fill="none"
          stroke={arc.color}
          strokeWidth={DONUT_STROKE}
          strokeDasharray={`${arc.len} ${circ}`}
          strokeDashoffset={-arc.offset}
          transform="rotate(-90 32 32)"
          data-ff-quote-close-arc={arc.key}
        />
      ))}
      <text
        x="32"
        y="32"
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-navy"
        style={{ fontSize: 13, fontWeight: 700 }}
        data-ff-quote-close-rate=""
      >
        {chart.rateLabel}
      </text>
    </svg>
  );
}
