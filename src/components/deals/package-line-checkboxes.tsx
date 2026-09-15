"use client";

import {
  COMMERCIAL_PACKAGE_LINE_LABELS,
  COMMERCIAL_PACKAGE_LINES,
  PC_PACKAGE_LINE_LABELS,
  PC_PACKAGE_LINES,
  type PackageFamily,
  type PackageLine,
} from "@/lib/deals/package-lines";
import { cn } from "@/lib/utils";

const FAMILY_LINES = {
  personal: PC_PACKAGE_LINES,
  commercial: COMMERCIAL_PACKAGE_LINES,
} as const;

const FAMILY_LABELS: Record<PackageFamily, Record<string, string>> = {
  personal: PC_PACKAGE_LINE_LABELS,
  commercial: COMMERCIAL_PACKAGE_LINE_LABELS,
};

const FAMILY_FALLBACK: Record<PackageFamily, PackageLine[]> = {
  personal: ["home"],
  commercial: ["general_liability"],
};

export function PackageLineCheckboxes({
  selected,
  onChange,
  name = "shopLines",
  disabled,
  idPrefix = "package-line",
  family = "personal",
}: {
  selected: readonly PackageLine[];
  onChange?: (next: PackageLine[]) => void;
  name?: string;
  disabled?: boolean;
  idPrefix?: string;
  family?: PackageFamily;
}) {
  const catalog = FAMILY_LINES[family];
  const labels = FAMILY_LABELS[family];
  const fallback = FAMILY_FALLBACK[family];
  const picked = new Set(selected);

  function toggle(line: PackageLine, checked: boolean) {
    if (!onChange) return;
    const next = catalog.filter((item) => (item === line ? checked : picked.has(item)));
    onChange(next.length ? [...next] : [...fallback]);
  }

  return (
    <fieldset className="space-y-1.5" data-ff-package-lines="" data-ff-package-family={family}>
      <legend className="text-xs font-medium text-navy">
        {family === "commercial" ? "Commercial package lines" : "Package lines"}
      </legend>
      <p className="text-[11px] text-muted-foreground">
        {family === "commercial"
          ? "GL, Workers' Comp, and BOP on one deal. Form stays per line."
          : "Home, Auto, and Flood on one deal. Form stays per line."}
      </p>
      <div className="flex flex-wrap gap-3">
        {catalog.map((line) => {
          const id = `${idPrefix}-${line}`;
          const checked = picked.has(line);
          return (
            <label
              key={line}
              htmlFor={id}
              className={cn(
                "inline-flex items-center gap-1.5 text-sm text-navy",
                disabled && "opacity-60",
              )}
            >
              <input
                id={id}
                type="checkbox"
                name={name}
                value={line}
                checked={checked}
                disabled={disabled}
                className="h-3.5 w-3.5 accent-[#002868]"
                data-ff-package-line={line}
                onChange={(event) => toggle(line, event.target.checked)}
              />
              {labels[line]}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
