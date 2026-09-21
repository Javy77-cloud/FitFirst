import type { VelocityClock, VelocityPhase } from "@/lib/deals/velocity";
import { CLOCK_RAIL_PHASES, formatClockDays, VELOCITY_PHASE_LABELS } from "@/lib/deals/velocity";
import { cn } from "@/lib/utils";

export function VelocityClockRail({
  clocks,
  phase,
  compact = false,
}: {
  clocks: Record<VelocityPhase, VelocityClock>;
  phase: VelocityPhase;
  compact?: boolean;
}) {
  const active = clocks[phase];
  return (
    <div
      className={cn("ff-clock-rail", compact && "is-compact")}
      data-ff-clock-rail=""
      data-ff-clock-phase={phase}
      title={`${VELOCITY_PHASE_LABELS[phase]} · ${formatClockDays(active.days)}`}
      aria-label={`Phase clocks: ${CLOCK_RAIL_PHASES.map((id) => `${VELOCITY_PHASE_LABELS[id]} ${Math.round(clocks[id].days)}`).join(", ")}`}
    >
      {CLOCK_RAIL_PHASES.map((id) => {
        const clock = clocks[id];
        const days = Math.round(clock.days);
        return (
          <span
            key={id}
            className={cn(
              "ff-clock-rail-tick",
              clock.complete && id !== "post_quote_gap" && "is-done",
              phase === id && "is-now",
            )}
            data-ff-clock={id}
            data-complete={clock.complete ? "true" : "false"}
            title={`${VELOCITY_PHASE_LABELS[id]} · ${formatClockDays(clock.days)}`}
          >
            <strong className="ff-clock-rail-days">{days}</strong>
            <i aria-hidden />
          </span>
        );
      })}
      <span className="ff-clock-rail-now">{formatClockDays(active.days)}</span>
    </div>
  );
}
