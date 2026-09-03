"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Columns3 } from "lucide-react";
import { columnStorageKey, resolveVisibleColumns } from "@/lib/crm/lists";
import { cn } from "@/lib/utils";

export type PickerColumn = {
  id: string;
  header: string;
  defaultVisible?: boolean;
  hideable?: boolean;
};

type Props = {
  tableId: string;
  columns: PickerColumn[];
  children: React.ReactNode;
  toolbar?: React.ReactNode;
};

export function ColumnPicker({ tableId, columns, children, toolbar }: Props) {
  const storageKey = columnStorageKey(tableId);
  const rootRef = useRef<HTMLDivElement>(null);
  const [stored, setStored] = useState<string[] | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) setStored(JSON.parse(raw) as string[]);
    } catch {
      setStored(null);
    }
  }, [storageKey]);

  const visibleIds = useMemo(() => resolveVisibleColumns(columns, stored), [columns, stored]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const visible = new Set(visibleIds);
    root.querySelectorAll<HTMLElement>("[data-col]").forEach((el) => {
      const id = el.dataset.col;
      if (!id) return;
      el.hidden = !visible.has(id);
    });
  }, [visibleIds, children]);

  function persist(next: string[]) {
    setStored(next);
    window.localStorage.setItem(storageKey, JSON.stringify(next));
  }

  function toggle(id: string, hideable: boolean) {
    if (!hideable) return;
    const next = visibleIds.includes(id)
      ? visibleIds.filter((value) => value !== id)
      : [...visibleIds, id];
    persist(
      next.length
        ? next
        : columns.filter((column) => column.defaultVisible !== false).map((column) => column.id),
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">{toolbar}</div>
        <details className="relative">
          <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1 text-[0.8rem] font-medium text-navy hover:bg-muted">
            <Columns3 className="size-3.5" />
            Columns
          </summary>
          <div className="absolute right-0 z-30 mt-1 w-56 rounded-md border border-border bg-card p-2 shadow-md">
            <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Visible columns
            </p>
            {columns.map((col) => {
              const on = visibleIds.includes(col.id);
              const hideable = col.hideable !== false;
              return (
                <button
                  key={col.id}
                  type="button"
                  disabled={!hideable}
                  onClick={() => toggle(col.id, hideable)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-navy hover:bg-muted disabled:opacity-50"
                >
                  <span
                    className={cn(
                      "flex size-4 items-center justify-center rounded-sm border",
                      on ? "border-primary bg-primary text-primary-foreground" : "border-border",
                    )}
                  >
                    {on ? <Check className="size-3" /> : null}
                  </span>
                  {col.header}
                </button>
              );
            })}
          </div>
        </details>
      </div>
      <div ref={rootRef}>{children}</div>
    </div>
  );
}
