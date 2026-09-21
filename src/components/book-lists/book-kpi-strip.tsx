import type { BookKpiItem, BookKpiShare } from "@/lib/book-lists/kpi";

const SHARE_COLORS = ["var(--ff-navy)", "var(--ff-heat-near-cold)", "var(--ff-urgency-amber)", "var(--ff-border)"] as const;

function SharePie({ share }: { share: BookKpiShare[] }) {
  let cursor = 0;
  const stops = share.map((slice, index) => {
    const start = cursor;
    cursor += slice.pct;
    const color = SHARE_COLORS[index] ?? SHARE_COLORS[SHARE_COLORS.length - 1];
    return `${color} ${start}% ${cursor}%`;
  });
  return (
    <div className="ff-book-share" data-ff-book-share="">
      <span
        className="ff-book-share-pie"
        style={{ background: `conic-gradient(${stops.join(", ")})` }}
        aria-hidden
      />
      <ul>
        {share.slice(0, 3).map((slice) => (
          <li key={slice.name}>
            <strong>{slice.pct}%</strong> {slice.name}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function BookKpiStrip({
  label,
  items,
  share = null,
}: {
  label: string;
  items: BookKpiItem[];
  share?: BookKpiShare[] | null;
}) {
  return (
    <section className="ff-book-kpi" data-ff-book-kpi="" aria-label={label}>
      {items.map((item) => (
        <div
          key={item.id}
          className={item.variant === "name" ? "ff-book-kpi-item is-name" : "ff-book-kpi-item"}
          data-ff-book-kpi-item={item.id}
        >
          <strong title={item.variant === "name" ? item.value : undefined}>{item.value}</strong>
          <span>{item.label}</span>
          {item.hint ? <em>{item.hint}</em> : null}
        </div>
      ))}
      {share && share.length > 1 ? <SharePie share={share} /> : null}
    </section>
  );
}
