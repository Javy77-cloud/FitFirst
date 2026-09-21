import { cn } from "@/lib/utils";
import {
  RENEWAL_URGENCY_META,
  urgencyPulseShares,
  type RenewalUrgencyBand,
} from "@/lib/renewal/urgency";

const RING_COLORS: Record<RenewalUrgencyBand, string> = {
  under30: "var(--ff-heat-hot)",
  "30to60": "var(--ff-heat-cooling)",
  "60to90": "var(--ff-heat-near-cold)",
  "90plus": "var(--ff-heat-cold)",
};

function ringArcs(shares: ReturnType<typeof urgencyPulseShares>) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return shares
    .filter((share) => share.pct > 0)
    .map((share) => {
      const length = (share.pct / 100) * circumference;
      const dash = `${length} ${circumference - length}`;
      const currentOffset = offset;
      offset += length;
      return {
        band: share.band,
        dash,
        offset: currentOffset,
        color: RING_COLORS[share.band],
      };
    });
}

export function RenewalsPulse({
  daysUntil,
}: {
  daysUntil: number[];
}) {
  const shares = urgencyPulseShares(daysUntil);
  const total = daysUntil.length;
  const arcs = ringArcs(shares);
  const radius = 34;
  const summary = shares
    .map((share) => `${RENEWAL_URGENCY_META[share.band].shortLabel} ${share.pct}%`)
    .join(", ");

  return (
    <section
      className="ff-renewals-pulse"
      data-ff-renewals-pulse=""
      aria-label={total === 0 ? "No renewals on this book" : `Book pulse: ${summary}`}
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
              key={arc.band}
              cx="44"
              cy="44"
              r={radius}
              fill="none"
              stroke={arc.color}
              strokeWidth="10"
              strokeDasharray={arc.dash}
              strokeDashoffset={-arc.offset}
              strokeLinecap="butt"
              transform="rotate(-90 44 44)"
            />
          ))}
        </svg>
        <div className="ff-renewals-pulse-center">
          <strong>{total}</strong>
          <span>{total === 1 ? "renewal" : "renewals"}</span>
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-navy">Book pulse</p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {total === 0
            ? "No renewals on this book yet."
            : "Share of this book in each urgency band."}
        </p>
        <ul className="ff-renewals-pulse-legend" data-ff-pulse-depth="">
          {shares.map((share) => (
            <li key={share.band} data-ff-pulse-band={share.band}>
              <span
                className={cn("ff-renewals-pulse-swatch", `ff-urgency-tone-${RENEWAL_URGENCY_META[share.band].tone}`)}
                aria-hidden
              />
              <span className="ff-renewals-pulse-label">{RENEWAL_URGENCY_META[share.band].shortLabel}</span>
              <span className="ff-renewals-pulse-pct">{share.pct}%</span>
              <span className="ff-renewals-pulse-count">
                {share.count}
              </span>
            </li>
          ))}
        </ul>
        <div className="ff-renewals-pulse-bar" aria-hidden>
          {shares.map((share) =>
            share.pct > 0 ? (
              <span
                key={share.band}
                className={`ff-urgency-tone-${RENEWAL_URGENCY_META[share.band].tone}`}
                style={{ width: `${share.pct}%` }}
              />
            ) : null,
          )}
          {total === 0 ? <span className="ff-renewals-pulse-bar-empty" style={{ width: "100%" }} /> : null}
        </div>
      </div>
    </section>
  );
}
