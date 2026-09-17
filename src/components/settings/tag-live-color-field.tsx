"use client";

import { useState } from "react";
import { DEFAULT_TAG_PICKER_COLOR, tagChipStyle } from "@/lib/tags/tag-colors";

export function TagLiveColorField({
  name = "color",
  defaultValue,
  ariaLabel,
  chipLabel,
}: {
  name?: string;
  defaultValue?: string | null;
  ariaLabel: string;
  chipLabel?: string;
}) {
  const [color, setColor] = useState(defaultValue || DEFAULT_TAG_PICKER_COLOR);

  return (
    <span className="inline-flex items-center gap-2" data-ff-live-color={color}>
      {chipLabel ? (
        <span
          className="min-w-20 rounded-sm px-1.5 py-0.5 text-sm font-medium text-navy"
          style={tagChipStyle(color)}
          data-ff-tag-color-live={color}
        >
          {chipLabel}
        </span>
      ) : (
        <span
          className="inline-block size-6 rounded-sm border border-border"
          style={{ backgroundColor: color }}
          data-ff-tag-color-live={color}
          aria-hidden
        />
      )}
      <input
        type="color"
        name={name}
        defaultValue={defaultValue || DEFAULT_TAG_PICKER_COLOR}
        onChange={(event) => setColor(event.currentTarget.value)}
        className="h-8 w-8 cursor-pointer rounded border border-border bg-transparent p-0"
        aria-label={ariaLabel}
        data-ff-tag-color-picker=""
      />
    </span>
  );
}
