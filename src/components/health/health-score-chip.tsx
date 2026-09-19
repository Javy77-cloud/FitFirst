"use client";

import { useId, useRef, useState } from "react";
import { HealthFactorList, HEALTH_KIND_LABEL } from "@/components/health/health-factor-list";
import { HealthWhyPanel } from "@/components/health/health-why-popover";
import { RENEWAL_RISK_LABEL } from "@/lib/renewal/urgency";
import type { HealthChipView } from "@/lib/health/model";
import { cn } from "@/lib/utils";

export { HealthFactorList } from "@/components/health/health-factor-list";

function ringColor(band: HealthChipView["band"]): string {
  if (band === "high") return "var(--ff-terracotta)";
  if (band === "medium") return "var(--ff-urgency-amber)";
  return "var(--ff-urgency-gray)";
}

export function HealthScoreChip({
  health,
  compact = false,
}: {
  health: HealthChipView;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const label = HEALTH_KIND_LABEL[health.kind];
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
        ref={triggerRef}
        type="button"
        className={cn("ff-health-chip", `ff-health-band-${health.band}`, compact && "ff-health-chip-compact")}
        aria-expanded={open}
        aria-controls={panelId}
        data-ff-no-title-tip=""
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
      <HealthWhyPanel
        id={panelId}
        open={open}
        onOpenChange={setOpen}
        anchorRef={triggerRef}
        align="start"
      >
        <HealthFactorList health={health} />
      </HealthWhyPanel>
    </div>
  );
}
