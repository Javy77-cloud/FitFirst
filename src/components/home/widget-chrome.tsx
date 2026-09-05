"use client";

import type { PointerEvent, ReactNode } from "react";
import { GripVertical } from "lucide-react";
import { spanClass, type WidgetSpan } from "@/lib/home/layout";
import { cn } from "@/lib/utils";

export function WidgetChrome({
  tileId,
  span,
  onDragHandlePointerDown,
  onResizeHandlePointerDown,
  dragging,
  over,
  resizing,
  resizeEnabled,
  children,
}: {
  tileId: string;
  span: WidgetSpan;
  onDragHandlePointerDown: (event: PointerEvent<HTMLButtonElement>) => void;
  onResizeHandlePointerDown?: (event: PointerEvent<HTMLButtonElement>) => void;
  dragging?: boolean;
  over?: boolean;
  resizing?: boolean;
  resizeEnabled?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      data-home-tile={tileId}
      className={cn(
        "ff-card group/widget relative min-h-0 overflow-visible",
        spanClass(span),
        dragging && "opacity-40",
        resizing && "ring-2 ring-primary/40",
        over && "ring-2 ring-primary/50 ring-offset-2 ring-offset-background",
      )}
    >
      {over ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] border-2 border-dashed border-primary bg-primary/8"
        />
      ) : null}
      <button
        type="button"
        aria-label="Drag to reorder"
        title="Drag to reorder"
        onPointerDown={onDragHandlePointerDown}
        className="absolute top-1.5 left-1.5 z-20 inline-flex size-7 cursor-grab touch-none items-center justify-center rounded-sm text-muted-foreground opacity-55 hover:bg-muted hover:text-navy hover:opacity-100 active:cursor-grabbing group-hover/widget:opacity-100"
      >
        <GripVertical className="size-3.5" />
      </button>
      {resizeEnabled ? (
        <button
          type="button"
          data-home-resize={tileId}
          aria-label="Drag corner to resize"
          title="Drag corner to resize"
          onPointerDown={onResizeHandlePointerDown}
          className="absolute right-1 bottom-1 z-20 inline-flex size-6 cursor-nwse-resize touch-none items-center justify-center rounded-sm text-muted-foreground opacity-70 hover:bg-muted hover:text-navy hover:opacity-100"
        >
          <span aria-hidden className="block size-2.5 border-r-2 border-b-2 border-current" />
        </button>
      ) : null}
      <div className="min-h-0 h-full overflow-hidden pt-7">{children}</div>
    </section>
  );
}
