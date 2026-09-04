"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { saveColumnPrefs } from "@/app/actions/desk-prefs";
import { TABLE_COLUMNS, parseColumns } from "@/lib/desk/columns";

export function ColumnPicker({
  tableKey,
  initial,
}: {
  tableKey: string;
  initial: string[];
}) {
  const defs = TABLE_COLUMNS[tableKey] ?? [];
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(initial);
  const boxRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!open) return;
    function onDoc(ev: MouseEvent) {
      if (!boxRef.current?.contains(ev.target as Node)) setOpen(false);
    }
    function onKey(ev: KeyboardEvent) {
      if (ev.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

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
    <div ref={boxRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((v) => !v)}
        className="rounded-md border border-border bg-card px-2.5 py-1 text-sm text-navy hover:border-primary"
      >
        Columns · {label}
      </button>
      {open ? (
        <div
          role="listbox"
          className="absolute right-0 z-50 mt-1 max-h-80 w-56 overflow-auto rounded-md border border-border bg-card p-2 shadow-lg"
        >
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
      ) : null}
    </div>
  );
}

export function Col({
  table,
  col,
  children,
  as = "td",
  className,
}: {
  table: string;
  col: string;
  children: React.ReactNode;
  as?: "td" | "th";
  className?: string;
}) {
  const Tag = as;
  return (
    <Tag data-col={`${table}.${col}`} className={className}>
      {children}
    </Tag>
  );
}
