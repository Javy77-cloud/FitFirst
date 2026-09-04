const TONE = [
  "var(--ff-accent)",
  "var(--ff-navy)",
  "var(--ff-green)",
  "var(--ff-navy-mid)",
  "var(--ff-yellow)",
];

export function TrendSpark({
  values,
  label,
  colorIndex = 0,
}: {
  values: number[];
  label: string;
  colorIndex?: number;
}) {
  const max = Math.max(...values, 1);
  const color = TONE[colorIndex % TONE.length];
  return (
    <div aria-label={label}>
      <div className="mb-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="flex h-8 items-end gap-0.5">
        {values.map((value, index) => (
          <span
            key={`${label}-${index}`}
            className="min-w-0 flex-1 rounded-t-sm"
            style={{
              height: `${Math.max(12, Math.round((value / max) * 100))}%`,
              background: color,
              opacity: 0.45 + (index / Math.max(values.length - 1, 1)) * 0.55,
            }}
          />
        ))}
      </div>
    </div>
  );
}
