"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { HomeWidgetId } from "@/lib/home/layout";
import { LAYOUT_WIDGET_LABEL, nearestSpan, tileGridClass } from "@/lib/home/layout";
import { WidgetChrome } from "@/components/home/widget-chrome";
import { useHomeLayout } from "@/components/home/use-home-layout";
import { cn } from "@/lib/utils";

type Ghost = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
};

function inflate(rect: DOMRect, pad: number) {
  return {
    left: rect.left - pad,
    right: rect.right + pad,
    top: rect.top - pad,
    bottom: rect.bottom + pad,
    width: rect.width + pad * 2,
    height: rect.height + pad * 2,
  };
}

function contains(box: { left: number; right: number; top: number; bottom: number }, x: number, y: number) {
  return x >= box.left && x <= box.right && y >= box.top && y <= box.bottom;
}

function pickDropTarget(
  clientX: number,
  clientY: number,
  tiles: HTMLElement[],
  draggingId: string,
): string | null {
  let hit: { id: string; area: number } | null = null;
  let nearest: { id: string; dist: number } | null = null;

  for (const el of tiles) {
    const id = el.dataset.homeTile;
    if (!id || id === draggingId) continue;
    const raw = el.getBoundingClientRect();
    const box = inflate(raw, 20);
    const cx = raw.left + raw.width / 2;
    const cy = raw.top + raw.height / 2;
    const dist = (clientX - cx) ** 2 + (clientY - cy) ** 2;
    if (!nearest || dist < nearest.dist) nearest = { id, dist };
    if (contains(box, clientX, clientY)) {
      const area = box.width * box.height;
      if (!hit || area < hit.area) hit = { id, area };
    }
  }
  return hit?.id ?? nearest?.id ?? null;
}

function columnCount(width: number): number {
  return width >= 1280 ? 4 : 2;
}

function columnWidth(board: HTMLElement): { cols: number; colWidth: number } {
  const cols = columnCount(board.clientWidth);
  const styles = window.getComputedStyle(board);
  const gap = Number.parseFloat(styles.columnGap || styles.gap || "12") || 12;
  return { cols, colWidth: (board.clientWidth - gap * (cols - 1)) / cols };
}

export function HomeBoard({
  widgets,
}: {
  widgets: Partial<Record<HomeWidgetId, ReactNode>>;
}) {
  const { layout, move, previewSize, commit, resizeTiles } = useHomeLayout();
  const boardRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [resizing, setResizing] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [ghost, setGhost] = useState<Ghost | null>(null);
  const dragRef = useRef<{
    id: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const resizeRef = useRef<{
    id: HomeWidgetId;
    startX: number;
    startY: number;
    startW: number;
    startH: number;
    colWidth: number;
    maxCols: number;
  } | null>(null);

  const endDrag = useCallback(
    (dropId?: string | null) => {
      const current = dragRef.current;
      if (current && dropId && dropId !== current.id) {
        move(current.id, dropId);
      }
      dragRef.current = null;
      setDragging(null);
      setOver(null);
      setGhost(null);
    },
    [move],
  );

  useEffect(() => {
    if (!dragging) return;

    const onMove = (event: PointerEvent) => {
      const session = dragRef.current;
      if (!session) return;
      setGhost((prev) =>
        prev
          ? { ...prev, x: event.clientX - session.offsetX, y: event.clientY - session.offsetY }
          : prev,
      );
      const root = boardRef.current;
      if (!root) return;
      const tiles = Array.from(root.querySelectorAll<HTMLElement>("[data-home-tile]"));
      setOver(pickDropTarget(event.clientX, event.clientY, tiles, session.id));
    };

    const onUp = (event: PointerEvent) => {
      const session = dragRef.current;
      const root = boardRef.current;
      const tiles = root ? Array.from(root.querySelectorAll<HTMLElement>("[data-home-tile]")) : [];
      const dropId = session ? pickDropTarget(event.clientX, event.clientY, tiles, session.id) : null;
      endDrag(dropId);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [dragging, endDrag]);

  useEffect(() => {
    if (!resizing) return;

    const onMove = (event: PointerEvent) => {
      const session = resizeRef.current;
      if (!session) return;
      const width = session.startW + (event.clientX - session.startX);
      const height = session.startH + (event.clientY - session.startY);
      const cols = Math.min(session.maxCols, Math.max(1, Math.round(width / session.colWidth)));
      previewSize(session.id, { cols, heightPx: height, span: nearestSpan(cols, height) });
    };

    const onUp = () => {
      resizeRef.current = null;
      setResizing(null);
      commit();
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [commit, previewSize, resizing]);

  return (
    <>
      <div
        ref={boardRef}
        className="grid auto-rows-min grid-cols-2 items-start gap-3 xl:grid-cols-4"
      >
        {layout.map((item) => {
          const body = widgets[item.id];
          if (!body) return null;
          return (
            <WidgetChrome
              key={item.id}
              tileId={item.id}
              gridClass={tileGridClass(item)}
              style={item.heightPx ? { height: item.heightPx, minHeight: item.heightPx } : undefined}
              resizeEnabled={resizeTiles}
              dragging={dragging === item.id}
              resizing={resizing === item.id}
              over={over === item.id && dragging !== item.id}
              onDragHandlePointerDown={(event) => {
                if (event.button !== 0 || resizeRef.current) return;
                event.preventDefault();
                const tile = (event.currentTarget as HTMLElement).closest<HTMLElement>("[data-home-tile]");
                if (!tile) return;
                const rect = tile.getBoundingClientRect();
                dragRef.current = {
                  id: item.id,
                  offsetX: event.clientX - rect.left,
                  offsetY: event.clientY - rect.top,
                };
                setDragging(item.id);
                setOver(null);
                setGhost({
                  id: item.id,
                  x: rect.left,
                  y: rect.top,
                  w: rect.width,
                  h: Math.min(rect.height, 220),
                  label: LAYOUT_WIDGET_LABEL[item.id],
                });
              }}
              onResizeHandlePointerDown={(event) => {
                if (event.button !== 0) return;
                event.preventDefault();
                event.stopPropagation();
                const tile = (event.currentTarget as HTMLElement).closest<HTMLElement>("[data-home-tile]");
                const board = boardRef.current;
                if (!tile || !board) return;
                const rect = tile.getBoundingClientRect();
                const measure = columnWidth(board);
                resizeRef.current = {
                  id: item.id,
                  startX: event.clientX,
                  startY: event.clientY,
                  startW: rect.width,
                  startH: rect.height,
                  colWidth: measure.colWidth,
                  maxCols: measure.cols,
                };
                setResizing(item.id);
              }}
            >
              {body}
            </WidgetChrome>
          );
        })}
      </div>
      {ghost && typeof document !== "undefined"
        ? createPortal(
            <div
              aria-hidden
              className={cn(
                "pointer-events-none fixed z-[80] overflow-hidden rounded-lg border border-primary/40 bg-card shadow-xl",
              )}
              style={{
                left: ghost.x,
                top: ghost.y,
                width: ghost.w,
                height: ghost.h,
              }}
            >
              <div className="flex h-full flex-col bg-card/95 px-3 py-2">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Moving
                </div>
                <div className="mt-1 text-sm font-semibold text-navy">{ghost.label}</div>
                <div className="mt-auto text-[11px] text-muted-foreground">Drop on a highlighted slot</div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
