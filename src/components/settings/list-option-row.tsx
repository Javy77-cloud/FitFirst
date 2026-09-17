"use client";

import { useState, type ReactNode } from "react";
import { StatusColorSelect, StatusColorSwatch } from "@/components/desk/status-color-select";
import { liveColorKey, liveColorRowStyle, statusColorClass } from "@/lib/desk/status-colors";
import { cn } from "@/lib/utils";

/**
 * One list value: uncontrolled label inputs stay instant; only color is local
 * so the swatch and row wash update the moment a palette key is picked.
 */
export function ListOptionRow({
  defaultValue = null,
  name = "color",
  form,
  colorAriaLabel = "Color",
  children,
  className,
  hidePicker = false,
}: {
  defaultValue?: string | null;
  name?: string;
  form?: string;
  colorAriaLabel?: string;
  children: ReactNode;
  className?: string;
  hidePicker?: boolean;
}) {
  const [color, setColor] = useState<string | null>(() => {
    const next = liveColorKey(defaultValue);
    return next === "none" ? null : next;
  });
  const token = liveColorKey(color);

  return (
    <div
      className={cn("ff-list-row", className)}
      style={liveColorRowStyle(color)}
      data-ff-live-color-row={token}
    >
      <StatusColorSwatch color={color} showEmpty />
      {children}
      {hidePicker ? null : (
        <StatusColorSelect
          form={form}
          name={name}
          defaultValue={defaultValue}
          aria-label={colorAriaLabel}
          onColorChange={setColor}
          className={cn(token !== "none" && statusColorClass(token))}
        />
      )}
    </div>
  );
}

/** Swatch + select only — for add-value footers that already have their own row. */
export function LiveColorField({
  defaultValue = null,
  name = "color",
  form,
  className,
  disabled,
  "aria-label": ariaLabel = "Color",
}: {
  defaultValue?: string | null;
  name?: string;
  form?: string;
  className?: string;
  disabled?: boolean;
  "aria-label"?: string;
}) {
  const [color, setColor] = useState<string | null>(() => {
    const next = liveColorKey(defaultValue);
    return next === "none" ? null : next;
  });
  const token = liveColorKey(color);

  return (
    <span className={cn("inline-flex items-center gap-2", className)} data-ff-live-color={token}>
      <StatusColorSwatch color={color} showEmpty />
      <StatusColorSelect
        form={form}
        name={name}
        defaultValue={defaultValue}
        aria-label={ariaLabel}
        disabled={disabled}
        onColorChange={setColor}
        className={cn(token !== "none" && statusColorClass(token))}
      />
    </span>
  );
}
