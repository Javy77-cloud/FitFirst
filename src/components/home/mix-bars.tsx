import { formatMoney } from "@/lib/domain";
import type { MixSlice } from "@/lib/home/aggregate";
import { chartColor } from "@/lib/home/chart-colors";

export function MixBars({
  slices,
  empty,
  compact = false,
}: {
  slices: MixSlice[];
  empty: string;
  compact?: boolean;
}) {
  const shown = compact
    ? [...slices].sort((a, b) => b.premium - a.premium).filter((s) => s.premium > 0).slice(0, 6)
    : slices;
  const max = Math.max(...shown.map((s) => s.premium), 0);
  if (!max) {
    return <p className="px-1 py-3 text-sm text-muted-foreground">{empty}</p>;
  }

  return (
    <ul className={compact ? "space-y-1" : "space-y-2.5"}>
      {shown.map((slice, index) => {
        const width = max ? Math.max(4, (slice.premium / max) * 100) : 0;
        const color = chartColor(index);
        return (
          <li key={slice.key}>
            <div className="mb-0.5 flex items-baseline justify-between gap-3 text-xs">
              <span className="flex min-w-0 items-center gap-1.5 font-medium text-navy">
                <span className="size-2.5 shrink-0 rounded-full" style={{ background: color }} />
                {slice.label}
              </span>
              <span className="tabular-nums text-muted-foreground">
                {slice.count} · {formatMoney(slice.premium)}
              </span>
            </div>
            <div className={`overflow-hidden rounded-full bg-secondary ${compact ? "h-2" : "h-2.5"}`}>
              <div
                className="h-full rounded-full"
                style={{ width: `${width}%`, background: color }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
