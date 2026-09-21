import { radarDesk, type RadarDeskCard } from "@/lib/deals/radar-glance";
import { HEAT_LABELS, HEAT_STATES, type HeatState } from "@/lib/deals/velocity";
import { cn } from "@/lib/utils";

const HEAT_STROKE: Record<HeatState, string> = {
  hot: "var(--ff-heat-hot)",
  cooling: "var(--ff-heat-cooling)",
  near_cold: "var(--ff-heat-near-cold)",
  cold: "var(--ff-heat-cold)",
};

function BookDonut({ counts, total }: { counts: Record<HeatState, number>; total: number }) {
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const arcs =
    total === 0
      ? []
      : HEAT_STATES.filter((heat) => counts[heat] > 0).map((heat) => {
          const length = (counts[heat] / total) * circumference;
          const arc = { heat, dash: `${length} ${circumference - length}`, offset };
          offset += length;
          return arc;
        });

  return (
    <div className="ff-radar-donut-wrap">
      <svg viewBox="0 0 160 160" className="ff-radar-donut" role="img" aria-label="Book heat">
        <circle
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          stroke="color-mix(in srgb, var(--ff-border) 80%, white)"
          strokeWidth="18"
        />
        {arcs.map((arc) => (
          <circle
            key={arc.heat}
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke={HEAT_STROKE[arc.heat]}
            strokeWidth="18"
            strokeDasharray={arc.dash}
            strokeDashoffset={-arc.offset}
            transform="rotate(-90 80 80)"
          />
        ))}
      </svg>
      <div className="ff-radar-donut-center">
        <strong data-ff-radar-donut-total="">{total}</strong>
        <span>{total === 1 ? "deal" : "deals"}</span>
      </div>
    </div>
  );
}

function SilenceChart({
  bands,
}: {
  bands: Array<{ id: string; label: string; hint: string; count: number }>;
}) {
  const max = Math.max(...bands.map((band) => band.count), 1);
  return (
    <div className="ff-radar-bars" data-ff-radar-silence="" aria-label="Silence distribution">
      {bands.map((band) => (
        <div key={band.id} className="ff-radar-bar" data-ff-radar-silence-band={band.id}>
          <span className="ff-radar-bar-value">{band.count}</span>
          <span className="ff-radar-bar-track">
            <i style={{ height: `${Math.max(band.count === 0 ? 0 : 8, (band.count / max) * 100)}%` }} />
          </span>
          <span className="ff-radar-bar-label">{band.label}</span>
          <span className="ff-radar-bar-hint">{band.hint}</span>
        </div>
      ))}
    </div>
  );
}

function TrendChart({ values }: { values: number[] }) {
  const width = 320;
  const height = 168;
  const padX = 12;
  const padY = 16;
  const series = values.length > 0 ? values : [0, 0];
  const max = Math.max(...series, 1);
  const step = series.length === 1 ? 0 : (width - padX * 2) / (series.length - 1);
  const coords = series.map((value, index) => {
    const x = padX + index * step;
    const y = height - padY - (value / max) * (height - padY * 2);
    return { x, y, value };
  });
  const line = coords.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
  const area = `${coords[0]!.x.toFixed(1)},${height - padY} ${line} ${coords[coords.length - 1]!.x.toFixed(1)},${height - padY}`;
  const midY = height - padY - (height - padY * 2) / 2;
  const quiet = values.every((value) => value === 0);

  return (
    <div className="ff-radar-trend" data-ff-radar-trend="">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Touches over the last 14 days">
        <line x1={padX} x2={width - padX} y1={height - padY} y2={height - padY} className="ff-radar-axis" />
        <line x1={padX} x2={width - padX} y1={midY} y2={midY} className="ff-radar-axis is-mid" />
        <polygon points={area} className="ff-radar-area" />
        <polyline points={line} className="ff-radar-line" />
        {coords.map((point, index) => (
          <circle key={index} cx={point.x} cy={point.y} r="3.2" className="ff-radar-point" />
        ))}
      </svg>
      <div className="ff-radar-trend-scale">
        <span>14 days ago</span>
        <span>{quiet ? "No logged touches" : "Today"}</span>
      </div>
    </div>
  );
}

/** KPI banner plus the charts that make Radar a two-second glance. */
export function RadarBoard({ cards }: { cards: RadarDeskCard[] }) {
  const glance = radarDesk(cards);
  const quiet =
    glance.medianSilence == null ? "—" : glance.medianSilence === 1 ? "1" : String(glance.medianSilence);

  return (
    <div className="ff-radar-board" data-ff-radar-board="">
      <section className="ff-radar-banner" data-ff-radar-banner="" aria-label="Book heat">
        <div className="ff-radar-banner-lead">
          <p>Book heat</p>
          <strong data-ff-radar-total="">{glance.total}</strong>
          <span>{glance.total === 1 ? "open deal" : "open deals"}</span>
        </div>
        <ul className="ff-radar-kpis" data-ff-radar-kpis="">
          {HEAT_STATES.map((heat) => (
            <li key={heat} className={cn("ff-radar-kpi", `ff-heat-${heat}`)} data-ff-radar-heat={heat}>
              <strong>{glance.counts[heat]}</strong>
              <span>{HEAT_LABELS[heat]}</span>
            </li>
          ))}
        </ul>
        <div className="ff-radar-kpi-side" data-ff-radar-median="">
          <strong>{quiet}</strong>
          <span>{glance.medianSilence === 1 ? "median day quiet" : "median days quiet"}</span>
        </div>
        <div className="ff-radar-kpi-side" data-ff-radar-touches="">
          <strong>{glance.touches}</strong>
          <span>{glance.touches === 1 ? "touch · 14 days" : "touches · 14 days"}</span>
        </div>
      </section>

      <div className="ff-radar-charts">
        <article className="ff-radar-chart" data-ff-radar-chart="heat">
          <header>
            <h2>What’s hot</h2>
            <p>Share of the open book</p>
          </header>
          <div className="ff-radar-chart-body ff-radar-heat-body">
            <BookDonut counts={glance.counts} total={glance.total} />
            <ul className="ff-radar-heat-legend">
              {HEAT_STATES.map((heat) => (
                <li key={heat} className={`ff-heat-${heat}`}>
                  <i aria-hidden />
                  <span>{HEAT_LABELS[heat]}</span>
                  <strong>{glance.counts[heat]}</strong>
                </li>
              ))}
            </ul>
          </div>
        </article>

        <article className="ff-radar-chart" data-ff-radar-chart="silence">
          <header>
            <h2>How quiet</h2>
            <p>Days since the last logged call, email, text, or meeting</p>
          </header>
          <div className="ff-radar-chart-body">
            <SilenceChart bands={glance.silence} />
          </div>
        </article>

        <article className="ff-radar-chart" data-ff-radar-chart="trend">
          <header>
            <h2>Touch trend</h2>
            <p>
              {glance.quoteSent > 0
                ? `${glance.quoteSent} ${glance.quoteSent === 1 ? "quote" : "quotes"} already sent`
                : "Logged touches across the open book"}
            </p>
          </header>
          <div className="ff-radar-chart-body">
            <TrendChart values={glance.trend} />
          </div>
        </article>
      </div>

      {glance.phases.length > 0 ? (
        <section className="ff-radar-phases" data-ff-radar-phase="" aria-label="Where deals sit">
          <p>Where they sit</p>
          <div className="ff-radar-phase-bar">
            {glance.phases.map((phase) => (
              <div key={phase.phase} style={{ flexGrow: phase.count }} data-ff-radar-phase-row={phase.phase}>
                <strong>{phase.count}</strong>
                <span>{phase.label}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
