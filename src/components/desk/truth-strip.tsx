import { cn } from "@/lib/utils";
import { HEALTH_MIX_META, type HealthPulseShare } from "@/lib/renewal/health";
import {
  HEAT_META,
  truthLine,
  waveformTicks,
  type HeatShare,
  type TruthSurface,
} from "@/lib/desk/truth-strip";

export function DeskTruthStrip({
  heat,
  health,
  flagged = 0,
  clients,
  label,
  surface,
}: {
  heat: HeatShare[];
  health?: HealthPulseShare[];
  flagged?: number;
  clients: number;
  label: string;
  surface: TruthSurface;
}) {
  const ticks = waveformTicks(heat);
  const line = truthLine({ heat, flagged, clients, surface });
  const total = heat.reduce((sum, row) => sum + row.count, 0);

  return (
    <section
      className="ff-truth-strip"
      data-ff-truth-strip={surface}
      aria-label={`${label}: ${line}`}
    >
      <div className="ff-truth-strip-wave" aria-hidden>
        {ticks.map((level, index) => (
          <i
            key={`${level}-${index}`}
            className={cn("ff-truth-tick", `ff-truth-tick-${level}`)}
            style={{ animationDelay: `${index * 28}ms` }}
          />
        ))}
      </div>
      <div className="ff-truth-strip-body">
        <div className="ff-truth-strip-copy">
          <p className="ff-truth-strip-kicker">{label}</p>
          <p className="ff-truth-strip-line">{line}</p>
        </div>
        <ul className="ff-truth-strip-legend">
          {heat.map((share) => (
            <li key={share.level} data-ff-truth-heat={share.level}>
              <span className={cn("ff-truth-swatch", `ff-urgency-tone-${HEAT_META[share.level].tone}`)} />
              <span>{HEAT_META[share.level].shortLabel}</span>
              <em>{share.pct}%</em>
            </li>
          ))}
        </ul>
        {health && total > 0 ? (
          <div className="ff-truth-health" data-ff-truth-health="">
            <span className="ff-truth-health-label">Health</span>
            <div className="ff-truth-health-bar" aria-hidden>
              {health.map((share) =>
                share.pct > 0 ? (
                  <span
                    key={share.level}
                    className={cn("ff-truth-health-seg", `ff-health-tone-${HEALTH_MIX_META[share.level].tone}`)}
                    style={{ width: `${share.pct}%` }}
                  />
                ) : null,
              )}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
