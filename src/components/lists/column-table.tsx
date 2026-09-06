"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { isValidElement } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { fetchListColumnLayout, saveListColumnPrefs } from "@/app/actions/desk-prefs";
import { ColumnsMenu } from "@/components/lists/columns-menu";
import { useLiveContainsQuery } from "@/hooks/use-live-contains-query";
import { compareSheetValues } from "@/lib/desk/sheet-layout";
import {
  allColumnIds,
  clampColumnWidth,
  cycleListSort,
  defaultColumnWidth,
  defaultVisibleIds,
  loadColumnLayout,
  mergeColumnWidths,
  mergeVisibleColumns,
  parseListSort,
  reorderVisibleColumns,
  saveColumnLayout,
  shownColumns,
  toggleColumnVisibility,
  type ListColumn,
  type ListColumnLayout,
  type ListSort,
} from "@/lib/list-columns";
import { matchesContains } from "@/lib/search/live-query";
import { cn } from "@/lib/utils";

export type { ListColumn };

export type ColumnRow = {
  key: string;
  id?: string;
  hay?: string;
  /** Hidden on the default list; still searchable. Used for Lost / parked Nurture. */
  parked?: boolean;
  cells: Record<string, ReactNode>;
  /** Optional explicit sort keys. Falls back to rendered text. */
  sort?: Record<string, string | number | null | undefined>;
};

export function cellSortText(value: ReactNode): string {
  if (value == null || typeof value === "boolean") return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(cellSortText).filter(Boolean).join(" ");
  if (isValidElement<{ children?: ReactNode }>(value)) return cellSortText(value.props.children);
  return "";
}

export function rowSortValue(row: ColumnRow, columnId: string): string {
  const explicit = row.sort?.[columnId];
  if (explicit != null && explicit !== "") return String(explicit);
  return cellSortText(row.cells[columnId]);
}

