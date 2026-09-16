"use client";

import { useEffect, useMemo, useState, type PointerEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { fetchListColumnLayout, saveListColumnPrefs } from "@/app/actions/desk-prefs";
import { ColumnsMenu } from "@/components/lists/columns-menu";
import { SheetSettingsMenu } from "@/components/lists/sheet-settings-menu";
import { ColumnSortFilter } from "@/components/lists/funnel-sort";
import { LiveContainsInput } from "@/components/search/live-contains-input";
import { useLiveContainsQuery } from "@/hooks/use-live-contains-query";
import { useClientMounted } from "@/hooks/use-client-mounted";
import { ListPagination } from "@/components/lists/list-pagination";
import { compareSheetValues } from "@/lib/desk/sheet-layout";
import {
  DEFAULT_PAGE_SIZE,
  normalizePageSize,
  pageSizeStorageKey,
  paginateRows,
  type PageSizeOption,
} from "@/lib/lists/pagination";
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
  preferColumnWidths,
  reorderVisibleColumns,
  sanitizeStoredColumnIds,
  saveColumnLayout,
  shownColumns,
  toggleColumnVisibility,
  type ListColumn,
  type ListColumnLayout,
  type ListSort,
  type ListSortDir,
} from "@/lib/list-columns";
import { matchesContains } from "@/lib/search/live-query";
import { sheetAttr, sheetCellProps } from "@/lib/desk/sheet-attr";
import { cn } from "@/lib/utils";
import { useOptionalSelection } from "@/components/developer-hub/list-selection";

export type { ListColumn };

export type ColumnRow = {
  key: string;
  id?: string;
  hay?: string;
  /** Hidden on the default list; still searchable. Used for Lost / parked Nurture. */
  parked?: boolean;
  /** Full-width group banner (Tasks Group by). Not selectable; shares one table widths. */
  groupHeader?: string;
  cells: Record<string, ReactNode>;
  /** Optional explicit sort keys. Falls back to rendered text. */
  sort?: Record<string, string | number | null | undefined>;
};

export function cellSortText(value: ReactNode): string {
  if (value == null || typeof value === "boolean") return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(cellSortText).filter(Boolean).join(" ");
  // Do not walk React trees. RSC-passed components (TagChips, StagePill, …) have no
  // children on the server and expanded host children on the client — that mismatch
  // used to stamp data-sort="" in SSR HTML and data-sort="High Risk" after hydrate.
  return "";
}

