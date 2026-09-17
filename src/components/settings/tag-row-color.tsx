"use client";

import { useState } from "react";
import { DEFAULT_TAG_PICKER_COLOR, tagChipStyle } from "@/lib/tags/tag-colors";

export function TagRowColor({
  name,
  savedColor,
  chipLabel,
  ariaLabel,
}: {
  name: string;
  savedColor?: string | null;
  chipLabel: string;
  ariaLabel: string;
}) {
  const [color, setColor] = useState(savedColor || DEFAULT_TAG_PICKER_COLOR);

  return (
    <span className="inline-flex flex-wrap items-center gap-2" data-ff-live-color={color}>
      <span
        className="min-w-28 rounded-sm px-1.5 py-0.5 text-sm font-medium text-navy"
        style={tagChipStyle(color)}
        data-ff-tag-color={savedColor ?? ""}
        data-ff-tag-color-live={color}
      >
        {chipLabel}
      </span>
      <input
        type="color"
        name={name}
        defaultValue={savedColor || DEFAULT_TAG_PICKER_COLOR}
        onChange={(event) => setColor(event.currentTarget.value)}
        className="h-8 w-8 cursor-pointer rounded border border-border bg-transparent p-0"
        aria-label={ariaLabel}
      />
    </span>
  );
}
