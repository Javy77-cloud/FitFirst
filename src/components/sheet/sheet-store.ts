"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  EMPTY_SHEET_LAYOUT,
  cycleSheetSort,
  parseSheetLayout,
  serializeSheetLayout,
  togglePinnedColumns,
  type SheetLayout,
  type SortDir,
} from "@/lib/desk/sheet-layout";

const memory = new Map<string, SheetLayout>();
const listeners = new Map<string, Set<() => void>>();

function storageKey(table: string) {
  return `ff_sheet_${table}`;
}

function emit(table: string) {
  listeners.get(table)?.forEach((fn) => fn());
}

function read(table: string): SheetLayout {
  if (memory.has(table)) return memory.get(table)!;
  if (typeof window === "undefined") return EMPTY_SHEET_LAYOUT;
  const parsed = parseSheetLayout(window.localStorage.getItem(storageKey(table)));
  memory.set(table, parsed);
  return parsed;
}

function write(table: string, next: SheetLayout) {
  memory.set(table, next);
  if (typeof window !== "undefined") {
    const raw = serializeSheetLayout(next);
    if (raw) window.localStorage.setItem(storageKey(table), raw);
    else window.localStorage.removeItem(storageKey(table));
  }
  emit(table);
}

export function useSheetLayout(table: string) {
  const layout = useSyncExternalStore(
    (onStoreChange) => {
      let set = listeners.get(table);
      if (!set) {
        set = new Set();
        listeners.set(table, set);
      }
      set.add(onStoreChange);
      return () => {
        set!.delete(onStoreChange);
      };
    },
    () => read(table),
    () => EMPTY_SHEET_LAYOUT,
  );

  const setSort = useCallback(
    (key: string, dir: SortDir) => {
      write(table, { ...read(table), sort: { key, dir } });
    },
    [table],
  );

  const cycleSort = useCallback(
    (key: string) => {
      const current = read(table);
      write(table, { ...current, sort: cycleSheetSort(current.sort, key) });
    },
    [table],
  );

  const clearSort = useCallback(() => {
    write(table, { ...read(table), sort: null });
  }, [table]);

  const togglePin = useCallback(
    (key: string) => {
      const current = read(table);
      write(table, { ...current, pinned: togglePinnedColumns(current.pinned, key) });
    },
    [table],
  );

  return { layout, setSort, cycleSort, clearSort, togglePin };
}
