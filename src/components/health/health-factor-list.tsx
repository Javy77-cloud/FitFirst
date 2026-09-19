import { RENEWAL_RISK_LABEL } from "@/lib/renewal/urgency";
import type { HealthChipView } from "@/lib/health/model";
import { cn } from "@/lib/utils";

export const HEALTH_KIND_LABEL = {
  policy: "Policy health",
  client: "Client health",
} as const;

export function HealthFactorList({
  health,
  className,
}: {
  health: HealthChipView;
  className?: string;
}) {
  const label = HEALTH_KIND_LABEL[health.kind];
  return (
    <div className={cn("ff-health-factor-list", className)} data-ff-health-breakdown={health.kind}>
      <p className="ff-health-breakdown-head">
        {label} · {RENEWAL_RISK_LABEL[health.band]}
        {health.flags.includes("Two ratings under 3") ? " · flagged under 3" : ""}
      </p>
      <ul>
        {health.factors.map((factor) => (
          <li key={factor.id} data-ff-health-factor={factor.id} data-ff-health-factor-source={factor.source}>
            <div className="ff-health-factor-row">
              <span>{factor.label}</span>
              {factor.source === "stub" ? <span className="ff-health-factor-stub">stub</span> : null}
            </div>
            <span className="ff-health-factor-bar" aria-hidden>
              <span
                className={cn(
                  "ff-health-factor-fill",
                  factor.score <= 57
                    ? "ff-health-band-high"
                    : factor.score <= 74
                      ? "ff-health-band-medium"
                      : "ff-health-band-low",
                )}
                style={{ width: `${factor.score}%` }}
              />
            </span>
            <p>{factor.why}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