export function ColumnTable({
  moduleId,
  searchModuleId,
  initialQuery = "",
  columns,
  rows,
  empty,
  initialVisible,
  initialWidths,
  initialSort,
}: {
  moduleId: string;
  searchModuleId?: string;
  initialQuery?: string;
  columns: ListColumn[];
  rows: ColumnRow[];
  empty?: ReactNode;
  /** Server-loaded desk_column_prefs for this user / module. */
  initialVisible?: string[];
  initialWidths?: Record<string, number>;
  initialSort?: ListSort | null;
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
  const [widths, setWidths] = useState<Record<string, number>>(() =>
    mergeColumnWidths(columns, initialWidths ?? {}),
  );
  const [sort, setSort] = useState<ListSort | null>(() => parseListSort(initialSort));
  const [draftWidths, setDraftWidths] = useState<Record<string, number> | null>(null);
  const appliedWidths = draftWidths ?? widths;
  const colKey = columns.map((column) => column.id).join(",");
  const initialKey = `${initialVisible?.join(",") ?? ""}|${JSON.stringify(initialWidths ?? {})}|${initialSort?.key ?? ""}:${initialSort?.dir ?? ""}`;

  useEffect(() => {
    if (initialVisible) {
      const merged = mergeVisibleColumns(columns, initialVisible);
      const nextWidths = mergeColumnWidths(columns, initialWidths ?? {});
      const nextSort = parseListSort(initialSort);
      setVisible(merged);
      setWidths(nextWidths);
      setSort(nextSort);
      saveColumnLayout(moduleId, { columns: merged, widths: nextWidths, sort: nextSort });
      return;
    }
    const local = loadColumnLayout(moduleId, columns);
    setVisible(local.columns);
    setWidths(local.widths);
    setSort(local.sort);
    let cancelled = false;
    void fetchListColumnLayout(moduleId).then((stored) => {
      if (cancelled || !stored) return;
      const merged = mergeVisibleColumns(columns, stored.columns);
      const nextWidths = mergeColumnWidths(columns, stored.widths);
      const nextSort = parseListSort(stored.sort);
      setVisible(merged);
      setWidths(nextWidths);
      setSort(nextSort);
      saveColumnLayout(moduleId, { columns: merged, widths: nextWidths, sort: nextSort });
    });
    return () => {
      cancelled = true;
    };
    // column defs are stable per module; colKey tracks id list only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleId, colKey, initialKey]);

  const shown = useMemo(() => shownColumns(columns, visible), [columns, visible]);
  const sortedRows = useMemo(() => {
    if (!sort || !shown.some((column) => column.id === sort.key)) return visibleRows;
    return [...visibleRows].sort((a, b) => {
      const cmp = compareSheetValues(rowSortValue(a, sort.key), rowSortValue(b, sort.key));
      return sort.dir === "asc" ? cmp : -cmp;
    });
  }, [shown, sort, visibleRows]);

  function persist(next: ListColumnLayout) {
    setVisible(next.columns);
    setWidths(next.widths);
    setSort(next.sort);
    saveColumnLayout(moduleId, next);
    void saveListColumnPrefs(moduleId, next.columns, { widths: next.widths, sort: next.sort });
  }

  function persistPartial(patch: Partial<ListColumnLayout>) {
    persist({
      columns: patch.columns ?? visible,
      widths: patch.widths ?? widths,
      sort: patch.sort === undefined ? sort : patch.sort,
    });
  }

  function toggle(id: string) {
    persistPartial({ columns: toggleColumnVisibility(columns, visible, id) });
  }

  function reorder(fromId: string, toId: string) {
    persistPartial({ columns: reorderVisibleColumns(visible, fromId, toId) });
  }

  function reset() {
    persist({ columns: allColumnIds(columns), widths: {}, sort: null });
  }

  function onSort(id: string) {
    persistPartial({ sort: cycleListSort(sort, id) });
  }

  function onWidth(id: string, px: number, commit: boolean) {
    const next = { ...widths, [id]: clampColumnWidth(px) };
    if (commit) {
      setDraftWidths(null);
      persistPartial({ widths: next });
      return;
    }
    setDraftWidths(next);
  }

  return (
    <div className="overflow-x-auto">
      <table className="ff-table ff-list-table">
        <colgroup>
          {shown.map((column) => (
            <col
              key={column.id}
              style={{ width: appliedWidths[column.id] ?? defaultColumnWidth(column) }}
            />
          ))}
          <col className="ff-col-manage" />
        </colgroup>
        <thead>
          <tr>
            {shown.map((column, index) => (
              <ListColumnHeader
                key={column.id}
                column={column}
                prev={shown[index - 1] ?? null}
                widths={appliedWidths}
                sort={sort}
                onSort={() => onSort(column.id)}
                onWidth={onWidth}
              />
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
          {sortedRows.length === 0 ? (
            <tr>
              <td colSpan={shown.length + 1} className="text-muted-foreground">
                {liveQuery.trim()
                  ? `No records containing “${liveQuery.trim()}”.`
                  : (empty ?? "No records.")}
              </td>
            </tr>
          ) : (
            sortedRows.map((row) => (
              <tr key={row.key} id={row.id}>
                {shown.map((column) => (
                  <td
                    key={column.id}
                    data-sheet-col={column.id}
                    data-sort={rowSortValue(row, column.id) || undefined}
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

function ListColumnHeader({
  column,
  prev,
  widths,
  sort,
  onSort,
  onWidth,
}: {
  column: ListColumn;
  prev: ListColumn | null;
  widths: Record<string, number>;
  sort: ListSort | null;
  onSort: () => void;
  onWidth: (id: string, px: number, commit: boolean) => void;
}) {
  const sortable = Boolean(column.label.trim());
  const active = sort?.key === column.id ? sort.dir : null;
  const ariaSort = active === "asc" ? "ascending" : active === "desc" ? "descending" : "none";

  return (
    <th
      data-sheet-col={column.id}
      aria-sort={sortable ? ariaSort : undefined}
      className={cn("ff-list-th", sortable && "ff-sheet-th")}
    >
      {prev ? (
        <ResizeHandle
          columnId={prev.id}
          edge="left"
          currentWidth={widths[prev.id] ?? defaultColumnWidth(prev)}
          onWidth={onWidth}
        />
      ) : null}
      {sortable ? (
        <button
          type="button"
          onClick={onSort}
          className="inline-flex min-w-0 max-w-full items-center gap-1 text-left font-semibold text-inherit hover:text-navy"
          aria-label={`Sort by ${column.label}`}
        >
          <span className="truncate">{column.label}</span>
          <span data-sheet-glyph className="inline-flex shrink-0" aria-hidden>
            <ArrowUpDown
              data-icon="none"
              className={cn("size-3 text-muted-foreground/70", active && "hidden")}
            />
            <ArrowUp data-icon="asc" className={cn("size-3 text-navy", active !== "asc" && "hidden")} />
            <ArrowDown
              data-icon="desc"
              className={cn("size-3 text-navy", active !== "desc" && "hidden")}
            />
          </span>
        </button>
      ) : (
        <span className="sr-only">{column.label || "Select"}</span>
      )}
      <ResizeHandle
        columnId={column.id}
        edge="right"
        currentWidth={widths[column.id] ?? defaultColumnWidth(column)}
        onWidth={onWidth}
      />
    </th>
  );
}

function ResizeHandle({
  columnId,
  edge,
  currentWidth,
  onWidth,
}: {
  columnId: string;
  edge: "left" | "right";
  currentWidth: number;
  onWidth: (id: string, px: number, commit: boolean) => void;
}) {
  const drag = useRef<{ startX: number; startW: number } | null>(null);

  function onPointerDown(event: PointerEvent<HTMLSpanElement>) {
    event.preventDefault();
    event.stopPropagation();
    drag.current = { startX: event.clientX, startW: currentWidth };
    event.currentTarget.setPointerCapture(event.pointerId);
    document.body.dataset.ffColResize = "1";
  }

  function onPointerMove(event: PointerEvent<HTMLSpanElement>) {
    if (!drag.current) return;
    const delta = event.clientX - drag.current.startX;
    onWidth(columnId, drag.current.startW + delta, false);
  }

  function onPointerUp(event: PointerEvent<HTMLSpanElement>) {
    if (!drag.current) return;
    const delta = event.clientX - drag.current.startX;
    onWidth(columnId, drag.current.startW + delta, true);
    drag.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
    delete document.body.dataset.ffColResize;
  }

  return (
    <span
      role="separator"
      aria-orientation="vertical"
      aria-label={`Resize ${columnId} column`}
      data-resize-edge={edge}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className={cn("ff-col-resize", edge === "left" ? "ff-col-resize-left" : "ff-col-resize-right")}
    />
  );
}