export function rowSortValue(row: ColumnRow, columnId: string): string {
  if (row.sort && Object.prototype.hasOwnProperty.call(row.sort, columnId)) {
    return sheetAttr(row.sort[columnId]);
  }
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
  showListChrome = true,
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
  /** Grouped lists: only the first table should own Columns / ⋯ Settings chrome. */
  showListChrome?: boolean;
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
  // prefsColumns = user-saved order (may include unknown keys). visible = display merge.
  // Width/sort persists must write prefsColumns — never the growth-merged display list.
  const [prefsColumns, setPrefsColumns] = useState<string[] | null>(() =>
    sanitizeStoredColumnIds(initialVisible),
  );
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
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSizeOption>(DEFAULT_PAGE_SIZE);
  const [draftWidths, setDraftWidths] = useState<Record<string, number> | null>(null);
  const appliedWidths = draftWidths ?? widths;
  const colKey = columns.map((column) => column.id).join(",");
  const initialKey = `${initialVisible?.join(",") ?? ""}|${JSON.stringify(initialWidths ?? {})}|${initialSort?.key ?? ""}:${initialSort?.dir ?? ""}`;

  useEffect(() => {
    const local = loadColumnLayout(moduleId, columns);
    if (initialVisible) {
      const raw = sanitizeStoredColumnIds(initialVisible) ?? initialVisible;
      const merged = mergeVisibleColumns(columns, raw);
      // Local drag widths stick; fill gaps from desk prefs (empty server must not wipe).
      const nextWidths = preferColumnWidths(columns, local.widths, initialWidths ?? {});
      const nextSort = parseListSort(initialSort) ?? local.sort;
      setPrefsColumns(sanitizeStoredColumnIds(raw));
      setVisible(merged);
      setWidths(nextWidths);
      setSort(nextSort);
      // Cache RAW user prefs locally — not the growth-merged display order.
      saveColumnLayout(moduleId, { columns: raw, widths: nextWidths, sort: nextSort });
      return;
    }
    setVisible(local.columns);
    setWidths(local.widths);
    setSort(local.sort);
    let cancelled = false;
    void fetchListColumnLayout(moduleId).then((stored) => {
      if (cancelled || !stored) return;
      const latestLocal = loadColumnLayout(moduleId, columns);
      const raw =
        sanitizeStoredColumnIds(stored.columns) ??
        sanitizeStoredColumnIds(latestLocal.columns) ??
        latestLocal.columns;
      const merged = mergeVisibleColumns(columns, raw);
      const nextWidths = preferColumnWidths(columns, latestLocal.widths, stored.widths);
      const nextSort = parseListSort(stored.sort) ?? latestLocal.sort;
      setPrefsColumns(sanitizeStoredColumnIds(raw));
      setVisible(merged);
      setWidths(nextWidths);
      setSort(nextSort);
      saveColumnLayout(moduleId, { columns: raw, widths: nextWidths, sort: nextSort });
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
      if (row.groupHeader) return true;
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
    const hasGroups = filteredRows.some((row) => row.groupHeader);
    if (!sort || !sortColumn || isLiveSearchColumn(sortColumn)) return filteredRows;
    if (!hasGroups) {
      return [...filteredRows].sort((a, b) => {
        const cmp = compareSheetValues(rowSortValue(a, sort.key), rowSortValue(b, sort.key));
        return sort.dir === "asc" ? cmp : -cmp;
      });
    }
    // Keep group banners fixed; sort only the data rows inside each section.
    const out: ColumnRow[] = [];
    let bucket: ColumnRow[] = [];
    function flush() {
      bucket.sort((a, b) => {
        const cmp = compareSheetValues(rowSortValue(a, sort!.key), rowSortValue(b, sort!.key));
        return sort!.dir === "asc" ? cmp : -cmp;
      });
      out.push(...bucket);
      bucket = [];
    }
    for (const row of filteredRows) {
      if (row.groupHeader) {
        flush();
        out.push(row);
      } else {
        bucket.push(row);
      }
    }
    flush();
    return out;
  }, [filteredRows, shown, sort]);
  const paged = useMemo(() => paginateRows(sortedRows, page, pageSize), [sortedRows, page, pageSize]);

  useEffect(() => {
    try {
      setPageSize(normalizePageSize(window.localStorage.getItem(pageSizeStorageKey(moduleId))));
    } catch {
      // private mode
    }
  }, [moduleId]);

  useEffect(() => {
    setPage(1);
  }, [liveQuery, moduleId, sort?.key, sort?.dir, JSON.stringify(valueFilters)]);

  useEffect(() => {
    if (page !== paged.page) setPage(paged.page);
  }, [page, paged.page]);

  function persist(next: ListColumnLayout) {
    const savedColumns = sanitizeStoredColumnIds(next.columns) ?? next.columns;
    setPrefsColumns(savedColumns);
    setVisible(mergeVisibleColumns(columns, savedColumns));
    setWidths(next.widths);
    setSort(next.sort);
    saveColumnLayout(moduleId, { ...next, columns: savedColumns });
    void saveListColumnPrefs(moduleId, savedColumns, { widths: next.widths, sort: next.sort });
  }

  /** Width/sort-only: never replace the saved column order with the growth-merged display list. */
  function persistMeta(patch: { widths?: Record<string, number>; sort?: ListSort | null }) {
    const savedColumns = prefsColumns ?? sanitizeStoredColumnIds(visible) ?? visible;
    const nextWidths = patch.widths ?? widths;
    const nextSort = patch.sort === undefined ? sort : patch.sort;
    setWidths(nextWidths);
    setSort(nextSort);
    saveColumnLayout(moduleId, { columns: savedColumns, widths: nextWidths, sort: nextSort });
    void saveListColumnPrefs(moduleId, savedColumns, { widths: nextWidths, sort: nextSort });
  }

  function persistPartial(patch: Partial<ListColumnLayout>) {
    if (patch.columns) {
      persist({
        columns: patch.columns,
        widths: patch.widths ?? widths,
        sort: patch.sort === undefined ? sort : patch.sort,
      });
      return;
    }
    persistMeta({
      widths: patch.widths,
      sort: patch.sort,
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
    const next = { ...widths, [id]: clampColumnWidth(px, id) };
    if (commit) {
      setDraftWidths(null);
      persistPartial({ widths: next });
      return;
    }
    setDraftWidths(next);
  }

  const visibleIds = paged.slice.map((row) => row.id ?? row.key);
  const matchingIds = sortedRows.filter((row) => !row.groupHeader).map((row) => row.id ?? row.key);
  const selection = useOptionalSelection();
  const selectedSet = useMemo(
    () => new Set(selection?.selected ?? []),
    [selection?.selected],
  );

  function onPageSize(next: PageSizeOption) {
    setPageSize(next);
    setPage(1);
    try {
      window.localStorage.setItem(pageSizeStorageKey(moduleId), String(next));
    } catch {
      // private mode
    }
  }

  const chrome = (
    <>
      <SheetSettingsMenu moduleId={queryModule} />
      <ColumnsMenu
        columns={columns}
        visible={visible}
        onToggle={toggle}
        onReorder={reorder}
        onReset={reset}
      />
    </>
  );

  const columnPixelWidths = shown.map((column) => ({
    id: column.id,
    width: appliedWidths[column.id] ?? defaultColumnWidth(column),
  }));
  const tableWidth = columnPixelWidths.reduce((sum, column) => sum + column.width, 0);

  return (
    <div className="overflow-x-auto">
      <ListScopeReporter visibleIds={visibleIds} matchingIds={matchingIds} />
      <ListVisibleColumnsReporter columns={columns} visible={visible} />
      {showListChrome ? <ListColumnsChrome>{chrome}</ListColumnsChrome> : null}
      <table className="ff-table ff-list-table" style={{ width: tableWidth, minWidth: tableWidth }}>
        <colgroup>
          {columnPixelWidths.map((column) => (
            <col
              key={column.id}
              style={{ width: column.width, minWidth: column.width }}
            />
          ))}
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
          </tr>
        </thead>
        <tbody>
          {sortedRows.length === 0 ? (
            <tr>
              <td colSpan={Math.max(shown.length, 1)} className="text-muted-foreground">
                {liveQuery.trim()
                  ? `No records containing “${liveQuery.trim()}”.`
                  : (empty ?? "No records.")}
              </td>
            </tr>
          ) : (
            paged.slice.map((row) => {
              if (row.groupHeader) {
                const sep = row.groupHeader.lastIndexOf(" · ");
                const groupLabel = sep >= 0 ? row.groupHeader.slice(0, sep) : row.groupHeader;
                const groupCount = sep >= 0 ? row.groupHeader.slice(sep + 3) : null;
                return (
                  <tr key={row.key} data-ff-list-group-header={row.groupHeader}>
                    <td
                      colSpan={Math.max(shown.length, 1)}
                      className="border-b border-navy/15 bg-muted/40 px-3 py-2.5 text-navy"
                    >
                      <span className="inline-flex items-center gap-2">
                        <span className="text-base font-semibold tracking-normal">{groupLabel}</span>
                        {groupCount != null && groupCount !== "" ? (
                          <span className="rounded-full bg-navy/10 px-2 py-0.5 text-xs font-medium tabular-nums text-navy">
                            {groupCount}
                          </span>
                        ) : null}
                      </span>
                    </td>
                  </tr>
                );
              }
              const rowId = row.id ?? row.key;
              const isSelected = selectedSet.has(rowId);
              return (
              <tr
                key={row.key}
                id={row.id}
                className={isSelected ? "ff-row-selected" : undefined}
                data-ff-row-selected={isSelected ? "true" : undefined}
              >
                {shown.map((column) => (
                  <td
                    key={column.id}
                    data-sheet-col={column.id}
                    data-sort={sheetAttr(rowSortValue(row, column.id))}
                    {...sheetCellProps(moduleId, rowSortValue(row, column.id))}
                  >
                    <div className="ff-list-cell">{row.cells[column.id]}</div>
                  </td>
                ))}
              </tr>
              );
            })
          )}
        </tbody>
      </table>
      <ListPagination
        page={paged.page}
        totalPages={paged.totalPages}
        start={paged.start}
        end={paged.end}
        total={paged.total}
        pageSize={paged.pageSize}
        onPage={setPage}
        onPageSize={onPageSize}
      />
    </div>
  );
}

/** Prefer the list mass-bar chrome slot (Columns / ⋯); else a row above the table. */
function ListColumnsChrome({ children }: { children: ReactNode }) {
  const mounted = useClientMounted();
  const inListBar = useOptionalSelection() != null;
  const [host, setHost] = useState<Element | null>(null);

  useEffect(() => {
    setHost(document.querySelector("[data-ff-list-chrome]"));
  }, []);

  if (host) {
    return createPortal(children, host);
  }

  // Mass-bar host will appear — avoid flashing a second Columns row above the table.
  if (inListBar || !mounted) {
    return null;
  }

  return (
    <div className="mb-2 flex justify-end gap-1 print:hidden" data-ff-list-chrome-fallback="">
      {children}
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
            placeholder={`Search ${headerText}…`}
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
  function onPointerDown(event: PointerEvent<HTMLSpanElement>) {
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const startW = currentWidth;
    const pointerId = event.pointerId;
    document.body.dataset.ffColResize = "1";
    try {
      event.currentTarget.setPointerCapture(pointerId);
    } catch {
      /* capture is optional — document listeners still drive the drag */
    }

    function widthFrom(clientX: number, commit: boolean) {
      onWidth(columnId, startW + (clientX - startX), commit);
    }
    function onMove(moveEvent: globalThis.PointerEvent) {
      widthFrom(moveEvent.clientX, false);
    }
    function onUp(upEvent: globalThis.PointerEvent) {
      widthFrom(upEvent.clientX, true);
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onUp);
      delete document.body.dataset.ffColResize;
    }
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    document.addEventListener("pointercancel", onUp);
  }

  return (
    <span
      role="separator"
      aria-orientation="vertical"
      aria-label={`Resize ${columnId} column`}
      data-resize-edge={edge}
      data-ff-col-resize={columnId}
      onPointerDown={onPointerDown}
      className={cn("ff-col-resize", edge === "left" ? "ff-col-resize-left" : "ff-col-resize-right")}
    />
  );
}

function ListScopeReporter({
  visibleIds,
  matchingIds,
}: {
  visibleIds: string[];
  matchingIds: string[];
}) {
  const selection = useOptionalSelection();
  useEffect(() => {
    selection?.setScope(visibleIds, matchingIds);
  }, [matchingIds, selection, visibleIds]);
  return null;
}

/** Keep Mass Update field menu in sync with Columns picker visibility. */
function ListVisibleColumnsReporter({
  columns,
  visible,
}: {
  columns: ListColumn[];
  visible: string[];
}) {
  const selection = useOptionalSelection();
  useEffect(() => {
    selection?.setVisibleColumns(columns, visible);
  }, [columns, selection, visible]);
  return null;
}
