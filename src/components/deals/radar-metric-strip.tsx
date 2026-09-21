import { radarGlance } from "@/lib/deals/radar-glance";
import type { RadarDealCard } from "@/lib/deals/radar-desk";

function Spark({ values }: { values: number[] }) {
  if (values.length < 2 || values.every((value) => value === 0)) return null;
  const width = 92;
  const height = 22;
  const max = Math.max(...values, 1);
  const step = width / (values.length - 1);
  const points = values
    .map((value, index) => {
      const x = index * step;
      const y = height - (value / max) * (height - 2) - 1;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg className="ff-radar-strip-spark" viewBox={`0 0 ${width} ${height}`} aria-hidden data-ff-radar-spark="">
      <polyline fill="none" stroke="currentColor" strokeWidth="1.6" points={points} />
    </svg>
  );
}

/** One thin line above the heat rows. The rows themselves stay as they are. */
export function RadarMetricStrip({ cards }: { cards: RadarDealCard[] }) {
  const glance = radarGlance(cards);
  const silent =
    glance.medianSilence == null
      ? "No silence clock"
      : glance.medianSilence === 1
        ? "median 1 day silent"
        : `median ${glance.medianSilence} days silent`;

  return (
    <section className="ff-radar-strip" aria-label="Radar glance">
      <p>
        <strong data-ff-radar-total="">{glance.total}</strong>
        <span>{glance.total === 1 ? "deal" : "deals"}</span>
      </p>
      <p data-ff-radar-hot="">
        <strong>{glance.hot}</strong>
        <span>hot</span>
      </p>
      <p data-ff-radar-silent="">{silent}</p>
      <Spark values={glance.spark} />
    </section>
  );
}
