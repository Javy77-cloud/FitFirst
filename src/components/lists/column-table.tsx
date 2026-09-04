"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { RotateCcw, SlidersHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  defaultVisibleIds,
  loadVisibleColumns,
  saveVisibleColumns,
  shownColumns,
  toggleColumnVisibility,
  type ListColumn,
} from "@/lib/list-columns";
import { cn } from "@/lib/utils";

export type { ListColumn };

export type ColumnRow = {
  key: string;
  id?: string;
  cells: Record<string, ReactNode>;
};

export function ColumnTable({
  moduleId,
  columns,
  rows,
  empty,
}: {
  moduleId: string;
  columns: ListColumn[];
  rows: ColumnRow[];
  empty?: ReactNode;
}) {
  const [visible, setVisible] = useState(() => defaultVisibleIds(columns));
  const colKey = columns.map((column) => column.id).join(",");

  useEffect(() => {
    setVisible(loadVisibleColumns(moduleId, columns));
    // column defs are stable per module; colKey tracks id list only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleId, colKey]);

  const shown = useMemo(() => shownColumns(columns, visible), [columns, visible]);

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

  return (
    <div className="overflow-x-auto">
      <table className="ff-table">
        <thead>
          <tr>
            {shown.map((column) => (
              <th key={column.id}>{column.label}</th>
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
                  <DropdownMenuLabel>Columns</DropdownMenuLabel>
                  {columns.map((column) => (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      checked={visible.includes(column.id)}
                      disabled={column.locked}
                      onCheckedChange={() => toggle(column.id)}
                    >
                      {column.label}
                      {column.locked ? (
                        <span className="ml-auto text-[10px] text-muted-foreground">
                          required
                        </span>
                      ) : null}
                    </DropdownMenuCheckboxItem>
                  ))}
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
          {rows.length === 0 ? (
            <tr>
              <td colSpan={shown.length + 1} className="text-muted-foreground">
                {empty ?? "No records."}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
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
