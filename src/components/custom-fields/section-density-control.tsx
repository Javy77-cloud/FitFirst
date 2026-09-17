"use client";

import { SECTION_DENSITIES, sectionDensityOf, type SectionDensity } from "@/lib/custom-fields/types";
import { cn } from "@/lib/utils";

export function SectionDensityControl({
  sectionId,
  density,
  onChange,
}: {
  sectionId: string;
  density?: unknown;
  onChange: (density: SectionDensity) => void;
}) {
  const current = sectionDensityOf({ density });
  return (
    <div
      className="flex items-center gap-1"
      data-ff-section-density-control={sectionId}
      role="group"
      aria-label="Section density"
    >
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Density</span>
      {SECTION_DENSITIES.map((choice) => (
        <button
          key={choice}
          type="button"
          aria-pressed={current === choice}
          data-ff-density-choice={choice}
          className={cn(
            "inline-flex size-6 items-center justify-center rounded text-[11px] font-semibold",
            current === choice ? "bg-navy text-white" : "border border-border bg-background text-navy hover:bg-muted",
          )}
          onClick={() => onChange(choice)}
        >
          {choice}
        </button>
      ))}
    </div>
  );
}
