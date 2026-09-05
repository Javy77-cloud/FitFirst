"use client";

import type { CSSProperties, PointerEvent, ReactNode } from "react";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

export function WidgetChrome({
  tileId,
  gridClass,
  style,
  onDragHandlePointerDown,
  onResizeHandlePointerDown,
  resizeEnabled,
  dragging,
  resizing,
  over,
  children,
}: {
  tileId: string;
  gridClass: string;
  style?: CSSProperties;
  onDragHandlePointerDown: (event: PointerEvent<HTMLButtonElement>) => void;
  onResizeHandlePointerDown?: (event: PointerEvent<HTMLButtonElement>) => void;
  resizeEnabled?: boolean;
  dragging?: boolean;
  resizing?: boolean;
  over?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      data-home-tile={tileId}
      className={cn(
        "ff-card group/widget relative min-h-0 overflow-visible",
        gridClass,
        dragging && "opacity-40",
        resizing && "z-20 ring-2 ring-primary/40",
        over && "ring-2 ring-primary/50 ring-offset-2 ring-offset-background",
      )}
      style={style}
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
          aria-label="Resize tile"
          title="Pull the corner to resize"
          onPointerDown={onResizeHandlePointerDown}
          className="absolute right-0.5 bottom-0.5 z-20 inline-flex size-7 cursor-se-resize touch-none items-center justify-center rounded-sm text-muted-foreground opacity-70 hover:bg-muted hover:text-navy hover:opacity-100 group-hover/widget:opacity-100"
        >
          <span aria-hidden className="relative block size-3.5">
            <span className="absolute right-0 bottom-0 h-2.5 w-2.5 rounded-br-sm border-r-2 border-b-2 border-current" />
            <span className="absolute right-px bottom-px h-1.5 w-1.5 rounded-br-sm border-r-2 border-b-2 border-current/70" />
          </span>
        </button>
      ) : null}
      <div className="min-h-0 h-full overflow-hidden pt-7">{children}</div>
    </section>
  );
}
