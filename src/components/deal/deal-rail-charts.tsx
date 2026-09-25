import type { AppetiteMixSlice, ShoppingProgressRow } from "@/lib/deals/rail-charts";

const MIX_COLOR: Record<AppetiteMixSlice["key"], string> = {
  appetite: "#12b886",
  stretch: "#f26522",
  skip: "#94a3b8",
};

/** Two rail graphs only: active-product appetite mix on top, this deal's shopping progress below. */
export function DealRailCharts({
  progress,
  mix,
}: {
  progress: ShoppingProgressRow[];
  mix: { slices: AppetiteMixSlice[]; total: number };
}) {
  return (
    <div className="flex w-full flex-col gap-2" data-ff-deal-rail-charts="">
      <AppetiteMixChart mix={mix} />
      <ShoppingProgressChart rows={progress} />
    </div>
  );
}

function ShoppingProgressChart({ rows }: { rows: ShoppingProgressRow[] }) {
  return (
    <aside
      className="w-full rounded-xl border border-border bg-card px-3 py-2.5 shadow-sm"
      data-ff-deal-shopping-progress=""
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Shopping progress (this deal)
      </p>
      <ul className="mt-2 space-y-1.5">
        {rows.map((row) => (
          <li key={row.key} className="min-w-0" data-ff-shopping-progress-row={row.key}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-sm font-semibold text-navy">{row.label}</span>
              <span className="shrink-0 text-xs font-medium text-navy" data-ff-shopping-progress-stage="">
                {row.stageLabel}
              </span>
            </div>
            <div
              className="mt-1 flex h-2 gap-0.5"
              role="img"
              aria-label={`${row.label} ${row.stageLabel}`}
              data-ff-shopping-progress-bar=""
            >
              {Array.from({ length: row.total }, (_, index) => (
                <span
                  key={index}
                  className="h-full flex-1 rounded-sm"
                  style={{
                    background: index < row.filled ? (row.lost ? "#94a3b8" : "#12b886") : "#dbe3ee",
                  }}
                  data-ff-shopping-progress-step={index < row.filled ? "on" : "off"}
                />
              ))}
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
}

function AppetiteMixChart({ mix }: { mix: { slices: AppetiteMixSlice[]; total: number } }) {
  const total = mix.total;
  return (
    <aside
      className="w-full rounded-xl border border-border bg-card px-3 py-2.5 shadow-sm"
      data-ff-deal-appetite-mix=""
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Markets appetite mix (active product)
      </p>
      <div
        className="mt-2 flex h-3 overflow-hidden rounded-full bg-[#dbe3ee]"
        role="img"
        aria-label={mix.slices.map((slice) => `${slice.label} ${slice.count}`).join(", ")}
        data-ff-appetite-mix-bar=""
      >
        {total > 0
          ? mix.slices.map((slice) =>
              slice.count > 0 ? (
                <span
                  key={slice.key}
                  style={{
                    width: `${(slice.count / total) * 100}%`,
                    background: MIX_COLOR[slice.key],
                  }}
                  data-ff-appetite-mix-slice={slice.key}
                />
              ) : null,
            )
          : null}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        {mix.slices.map((slice) => (
          <li key={slice.key} className="flex items-center gap-1.5 text-sm">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ background: MIX_COLOR[slice.key] }}
              data-ff-appetite-mix-swatch={slice.key}
            />
            <span className="font-medium text-navy">{slice.label}</span>
            <span className="font-semibold tabular-nums text-navy" data-ff-appetite-mix-count={slice.key}>
              {slice.count}
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
