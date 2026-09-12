import { formatMoney } from "@/lib/domain";
import {
  formatDays,
  formatHitRatePct,
  type CarrierKpiSnapshot,
} from "@/lib/carriers/metrics";

function HitDonut({ bound, requested }: { bound: number; requested: number }) {
  const rate = requested > 0 ? bound / requested : 0;
  const r = 18;
  const circ = 2 * Math.PI * r;
  const filled = rate * circ;
  return (
    <svg viewBox="0 0 48 48" width={48} height={48} className="shrink-0" aria-hidden>
      <circle cx="24" cy="24" r={r} fill="none" stroke="#e2e8f0" strokeWidth="6" />
      <circle
        cx="24"
        cy="24"
        r={r}
        fill="none"
        stroke="#002868"
        strokeWidth="6"
        strokeDasharray={`${filled} ${circ - filled}`}
        strokeLinecap="round"
        transform="rotate(-90 24 24)"
      />
      <text x="24" y="26" textAnchor="middle" fontSize="9" fill="#002868" fontWeight="600">
        {requested > 0 ? `${Math.round(rate * 100)}%` : "—"}
      </text>
    </svg>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  const w = 88;
  const h = 28;
  const pts = values
    .map((v, i) => {
      const x = values.length <= 1 ? 0 : (i / (values.length - 1)) * w;
      const y = h - (v / max) * (h - 2) - 1;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} className="shrink-0" aria-hidden>
      <polyline fill="none" stroke="#002868" strokeWidth="1.5" points={pts} />
    </svg>
  );
}

export function CarrierKpiStrip({ kpi }: { kpi: CarrierKpiSnapshot }) {
  const trend =
    kpi.daysTrend === "up" ? "↑" : kpi.daysTrend === "down" ? "↓" : kpi.daysTrend === "flat" ? "→" : "";
  const trendColor =
    kpi.daysTrend === "down"
      ? "text-green-700"
      : kpi.daysTrend === "up"
        ? "text-[#BF0A30]"
        : "text-muted-foreground";

  return (
    <div
      className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-3"
      data-ff-carrier-kpi-strip=""
    >
      <div className="ff-card flex items-center gap-3 px-3 py-3">
        <HitDonut bound={kpi.quotesBound} requested={kpi.quotesRequested} />
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#002868]">
            Hit Rate
          </p>
          <p className="text-lg font-semibold tabular-nums text-[#002868]">
            {formatHitRatePct(kpi.hitRate)}
          </p>
          <p className="text-xs text-muted-foreground">
            {kpi.quotesBound} Bound / {kpi.quotesRequested} Quotes
          </p>
        </div>
      </div>

      <div className="ff-card px-3 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#002868]">
          Average Days To Bind
        </p>
        <p className="mt-1 flex items-baseline gap-2 text-lg font-semibold tabular-nums text-[#002868]">
          {formatDays(kpi.avgDaysToBind)}
          {trend ? <span className={`text-sm ${trendColor}`}>{trend}</span> : null}
        </p>
        <p className="text-xs text-muted-foreground">
          Vs Last Quarter {formatDays(kpi.avgDaysToBindPrevQuarter)}
        </p>
      </div>

      <div className="ff-card flex items-center justify-between gap-2 px-3 py-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#002868]">
            Commission Earned
          </p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-[#002868]">
            {kpi.commissionEarned > 0 ? formatMoney(kpi.commissionEarned) : "—"}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {kpi.commissionByLine.length
              ? kpi.commissionByLine
                  .slice(0, 3)
                  .map((row) => `${row.lob} ${formatMoney(row.amount)}`)
                  .join(" · ")
              : "Per Line When Booked"}
          </p>
        </div>
        <Sparkline values={kpi.commissionSpark} />
      </div>
    </div>
  );
}

export function CarrierScorecardSection({ kpi }: { kpi: CarrierKpiSnapshot }) {
  return (
    <div className="space-y-3 text-sm" data-ff-carrier-scorecard="">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-md border border-border/70 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#002868]">
            Hit Rate
          </p>
          <p className="text-base font-semibold text-[#002868]">{formatHitRatePct(kpi.hitRate)}</p>
          <p className="text-xs text-muted-foreground">
            {kpi.quotesBound}/{kpi.quotesRequested} Quotes Bound
          </p>
        </div>
        <div className="rounded-md border border-border/70 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#002868]">
            Avg Days To Bind
          </p>
          <p className="text-base font-semibold text-[#002868]">{formatDays(kpi.avgDaysToBind)}</p>
        </div>
        <div className="rounded-md border border-border/70 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#002868]">
            Commission Earned
          </p>
          <p className="text-base font-semibold text-[#002868]">
            {kpi.commissionEarned > 0 ? formatMoney(kpi.commissionEarned) : "—"}
          </p>
        </div>
      </div>
      {kpi.commissionByLine.length > 0 ? (
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-[#002868]">
              <th className="py-1">Line</th>
              <th className="py-1">Commission</th>
            </tr>
          </thead>
          <tbody>
            {kpi.commissionByLine.map((row) => (
              <tr key={row.lob} className="border-b border-border/50">
                <td className="py-1">{row.lob}</td>
                <td className="py-1 tabular-nums">{formatMoney(row.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-xs text-muted-foreground">No Per-Line Commission Yet.</p>
      )}
    </div>
  );
}
