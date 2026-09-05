"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { RotateCcw, SlidersHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLiveContainsQuery } from "@/hooks/use-live-contains-query";
import {
  columnMenuLabel,
  defaultVisibleIds,
  loadVisibleColumns,
  saveVisibleColumns,
  shownColumns,
  toggleColumnVisibility,
  type ListColumn,
} from "@/lib/list-columns";
import { matchesContains } from "@/lib/search/live-query";
import { cn } from "@/lib/utils";

export type { ListColumn };

export type ColumnRow = {
  key: string;
  id?: string;
  hay?: string;
  cells: Record<string, ReactNode>;
};

export function ColumnTable({
  moduleId,
  searchModuleId,
  initialQuery = "",
  columns,
  rows,
  empty,
}: {
  moduleId: string;
  searchModuleId?: string;
  initialQuery?: string;
  columns: ListColumn[];
  rows: ColumnRow[];
  empty?: ReactNode;
}) {
  const queryModule = searchModuleId ?? moduleId;
  const liveQuery = useLiveContainsQuery(queryModule, initialQuery);
  const visibleRows = useMemo(() => {
    if (!rows.some((row) => row.hay != null)) return rows;
    return rows.filter((row) => matchesContains(liveQuery, row.hay));
  }, [liveQuery, rows]);
  const [visible, setVisible] = useState(() => defaultVisibleIds(columns));
  const colKey = columns.map((column) => column.id).join(",");

  useEffect(() => {
    setVisible(loadVisibleColumns(moduleId, columns));
    // column defs are stable per module; colKey tracks id list only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleId, colKey]);

  const shown = useMemo(() => shownColumns(columns, visible), [columns, visible]);
  const visibleSet = useMemo(() => new Set(visible), [visible]);

  function persist(next: string[]) {
    setVisible(next);
    saveVisibleColumns(moduleId, next);
  }

  function toggle(id: string) {
    persist(toggleColumnVisibility(columns, visible, id));
  }

  function reset() {
    persist(defaultVisibleIds(columns));
  }

  function cellHidden(id: string) {
    return !visibleSet.has(id);
  }

  return (
    <div className="overflow-x-auto">
      <table className="ff-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.id}
                hidden={cellHidden(column.id)}
                className={cn(cellHidden(column.id) && "hidden")}
              >
                {column.label}
              </th>
            ))}
            <th className="ff-col-manage">
              <DropdownMenu>
                <DropdownMenuTrigger
                  aria-label="Manage columns"
                  title="Manage columns"
                  className={cn(
                    "inline-flex size-7 items-center justify-center rounded text-muted-foreground",
                    "hover:bg-card hover:text-foreground",
                  )}
                >
                  <SlidersHorizontal className="size-3.5" strokeWidth={1.75} />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" side="bottom" className="w-56 min-w-56">
                  {/* Base UI GroupLabel throws unless it sits inside Menu.Group. */}
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>Columns</DropdownMenuLabel>
                    {columns.map((column) => {
                      const itemLabel = columnMenuLabel(column);
                      return (
                        <DropdownMenuCheckboxItem
                          key={column.id}
                          checked={visibleSet.has(column.id)}
                          disabled={column.locked}
                          label={itemLabel}
                          closeOnClick={false}
                          onCheckedChange={() => toggle(column.id)}
                        >
                          {itemLabel}
                          {column.locked ? (
                            <span className="ml-auto text-[10px] text-muted-foreground">
                              required
                            </span>
                          ) : null}
                        </DropdownMenuCheckboxItem>
                      );
                    })}
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={reset}>
                    <RotateCcw className="size-3.5" />
                    Show all
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
                {columns.map((column) => (
                  <td
                    key={column.id}
                    hidden={cellHidden(column.id)}
                    className={cn(cellHidden(column.id) && "hidden")}
                  >
                    {row.cells[column.id]}
                  </td>
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
