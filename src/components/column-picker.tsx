"use client";

import { useEffect, useMemo, useState } from "react";
import { saveColumnPrefs } from "@/app/actions/desk-prefs";
import { SheetHeader } from "@/components/sheet/sheet-header";
import { TABLE_COLUMNS, parseColumns } from "@/lib/desk/columns";

export function ColumnPicker({
  tableKey,
  initial,
}: {
  tableKey: string;
  initial: string[];
}) {
  const defs = TABLE_COLUMNS[tableKey] ?? [];
  const [selected, setSelected] = useState<string[]>(initial);

  useEffect(() => {
    const stored = window.localStorage.getItem(`ff_cols_${tableKey}`);
    if (stored) setSelected(parseColumns(tableKey, stored));
  }, [tableKey]);

  useEffect(() => {
    for (const key of defs.map((d) => d.key)) {
      document.querySelectorAll<HTMLElement>(`[data-col="${tableKey}.${key}"]`).forEach((el) => {
        el.style.display = selected.includes(key) ? "" : "none";
      });
    }
  }, [defs, selected, tableKey]);

  const label = useMemo(() => `${selected.length} columns`, [selected.length]);

  function toggle(key: string) {
    const next = selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key];
    const locked = defs[0] ? Array.from(new Set([defs[0].key, ...next])) : next;
    setSelected(locked);
    window.localStorage.setItem(`ff_cols_${tableKey}`, locked.join(","));
    const form = new FormData();
    form.set("tableKey", tableKey);
    form.set("columns", locked.join(","));
    void saveColumnPrefs(form);
  }

  return (
    <details className="relative">
      <summary className="inline-flex cursor-pointer list-none items-center rounded-md border border-border bg-card px-2.5 py-1 text-sm text-navy hover:border-primary [&::-webkit-details-marker]:hidden">
        Columns · {label}
      </summary>
      <div className="absolute right-0 z-50 mt-1 max-h-80 w-56 overflow-auto rounded-md border border-border bg-card p-2 shadow-lg">
        {defs.map((col) => (
          <label key={col.key} className="flex items-center gap-2 px-1 py-1 text-sm">
            <input
              type="checkbox"
              checked={selected.includes(col.key)}
              onChange={() => toggle(col.key)}
            />
            {col.label}
          </label>
        ))}
      </div>
    </details>
  );
}

export function Col({
  table,
  col,
  children,
  as = "td",
  className,
  sortValue,
}: {
  table: string;
  col: string;
  children: React.ReactNode;
  as?: "td" | "th";
  className?: string;
  sortValue?: string | number | null;
}) {
  if (as === "th") {
    return (
      <SheetHeader table={table} col={col} className={className}>
        {children}
      </SheetHeader>
    );
  }
  return (
    <td
      data-col={`${table}.${col}`}
      data-sheet-col={col}
      data-sort={sortValue == null ? undefined : String(sortValue)}
      className={className}
    >
      {children}
    </td>
  );
}
