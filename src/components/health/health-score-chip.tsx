"use client";

import { useId, useState } from "react";
import { RENEWAL_RISK_LABEL } from "@/lib/renewal/urgency";
import type { HealthChipView } from "@/lib/health/model";
import { cn } from "@/lib/utils";

const KIND_LABEL = {
  policy: "Policy health",
  client: "Client health",
} as const;

function ringColor(band: HealthChipView["band"]): string {
  if (band === "high") return "var(--ff-terracotta)";
  if (band === "medium") return "var(--ff-urgency-amber)";
  return "var(--ff-urgency-gray)";
}

export function HealthFactorList({
  health,
  className,
}: {
  health: HealthChipView;
  className?: string;
}) {
  const label = KIND_LABEL[health.kind];
  return (
    <div className={cn("ff-health-factor-list", className)} data-ff-health-breakdown={health.kind}>
      <p className="ff-health-breakdown-head">
        {label}
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

export function HealthScoreChip({
  health,
  compact = false,
}: {
  health: HealthChipView;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const label = KIND_LABEL[health.kind];
  const radius = 11;
  const circumference = 2 * Math.PI * radius;
  const dash = (health.score / 100) * circumference;

  return (
    <div
      className={cn("ff-health-chip-wrap", compact && "ff-health-chip-wrap-compact")}
      data-ff-health-chip={health.kind}
      data-ff-health-band={health.band}
    >
      <button
        type="button"
        className={cn("ff-health-chip", `ff-health-band-${health.band}`, compact && "ff-health-chip-compact")}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        title={`${label} · ${RENEWAL_RISK_LABEL[health.band]} risk`}
      >
        <svg viewBox="0 0 32 32" className="ff-health-chip-ring" aria-hidden>
          <circle cx="16" cy="16" r={radius} fill="none" stroke="color-mix(in srgb, var(--ff-border) 80%, white)" strokeWidth="4" />
          <circle
            cx="16"
            cy="16"
            r={radius}
            fill="none"
            stroke={ringColor(health.band)}
            strokeWidth="4"
            strokeDasharray={`${dash} ${circumference - dash}`}
            strokeLinecap="round"
            transform="rotate(-90 16 16)"
          />
        </svg>
        <span className="sr-only">
          {label}, {RENEWAL_RISK_LABEL[health.band]} risk
        </span>
      </button>
      {open ? (
        <div id={panelId} className="ff-health-breakdown">
          <HealthFactorList health={health} />
        </div>
      ) : null}
    </div>
  );
}
