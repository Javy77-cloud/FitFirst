"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { isValidElement } from "react";
import { fetchListColumnLayout, saveListColumnPrefs } from "@/app/actions/desk-prefs";
import { ColumnsMenu } from "@/components/lists/columns-menu";
import { LiveContainsInput } from "@/components/search/live-contains-input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLiveContainsQuery } from "@/hooks/use-live-contains-query";
import { compareSheetValues } from "@/lib/desk/sheet-layout";
import {
  allColumnIds,
  clampColumnWidth,
  defaultColumnWidth,
  defaultVisibleIds,
  isListColumnSortable,
  isLiveSearchColumn,
  isValueFilterColumn,
  listColumnHeaderText,
  listSortForColumn,
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
  type ListSortDir,
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
  const [valueFilters, setValueFilters] = useState<Record<string, string>>({});
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
  const filterValues = useMemo(() => {
    const next: Record<string, string[]> = {};
    for (const column of shown) {
      if (!isValueFilterColumn(column)) continue;
      const unique = new Set<string>();
      for (const row of rows) {
        const text = rowSortValue(row, column.id).trim();
        if (text) unique.add(text);
      }
      next[column.id] = [...unique].sort((a, b) => a.localeCompare(b));
    }
    return next;
  }, [rows, shown]);
  const filteredRows = useMemo(() => {
    return visibleRows.filter((row) => {
      for (const column of shown) {
        if (!isValueFilterColumn(column)) continue;
        const selected = valueFilters[column.id];
        if (!selected) continue;
        if (rowSortValue(row, column.id).trim() !== selected) return false;
      }
      return true;
    });
  }, [shown, valueFilters, visibleRows]);
  const sortedRows = useMemo(() => {
    const sortColumn = sort ? shown.find((column) => column.id === sort.key) : null;
    if (!sort || !sortColumn || isLiveSearchColumn(sortColumn)) return filteredRows;
    return [...filteredRows].sort((a, b) => {
      const cmp = compareSheetValues(rowSortValue(a, sort.key), rowSortValue(b, sort.key));
      return sort.dir === "asc" ? cmp : -cmp;
    });
  }, [filteredRows, shown, sort]);

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

  function onSort(id: string, dir: ListSortDir | null) {
    const column = columns.find((item) => item.id === id);
    if (!column || !isListColumnSortable(column)) return;
    persistPartial({ sort: listSortForColumn(id, dir) });
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
                searchModuleId={queryModule}
                initialQuery={initialQuery}
                filterOptions={filterValues[column.id] ?? []}
                filterValue={valueFilters[column.id] ?? ""}
                onFilterValue={(value) => {
                  setValueFilters((current) => {
                    const next = { ...current };
                    if (value) next[column.id] = value;
                    else delete next[column.id];
                    return next;
                  });
                }}
                onSort={(dir) => onSort(column.id, dir)}
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
  searchModuleId,
  initialQuery,
  filterOptions,
  filterValue,
  onFilterValue,
  onSort,
  onWidth,
}: {
  column: ListColumn;
  prev: ListColumn | null;
  widths: Record<string, number>;
  sort: ListSort | null;
  searchModuleId: string;
  initialQuery: string;
  filterOptions: string[];
  filterValue: string;
  onFilterValue: (value: string) => void;
  onSort: (dir: ListSortDir | null) => void;
  onWidth: (id: string, px: number, commit: boolean) => void;
}) {
  const liveSearch = isLiveSearchColumn(column);
  const sortable = isListColumnSortable(column);
  const headerText = listColumnHeaderText(column);
  const active = sortable && sort?.key === column.id ? sort.dir : null;
  const ariaSort = active === "asc" ? "ascending" : active === "desc" ? "descending" : "none";

  return (
    <th
      data-sheet-col={column.id}
      data-list-header={column.id}
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
      {liveSearch ? (
        <div className="flex min-w-0 max-w-full items-center gap-1">
          <span className="shrink-0 font-semibold text-inherit">{headerText}</span>
          <LiveContainsInput
            moduleId={searchModuleId}
            initialQuery={initialQuery}
            placeholder="Search names…"
            aria-label={`Search ${headerText}`}
            className="min-w-[7rem] flex-1"
            inputClassName="h-6 w-full min-w-[7rem]"
            data-list-col-search={column.id}
          />
        </div>
      ) : sortable ? (
        <div className="flex min-w-0 max-w-full items-center gap-0.5">
          <span className="truncate font-semibold text-inherit">{headerText}</span>
          <ColumnSortFilter
            label={headerText}
            active={active}
            filterOptions={filterOptions}
            filterValue={filterValue}
            onFilterValue={onFilterValue}
            onSort={onSort}
          />
        </div>
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

function ColumnSortFilter({
  label,
  active,
  filterOptions,
  filterValue,
  onFilterValue,
  onSort,
}: {
  label: string;
  active: ListSortDir | null;
  filterOptions: string[];
  filterValue: string;
  onFilterValue: (value: string) => void;
  onSort: (dir: ListSortDir | null) => void;
}) {
  const marked = Boolean(active || filterValue);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Filter ${label}`}
        data-list-col-filter=""
        data-sorted={active ?? undefined}
        data-filtered={filterValue || undefined}
        className={cn(
          "inline-flex size-6 shrink-0 items-center justify-center rounded-md border-0 p-0",
          marked
            ? "bg-navy/15 text-navy ring-1 ring-navy/40 hover:bg-navy/20"
            : "bg-transparent text-muted-foreground hover:bg-muted hover:text-navy",
        )}
      >
        <FunnelIcon active={marked} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[4.25rem] p-0.5">
        <DropdownMenuItem
          data-sort-dir="asc"
          data-selected={active === "asc" ? "true" : undefined}
          onClick={() => onSort("asc")}
          className={cn(
            "justify-center px-2 py-1 text-[11px] font-semibold uppercase tracking-wide",
            active === "asc" && "bg-secondary text-navy",
          )}
        >
          ASC
        </DropdownMenuItem>
        <DropdownMenuItem
          data-sort-dir="desc"
          data-selected={active === "desc" ? "true" : undefined}
          onClick={() => onSort("desc")}
          className={cn(
            "justify-center px-2 py-1 text-[11px] font-semibold uppercase tracking-wide",
            active === "desc" && "bg-secondary text-navy",
          )}
        >
          DESC
        </DropdownMenuItem>
        {filterOptions.length > 0 ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              data-filter-value=""
              data-selected={!filterValue ? "true" : undefined}
              onClick={() => onFilterValue("")}
              className={cn(
                "px-2 py-1 text-[11px] font-medium",
                !filterValue && "bg-secondary text-navy",
              )}
            >
              All
            </DropdownMenuItem>
            {filterOptions.map((option) => (
              <DropdownMenuItem
                key={option}
                data-filter-value={option}
                data-selected={filterValue === option ? "true" : undefined}
                onClick={() => onFilterValue(option)}
                className={cn(
                  "px-2 py-1 text-[11px] font-medium",
                  filterValue === option && "bg-secondary text-navy",
                )}
              >
                {option}
              </DropdownMenuItem>
            ))}
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function FunnelIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="16"
      height="16"
      aria-hidden
      data-filter-icon={active ? "active" : "idle"}
      className="size-4"
    >
      <path
        d="M2.25 2.4h11.5L9.4 8.05v4.15L6.6 13.7V8.05L2.25 2.4Z"
        fill={active ? "currentColor" : "none"}
        fillOpacity={active ? 0.55 : 0}
        stroke="currentColor"
        strokeWidth="1.45"
        strokeLinejoin="round"
      />
    </svg>
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
