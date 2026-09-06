"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { GripVertical } from "lucide-react";
import {
  columnMenuLabel,
  shownColumns,
  type ListColumn,
} from "@/lib/list-columns";
import { cn } from "@/lib/utils";

export function ColumnsMenu({
  columns,
  visible,
  onToggle,
  onReorder,
  onReset,
}: {
  columns: ListColumn[];
  visible: string[];
  onToggle: (id: string) => void;
  onReorder: (fromId: string, toId: string) => void;
  onReset: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [panel, setPanel] = useState<{ top: number; right: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const visibleSet = new Set(visible);
  const checked = shownColumns(columns, visible).filter((column) => column.label.trim());
  const unchecked = columns.filter((column) => !visibleSet.has(column.id) && column.label.trim());
  const items = [...checked, ...unchecked];

  useEffect(() => {
    if (!open) return;
    function place() {
      const box = buttonRef.current?.getBoundingClientRect();
      if (!box) return;
      setPanel({ top: box.bottom + 4, right: window.innerWidth - box.right });
    }
    function onDoc(event: MouseEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    }
    place();
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Columns"
        title="Columns"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "inline-flex h-7 items-center rounded-md border border-border bg-card px-2 text-xs font-medium text-navy",
          "hover:bg-muted",
        )}
      >
        Columns
      </button>
      {open && panel && typeof document !== "undefined"
        ? createPortal(
        <div
          ref={panelRef}
          className="fixed z-[80] max-h-80 w-60 overflow-auto rounded-md border border-border bg-card p-1.5 shadow-lg"
          style={{ top: panel.top, right: panel.right }}
        >
          <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Columns
          </p>
          {items.map((column) => {
            const checkedItem = visibleSet.has(column.id);
            const label = columnMenuLabel(column);
            return (
              <div
                key={column.id}
                draggable={checkedItem}
                onDragStart={(event) => {
                  if (!checkedItem) return;
                  setDragId(column.id);
                  event.dataTransfer.setData("text/plain", column.id);
                  event.dataTransfer.effectAllowed = "move";
                }}
                onDragOver={(event) => {
                  if (!checkedItem || !dragId || dragId === column.id) return;
                  event.preventDefault();
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  if (!checkedItem || !dragId) return;
                  onReorder(dragId, column.id);
                  setDragId(null);
                }}
                onDragEnd={() => setDragId(null)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-1.5 py-1 text-sm text-navy",
                  checkedItem && "cursor-grab",
                  dragId === column.id && "bg-muted",
                )}
              >
                <span
                  className={cn(
                    "inline-flex size-4 shrink-0 items-center justify-center text-muted-foreground",
                    !checkedItem && "invisible",
                  )}
                  aria-hidden={!checkedItem}
                >
                  <GripVertical className="size-3.5" />
                </span>
                <label className="flex min-w-0 flex-1 items-center gap-2">
                  <input
                    type="checkbox"
                    checked={checkedItem}
                    disabled={column.locked}
                    onChange={() => onToggle(column.id)}
                    className="size-3.5 accent-primary"
                  />
                  <span className="truncate">{label}</span>
                  {column.locked ? (
                    <span className="ml-auto text-[10px] text-muted-foreground">required</span>
                  ) : null}
                </label>
              </div>
            );
          })}
          <button
            type="button"
            onClick={onReset}
            className="mt-1 w-full rounded-md px-2 py-1.5 text-left text-xs text-primary hover:bg-muted"
          >
            Show all
          </button>
        </div>,
        document.body,
      )
        : null}
    </div>
  );
}
