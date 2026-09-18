"use client";

import { useState, type ReactNode } from "react";
import { StatusColorSelect, StatusColorSwatch } from "@/components/desk/status-color-select";
import { liveColorKey, liveColorRowStyle } from "@/lib/desk/status-colors";
import { cn } from "@/lib/utils";

/**
 * One list value: uncontrolled label inputs stay instant; the Color control
 * opens the shared palette and paints the swatch + row wash before Save.
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
      {hidePicker ? (
        <StatusColorSwatch color={color} showEmpty />
      ) : (
        <StatusColorSelect
          form={form}
          name={name}
          defaultValue={defaultValue}
          aria-label={colorAriaLabel}
          onColorChange={setColor}
        />
      )}
      {children}
    </div>
  );
}

/** Shared Color control for add-value footers that already have their own row. */
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
    <span className={cn("inline-flex items-center", className)} data-ff-live-color={token}>
      <StatusColorSelect
        form={form}
        name={name}
        defaultValue={defaultValue}
        aria-label={ariaLabel}
        disabled={disabled}
        onColorChange={setColor}
      />
    </span>
  );
}
