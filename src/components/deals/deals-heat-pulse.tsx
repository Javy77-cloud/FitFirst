import { cn } from "@/lib/utils";
import {
  HEAT_LABELS,
  heatPulseShares,
  phaseMixShares,
  type HeatState,
  type VelocityPhase,
} from "@/lib/deals/velocity";

const RING: Record<HeatState, string> = {
  hot: "var(--ff-terracotta)",
  cooling: "var(--ff-urgency-amber)",
  near_cold: "var(--ff-urgency-navy)",
  cold: "var(--ff-urgency-gray)",
};

function ringArcs(shares: ReturnType<typeof heatPulseShares>) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return shares
    .filter((share) => share.pct > 0)
    .map((share) => {
      const length = (share.pct / 100) * circumference;
      const dash = `${length} ${circumference - length}`;
      const current = offset;
      offset += length;
      return { heat: share.heat, dash, offset: current, color: RING[share.heat] };
    });
}

export function DealsHeatPulse({
  heats,
  phases,
  view,
  rankLabel,
  coldRate,
  variant = "banner",
}: {
  heats: HeatState[];
  phases?: VelocityPhase[];
  view: "radar" | "stack";
  rankLabel: string | null;
  coldRate: number;
  variant?: "banner" | "aside";
}) {
  const shares = heatPulseShares(heats);
  const phasesMix = phaseMixShares(phases ?? []);
  const total = heats.length;
  const hot = shares.find((share) => share.heat === "hot")?.count ?? 0;
  const arcs = ringArcs(shares);
  const radius = 34;

  return (
    <section
      className={cn("ff-deals-pulse", variant === "aside" && "ff-deals-pulse-aside")}
      data-ff-deals-pulse=""
      data-ff-pulse-variant={variant}
      aria-label="Book heat"
    >
      <div className="ff-renewals-pulse-ring-wrap">
        <svg viewBox="0 0 88 88" className="ff-renewals-pulse-ring" aria-hidden>
          <circle
            cx="44"
            cy="44"
            r={radius}
            fill="none"
            stroke="color-mix(in srgb, var(--ff-border) 80%, white)"
            strokeWidth="10"
          />
          {arcs.map((arc) => (
            <circle
              key={arc.heat}
              cx="44"
              cy="44"
              r={radius}
              fill="none"
              stroke={arc.color}
              strokeWidth="10"
              strokeDasharray={arc.dash}
              strokeDashoffset={-arc.offset}
              transform="rotate(-90 44 44)"
            />
          ))}
        </svg>
        <div className="ff-renewals-pulse-center">
          <strong data-ff-pulse-total="">{total}</strong>
          <span>{total === 1 ? "deal" : "deals"}</span>
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-navy">
          {view === "radar" ? "Agency radar" : "Priority stack"}
        </p>
        <ul className="ff-deals-pulse-legend">
          {shares.map((share) => (
            <li key={share.heat} data-ff-pulse-heat={share.heat}>
              <span className={cn("ff-deals-pulse-swatch", `ff-heat-${share.heat}`)} aria-hidden />
              <span className="sr-only">{HEAT_LABELS[share.heat]}</span>
              <strong>{share.count}</strong>
            </li>
          ))}
        </ul>
        <div className="ff-renewals-pulse-bar" aria-hidden>
          {shares.map((share) =>
            share.pct > 0 ? (
              <span key={share.heat} className={`ff-heat-${share.heat}`} style={{ width: `${share.pct}%` }} />
            ) : null,
          )}
          {total === 0 ? <span className="ff-renewals-pulse-bar-empty" style={{ width: "100%" }} /> : null}
        </div>
        {variant === "aside" ? (
          <>
            <p className="ff-pulse-hot-count" data-ff-pulse-hot="">
              <strong>{hot}</strong> hot
            </p>
            <ul className="ff-phase-mix" data-ff-phase-mix="" aria-label="Phase mix">
              {phasesMix.map((row) => (
                <li key={row.phase} data-ff-phase-mix-row={row.phase}>
                  <span>{row.label}</span>
                  <strong>{row.count}</strong>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>
      {coldRate > 0 ? (
        <p className="ff-cold-chip" data-ff-deals-scorecards="">
          <i aria-hidden />
          <span className="sr-only">Cold rate</span>
          {coldRate}%
        </p>
      ) : null}
      {rankLabel ? (
        <p className="ff-private-rank" data-ff-private-rank="">
          Your velocity · {rankLabel}
        </p>
      ) : null}
    </section>
  );
}
