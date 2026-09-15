"use client";

import type { PackageFamily } from "@/lib/deals/package-lines";
import { cn } from "@/lib/utils";

export function PackageFamilyToggle({
  family,
  onChange,
  disabled,
}: {
  family: PackageFamily;
  onChange: (next: PackageFamily) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset className="space-y-1.5" data-ff-package-family-toggle="">
      <legend className="text-xs font-medium text-navy">Package</legend>
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["personal", "Personal"],
            ["commercial", "Commercial"],
          ] as const
        ).map(([id, label]) => {
          const selected = family === id;
          return (
            <label
              key={id}
              className={cn(
                "inline-flex cursor-pointer items-center rounded-md border px-2.5 py-1 text-sm",
                selected
                  ? "border-primary bg-fit-check-bg/40 font-medium text-navy"
                  : "border-border bg-card text-navy",
                disabled && "cursor-not-allowed opacity-60",
              )}
            >
              <input
                type="radio"
                name="packageFamily"
                value={id}
                checked={selected}
                disabled={disabled}
                className="sr-only"
                data-ff-package-family-option={id}
                onChange={() => onChange(id)}
              />
              {label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
