export function EventSpark({ values, label }: { values: number[]; label?: string }) {
  const max = Math.max(1, ...values);
  const width = 56;
  const height = 16;
  const step = values.length > 1 ? width / (values.length - 1) : width;
  const points = values
    .map((value, index) => {
      const x = index * step;
      const y = height - (value / max) * (height - 2) - 1;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg
      className="ff-event-spark"
      data-ff-event-spark=""
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      aria-hidden
      title={label}
    >
      <polyline fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" points={points} />
    </svg>
  );
}
