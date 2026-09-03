import type { NamedTotal } from "@/lib/commissions/rollups";

const TOKEN_COLORS = [
  "var(--ff-accent)",
  "var(--ff-green)",
  "var(--ff-yellow)",
  "var(--ff-red)",
  "var(--ff-navy)",
];

function colorAt(i: number) {
  return TOKEN_COLORS[i % TOKEN_COLORS.length] ?? "var(--ff-accent)";
}

export function ShareDonut({
  title,
  slices,
}: {
  title: string;
  slices: NamedTotal[];
}) {
  const total = slices.reduce((sum, s) => sum + s.commission, 0);
  if (slices.length === 0 || total <= 0) {
    return (
      <div className="ff-card p-4">
        <h3 className="text-sm font-semibold text-navy">{title}</h3>
        <p className="mt-3 text-sm text-muted-foreground">No commission mix to chart yet.</p>
      </div>
    );
  }

  const radius = 42;
  const circ = 2 * Math.PI * radius;
  let offset = 0;
  const arcs = slices.map((slice, i) => {
    const len = (slice.commission / total) * circ;
    const arc = { slice, color: colorAt(i), dash: `${len} ${circ - len}`, offset };
    offset += len;
    return arc;
  });

  return (
    <div className="ff-card p-4">
      <h3 className="text-sm font-semibold text-navy">{title}</h3>
      <div className="mt-3 flex items-center gap-4">
        <svg viewBox="0 0 120 120" className="size-28 shrink-0" aria-hidden>
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="var(--ff-border)"
            strokeWidth="16"
          />
          {arcs.map((arc) => (
            <circle
              key={arc.slice.key}
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke={arc.color}
              strokeWidth="16"
              strokeDasharray={arc.dash}
              strokeDashoffset={-arc.offset}
              transform="rotate(-90 60 60)"
            />
          ))}
        </svg>
        <ul className="min-w-0 space-y-1 text-xs">
          {arcs.map((arc) => (
            <li key={arc.slice.key} className="flex items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="size-2 shrink-0 rounded-sm" style={{ background: arc.color }} />
                <span className="truncate">{arc.slice.label}</span>
              </span>
              <span className="tabular-nums text-muted-foreground">
                {Math.round((arc.slice.commission / total) * 100)}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function MixBars({
  title,
  bars,
}: {
  title: string;
  bars: NamedTotal[];
}) {
  const max = Math.max(...bars.map((b) => b.commission), 0);
  return (
    <div className="ff-card p-4">
      <h3 className="text-sm font-semibold text-navy">{title}</h3>
      {bars.length === 0 || max <= 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No line mix yet.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {bars.map((bar, i) => (
            <li key={bar.key}>
              <div className="mb-0.5 flex justify-between text-xs">
                <span>{bar.label}</span>
                <span className="tabular-nums text-muted-foreground">{bar.count} rows</span>
              </div>
              <div className="h-2 overflow-hidden rounded-sm bg-[color-mix(in_srgb,var(--ff-border)_70%,white)]">
                <div
                  className="h-full rounded-sm"
                  style={{
                    width: `${Math.max(6, (bar.commission / max) * 100)}%`,
                    background: colorAt(i),
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
