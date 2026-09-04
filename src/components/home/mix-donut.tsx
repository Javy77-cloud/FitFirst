import { formatMoney } from "@/lib/domain";
import type { MixSlice } from "@/lib/home/aggregate";
import { chartColor } from "@/lib/home/chart-colors";

/** In-force slices only. Zero-premium types (and quotes) stay off the donut. */
export function visiblePolicyTypeSlices(slices: MixSlice[]): MixSlice[] {
  return slices.filter((slice) => slice.premium > 0 && slice.count > 0);
}

export function MixDonut({
  slices,
  empty,
}: {
  slices: MixSlice[];
  empty: string;
}) {
  const shown = visiblePolicyTypeSlices(slices);
  const totalPremium = shown.reduce((sum, slice) => sum + slice.premium, 0);
  const totalCount = shown.reduce((sum, slice) => sum + slice.count, 0);

  if (!shown.length || totalPremium <= 0) {
    return <p className="px-1 py-3 text-sm text-muted-foreground">{empty}</p>;
  }

  const radius = 42;
  const circ = 2 * Math.PI * radius;
  let offset = 0;
  const arcs = shown.map((slice, index) => {
    const len = (slice.premium / totalPremium) * circ;
    const arc = {
      slice,
      color: chartColor(index),
      dash: `${len} ${circ - len}`,
      offset,
      share: slice.premium / totalPremium,
    };
    offset += len;
    return arc;
  });

  return (
    <div className="mt-1 flex flex-col items-center gap-4 sm:flex-row sm:items-center">
      <svg
        viewBox="0 0 120 120"
        className="size-36 shrink-0"
        role="img"
        aria-label="In-force premium by policy type"
      >
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="var(--ff-border)"
          strokeWidth="18"
        />
        {arcs.map((arc) => (
          <circle
            key={arc.slice.key}
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke={arc.color}
            strokeWidth="18"
            strokeDasharray={arc.dash}
            strokeDashoffset={-arc.offset}
            transform="rotate(-90 60 60)"
          />
        ))}
        <text
          x="60"
          y="56"
          textAnchor="middle"
          className="fill-navy"
          style={{ fontSize: 16, fontWeight: 600 }}
        >
          {totalCount}
        </text>
        <text
          x="60"
          y="72"
          textAnchor="middle"
          className="fill-[color:var(--ff-muted)]"
          style={{ fontSize: 8 }}
        >
          in force
        </text>
      </svg>
      <ul className="min-w-0 w-full space-y-1.5 text-xs">
        {arcs.map((arc) => (
          <li key={arc.slice.key} className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-1.5">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ background: arc.color }}
              />
              <span className="truncate font-medium text-navy">{arc.slice.label}</span>
            </span>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {arc.slice.count} · {formatMoney(arc.slice.premium)} · {Math.round(arc.share * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
