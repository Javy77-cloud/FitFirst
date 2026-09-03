import { formatMoney } from "@/lib/domain";
import type { MixSlice } from "@/lib/home/aggregate";

const COLORS = [
  "var(--ff-accent)",
  "var(--ff-navy)",
  "var(--ff-green)",
  "var(--ff-navy-mid)",
  "var(--ff-yellow)",
  "var(--ff-sidebar-muted)",
];

export function CompactMix({
  slices,
  empty,
}: {
  slices: MixSlice[];
  empty: string;
}) {
  const live = slices.filter((slice) => slice.premium > 0);
  const total = live.reduce((sum, slice) => sum + slice.premium, 0);
  if (!total) {
    return <p className="text-sm text-muted-foreground">{empty}</p>;
  }

  return (
    <div>
      <div className="flex h-2 overflow-hidden rounded-full bg-secondary" role="img" aria-label="Premium mix">
        {live.map((slice, index) => (
          <div
            key={slice.key}
            className="h-full"
            style={{
              width: `${(slice.premium / total) * 100}%`,
              background: COLORS[index % COLORS.length],
            }}
            title={`${slice.label} ${formatMoney(slice.premium)}`}
          />
        ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm">
        {live.map((slice, index) => (
          <li key={slice.key} className="inline-flex items-center gap-1.5 text-navy">
            <span
              className="size-1.5 shrink-0 rounded-full"
              style={{ background: COLORS[index % COLORS.length] }}
            />
            <span className="font-medium">{slice.label}</span>
            <span className="tabular-nums text-muted-foreground">
              {slice.count} · {formatMoney(slice.premium)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
