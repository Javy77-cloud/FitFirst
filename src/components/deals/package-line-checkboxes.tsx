"use client";

import { PC_PACKAGE_LINE_LABELS, PC_PACKAGE_LINES, type PcPackageLine } from "@/lib/deals/package-lines";
import { cn } from "@/lib/utils";

export function PackageLineCheckboxes({
  selected,
  onChange,
  name = "shopLines",
  disabled,
  idPrefix = "package-line",
}: {
  selected: readonly PcPackageLine[];
  onChange?: (next: PcPackageLine[]) => void;
  name?: string;
  disabled?: boolean;
  idPrefix?: string;
}) {
  const picked = new Set(selected);

  function toggle(line: PcPackageLine, checked: boolean) {
    if (!onChange) return;
    const next = PC_PACKAGE_LINES.filter((item) => (item === line ? checked : picked.has(item)));
    onChange(next.length ? next : ["home"]);
  }

  return (
    <fieldset className="space-y-1.5" data-ff-package-lines="">
      <legend className="text-xs font-medium text-navy">Package lines</legend>
      <p className="text-[11px] text-muted-foreground">
        Home, Auto, and Flood on one deal. Form stays per line.
      </p>
      <div className="flex flex-wrap gap-3">
        {PC_PACKAGE_LINES.map((line) => {
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
              {PC_PACKAGE_LINE_LABELS[line]}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
