"use client";

import type { ReactNode } from "react";
import { GripVertical } from "lucide-react";
import { WIDGET_SPANS, spanClass, type WidgetSpan } from "@/lib/home/layout";
import { cn } from "@/lib/utils";

export function WidgetChrome({
  span,
  onSpan,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  dragging,
  over,
  children,
}: {
  span: WidgetSpan;
  onSpan: (span: WidgetSpan) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOver: () => void;
  onDrop: () => void;
  dragging?: boolean;
  over?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      onDragOver={(event) => {
        event.preventDefault();
        onDragOver();
      }}
      onDrop={(event) => {
        event.preventDefault();
        onDrop();
      }}
      className={cn(
        "ff-card group/widget relative min-h-0 overflow-hidden",
        spanClass(span),
        dragging && "opacity-60",
        over && "ring-2 ring-primary/40",
      )}
    >
      <div className="absolute top-1.5 right-1.5 z-10 opacity-55 transition-opacity group-hover/widget:opacity-100 group-focus-within/widget:opacity-100">
        <select
          aria-label="Widget size"
          title="Widget size"
          value={span}
          onMouseDown={(event) => event.stopPropagation()}
          onChange={(event) => onSpan(event.target.value as WidgetSpan)}
          className="h-7 rounded-sm border border-border bg-card/95 px-1 text-caption font-medium text-navy"
        >
          {WIDGET_SPANS.map((value) => (
            <option key={value} value={value}>
              {value.replace("x", "×")}
            </option>
          ))}
        </select>
      </div>
      <div
        role="button"
        tabIndex={0}
        draggable
        onDragStart={(event) => {
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("text/plain", "widget");
          onDragStart();
        }}
        onDragEnd={onDragEnd}
        aria-label="Drag to reorder"
        title="Drag to reorder"
        className="absolute top-1.5 left-1.5 z-10 inline-flex size-6 cursor-grab items-center justify-center rounded-sm text-muted-foreground opacity-55 hover:bg-muted hover:text-navy hover:opacity-100 active:cursor-grabbing group-hover/widget:opacity-100"
      >
        <GripVertical className="size-3.5" />
      </div>
      <div className="min-h-0 h-full pt-7">{children}</div>
    </section>
  );
}
