"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { fetchListColumnPrefs, saveListColumnPrefs } from "@/app/actions/desk-prefs";
import { ColumnsMenu } from "@/components/lists/columns-menu";
import { useLiveContainsQuery } from "@/hooks/use-live-contains-query";
import {
  allColumnIds,
  defaultVisibleIds,
  loadVisibleColumns,
  mergeVisibleColumns,
  reorderVisibleColumns,
  saveVisibleColumns,
  shownColumns,
  toggleColumnVisibility,
  type ListColumn,
} from "@/lib/list-columns";
import { matchesContains } from "@/lib/search/live-query";

export type { ListColumn };

export type ColumnRow = {
  key: string;
  id?: string;
  hay?: string;
  /** Hidden on the default list; still searchable. Used for Lost / parked Nurture. */
  parked?: boolean;
  cells: Record<string, ReactNode>;
};

export function ColumnTable({
  moduleId,
  searchModuleId,
  initialQuery = "",
  columns,
  rows,
  empty,
  initialVisible,
}: {
  moduleId: string;
  searchModuleId?: string;
  initialQuery?: string;
  columns: ListColumn[];
  rows: ColumnRow[];
  empty?: ReactNode;
  /** Server-loaded desk_column_prefs for this user / module. */
  initialVisible?: string[];
}) {
  const queryModule = searchModuleId ?? moduleId;
  const liveQuery = useLiveContainsQuery(queryModule, initialQuery);
  const visibleRows = useMemo(() => {
    return rows.filter((row) => {
      if (row.parked && !liveQuery.trim()) return false;
      if (row.hay != null) return matchesContains(liveQuery, row.hay);
      return true;
    });
  }, [liveQuery, rows]);
  const [visible, setVisible] = useState(() =>
    initialVisible
      ? mergeVisibleColumns(columns, initialVisible)
      : defaultVisibleIds(columns),
  );
  const colKey = columns.map((column) => column.id).join(",");
  const initialKey = initialVisible?.join(",") ?? "";

  useEffect(() => {
    if (initialVisible) {
      const merged = mergeVisibleColumns(columns, initialVisible);
      setVisible(merged);
      saveVisibleColumns(moduleId, merged);
      return;
    }
    setVisible(loadVisibleColumns(moduleId, columns));
    let cancelled = false;
    void fetchListColumnPrefs(moduleId).then((stored) => {
      if (cancelled || !stored) return;
      const merged = mergeVisibleColumns(columns, stored);
      setVisible(merged);
      saveVisibleColumns(moduleId, merged);
    });
    return () => {
      cancelled = true;
    };
    // column defs are stable per module; colKey tracks id list only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleId, colKey, initialKey]);

  const shown = useMemo(() => shownColumns(columns, visible), [columns, visible]);

  function persist(next: string[]) {
    setVisible(next);
    saveVisibleColumns(moduleId, next);
    void saveListColumnPrefs(moduleId, next);
  }

  function toggle(id: string) {
    persist(toggleColumnVisibility(columns, visible, id));
  }

  function reorder(fromId: string, toId: string) {
    persist(reorderVisibleColumns(visible, fromId, toId));
  }

  function reset() {
    persist(allColumnIds(columns));
  }

  return (
    <div className="overflow-x-auto">
      <table className="ff-table">
        <thead>
          <tr>
            {shown.map((column) => (
              <th key={column.id}>{column.label}</th>
            ))}
            <th className="ff-col-manage">
              <ColumnsMenu
                columns={columns}
                visible={visible}
                onToggle={toggle}
                onReorder={reorder}
                onReset={reset}
              />
            </th>
          </tr>
        </thead>
        <tbody>
          {visibleRows.length === 0 ? (
            <tr>
              <td colSpan={shown.length + 1} className="text-muted-foreground">
                {liveQuery.trim()
                  ? `No records containing “${liveQuery.trim()}”.`
                  : (empty ?? "No records.")}
              </td>
            </tr>
          ) : (
            visibleRows.map((row) => (
              <tr key={row.key} id={row.id}>
                {shown.map((column) => (
                  <td key={column.id}>{row.cells[column.id]}</td>
                ))}
                <td className="ff-col-manage" aria-hidden />
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
