"use client";

import { DEFAULT_SECTION_DENSITY, SECTION_DENSITIES, type SectionDensity } from "@/lib/custom-fields/types";
import { cn } from "@/lib/utils";

export function SectionDensityControl<T extends number = SectionDensity>({
  sectionId,
  density,
  onChange,
  choices = SECTION_DENSITIES as readonly T[],
  tone = "default",
  label = "Density",
}: {
  sectionId: string;
  density?: unknown;
  onChange: (density: T) => void;
  choices?: readonly T[];
  tone?: "default" | "onDark";
  /** Visible control name. Risk Profile uses "Columns" so 1–5 matches the grid. */
  label?: string;
}) {
  const numeric = typeof density === "number" ? density : Number(density);
  const fallback = (
    choices.includes(DEFAULT_SECTION_DENSITY as T) ? DEFAULT_SECTION_DENSITY : choices[0]
  ) as T;
  const current = choices.includes(numeric as T) ? (numeric as T) : fallback;
  const onDark = tone === "onDark";
  return (
    <div
      className="flex items-center gap-1"
      data-ff-section-density-control={sectionId}
      role="group"
      aria-label={`${label} — fields per row`}
    >
      <span
        className={cn(
          "text-[10px] font-semibold uppercase tracking-wide",
          onDark ? "text-white/70" : "text-muted-foreground",
        )}
      >
        {label}
      </span>
      {choices.map((choice) => (
        <button
          key={choice}
          type="button"
          aria-pressed={current === choice}
          data-ff-density-choice={choice}
          className={cn(
            "inline-flex size-6 items-center justify-center rounded text-[11px] font-semibold",
            current === choice
              ? onDark
                ? "bg-white text-navy"
                : "bg-navy text-white"
              : onDark
                ? "border border-white/40 bg-transparent text-white hover:bg-white/15"
                : "border border-border bg-background text-navy hover:bg-muted",
          )}
          onClick={() => onChange(choice)}
        >
          {choice}
        </button>
      ))}
    </div>
  );
}
