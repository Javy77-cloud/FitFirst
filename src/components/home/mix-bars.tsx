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

export function MixBars({
  slices,
  empty,
}: {
  slices: MixSlice[];
  empty: string;
}) {
  const max = Math.max(...slices.map((s) => s.premium), 0);
  if (!max) {
    return <p className="px-1 py-6 text-base text-muted-foreground">{empty}</p>;
  }

  return (
    <ul className="space-y-2.5">
      {slices.map((slice, index) => {
        const width = max ? Math.max(4, (slice.premium / max) * 100) : 0;
        const color = COLORS[index % COLORS.length];
        return (
          <li key={slice.key}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-[13px]">
              <span className="font-medium text-navy">{slice.label}</span>
              <span className="tabular-nums text-muted-foreground">
                {slice.count} · {formatMoney(slice.premium)}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-secondary">
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
