"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { CalendarDays, X } from "lucide-react";
import { TodayActivityStrip } from "@/components/deals/today-activity-strip";
import {
  formatTodayActivityDate,
  todayActivityCalendarHref,
  type DealTodayActivityType,
} from "@/lib/deals/pipeline-desk";

const STORAGE_KEY = "ff-today-activity-corner:pos:v1";
const DRAG_THRESHOLD_PX = 4;
const EDGE_PAD = 8;

type CornerPos = { left: number; top: number };

function readStoredPos(): CornerPos | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CornerPos>;
    if (typeof parsed.left !== "number" || typeof parsed.top !== "number") return null;
    if (!Number.isFinite(parsed.left) || !Number.isFinite(parsed.top)) return null;
    return { left: parsed.left, top: parsed.top };
  } catch {
    return null;
  }
}

function writeStoredPos(pos: CornerPos | null) {
  if (typeof window === "undefined") return;
  try {
    if (!pos) window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
  } catch {
    /* private mode / quota */
  }
}

const posListeners = new Set<() => void>();
let posCache: CornerPos | null = null;
let posRaw: string | null | undefined;

function snapshotPos(): CornerPos | null {
  if (posRaw !== undefined) return posCache;
  posCache = readStoredPos();
  posRaw = posCache ? JSON.stringify(posCache) : null;
  return posCache;
}

function publishPos(next: CornerPos | null, persist: boolean) {
  posCache = next;
  if (persist) {
    writeStoredPos(next);
    posRaw = next ? JSON.stringify(next) : null;
  } else if (posRaw === undefined) {
    posRaw = null;
  }
  for (const listener of posListeners) listener();
}

function subscribePos(listener: () => void) {
  posListeners.add(listener);
  return () => {
    posListeners.delete(listener);
  };
}

function serverPos(): CornerPos | null {
  return null;
}

function subscribeMounted(): () => void {
  return () => {};
}

function clientMounted(): boolean {
  return true;
}

function serverMounted(): boolean {
  return false;
}

function clampPos(left: number, top: number, width: number, height: number): CornerPos {
  const maxLeft = Math.max(EDGE_PAD, window.innerWidth - width - EDGE_PAD);
  const maxTop = Math.max(EDGE_PAD, window.innerHeight - height - EDGE_PAD);
  return {
    left: Math.min(maxLeft, Math.max(EDGE_PAD, left)),
    top: Math.min(maxTop, Math.max(EDGE_PAD, top)),
  };
}

export function TodayActivityCorner({
  counts,
  active,
  now,
  basePath = "/renewals",
}: {
  counts: Record<DealTodayActivityType, number>;
  active?: DealTodayActivityType | null;
  now?: Date;
  basePath?: "/deals" | "/renewals";
}) {
  const [open, setOpen] = useState(false);
  const mounted = useSyncExternalStore(subscribeMounted, clientMounted, serverMounted);
  const pos = useSyncExternalStore(subscribePos, snapshotPos, serverPos);
  const [panelSide, setPanelSide] = useState<"above" | "below">("above");
  const [panelAlign, setPanelAlign] = useState<"start" | "end">("end");
  const rootRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originLeft: number;
    originTop: number;
    moved: boolean;
  } | null>(null);
  const skipClickRef = useRef(false);
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  const dated = formatTodayActivityDate(now);

  const reclamp = useCallback(() => {
    const current = snapshotPos();
    if (!current || !rootRef.current) return;
    const rect = rootRef.current.getBoundingClientRect();
    const next = clampPos(current.left, current.top, rect.width, rect.height);
    if (next.left === current.left && next.top === current.top) return;
    publishPos(next, true);
  }, []);

  useEffect(() => {
    if (!pos) return;
    window.addEventListener("resize", reclamp);
    return () => window.removeEventListener("resize", reclamp);
  }, [pos, reclamp]);

  const placePanel = useCallback(() => {
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;
    const need = 220;
    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceLeft = rect.left;
    const spaceRight = window.innerWidth - rect.right;
    setPanelSide(spaceAbove >= need || spaceAbove >= spaceBelow ? "above" : "below");
    setPanelAlign(spaceRight >= spaceLeft ? "start" : "end");
  }, []);

  useEffect(() => {
    if (!open) return;
    function onDoc(event: MouseEvent) {
      if (rootRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", placePanel);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", placePanel);
    };
  }, [open, placePanel]);

  function resetPosition() {
    publishPos(null, true);
  }

  function onTogglePointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return;
    const root = rootRef.current;
    if (!root) return;
    const rect = root.getBoundingClientRect();
    const origin = pos ?? { left: rect.left, top: rect.top };
    skipClickRef.current = false;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originLeft: origin.left,
      originTop: origin.top,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onTogglePointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
    drag.moved = true;
    skipClickRef.current = true;
    const root = rootRef.current;
    const width = root?.offsetWidth ?? 160;
    const height = root?.offsetHeight ?? 48;
    const next = clampPos(drag.originLeft + dx, drag.originTop + dy, width, height);
    publishPos(next, false);
  }

  function endDrag(event: React.PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      /* already released */
    }
    if (drag.moved) {
      const current = snapshotPos();
      if (current) publishPos(current, true);
      if (open) placePanel();
    }
  }

  const node = (
    <div
      ref={rootRef}
      className="ff-today-activity-corner"
      data-ff-today-activity-corner=""
      data-open={open ? "true" : "false"}
      data-ff-drag-pos={pos ? "1" : undefined}
      style={pos ? { left: pos.left, top: pos.top, bottom: "auto", right: "auto" } : undefined}
      title={pos ? "Double-click the bubble to reset position" : undefined}
    >
      {open ? (
        <div
          className="ff-today-activity-corner-panel"
          data-ff-today-activity-panel=""
          data-ff-panel-side={panelSide}
          data-ff-panel-align={panelAlign}
        >
          <div className="ff-today-activity-corner-panel-head">
            <Link
              href={todayActivityCalendarHref()}
              className="ff-today-activity-corner-calendar"
              title="Open calendar"
              aria-label="Open calendar"
              data-testid="deal-today-calendar"
            >
              <CalendarDays className="size-3.5" aria-hidden />
              <span data-testid="deal-today-date">{dated}</span>
            </Link>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Collapse Today Activity"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </div>
          <TodayActivityStrip counts={counts} active={active} basePath={basePath} />
        </div>
      ) : null}
      <button
        type="button"
        className="ff-today-activity-corner-toggle"
        aria-expanded={open}
        aria-label={open ? "Collapse Today Activity" : "Open Today Activity"}
        data-ff-today-activity-toggle=""
        onPointerDown={onTogglePointerDown}
        onPointerMove={onTogglePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onDoubleClick={(event) => {
          event.preventDefault();
          resetPosition();
        }}
        onClick={() => {
          if (skipClickRef.current) {
            skipClickRef.current = false;
            return;
          }
          if (!open) placePanel();
          setOpen((current) => !current);
        }}
      >
        <CalendarDays className="size-4" aria-hidden />
        <span className="ff-today-activity-corner-copy" data-ff-today-activity-label="">
          Today Activity
        </span>
        <strong>{total}</strong>
      </button>
    </div>
  );

  if (!mounted || typeof document === "undefined") return node;
  return createPortal(node, document.body);
}
