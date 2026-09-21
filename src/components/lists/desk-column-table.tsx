import "server-only";

import { loadListColumnLayout } from "@/lib/desk/column-prefs";
import {
  insertMissingColumnIds,
  mergeColumnWidths,
  sanitizeStoredColumnIds,
  type ListColumn,
} from "@/lib/list-columns";
import { ColumnTable, type ColumnRow } from "@/components/lists/column-table";
import type { ReactNode } from "react";

export async function DeskColumnTable({
  moduleId,
  searchModuleId,
  initialQuery,
  columns,
  rows,
  empty,
  defaultSort,
  showListChrome = true,
  pinVisibleIds,
}: {
  moduleId: string;
  searchModuleId?: string;
  initialQuery?: string;
  columns: ListColumn[];
  rows: ColumnRow[];
  empty?: ReactNode;
  defaultSort?: { key: string; dir: "asc" | "desc" } | null;
  showListChrome?: boolean;
  /** Columns that must stay on an existing saved layout (do not apply when prefs are empty). */
  pinVisibleIds?: string[];
}) {
  const stored = await loadListColumnLayout(moduleId);
  // Pass RAW saved ids (including unknowns). Pre-merging here used to drop custom
  // picklist keys, collapse deals to the locked shell, then persist wiped defaults.
  const storedIds = sanitizeStoredColumnIds(stored?.columns);
  const initialVisible =
    storedIds && storedIds.length && pinVisibleIds?.length
      ? insertMissingColumnIds(storedIds, pinVisibleIds)
      : storedIds ?? undefined;
  const initialWidths = stored ? mergeColumnWidths(columns, stored.widths) : undefined;
  return (
    <ColumnTable
      moduleId={moduleId}
      searchModuleId={searchModuleId}
      initialQuery={initialQuery}
      columns={columns}
      rows={rows}
      empty={empty}
      initialVisible={initialVisible}
      initialWidths={initialWidths}
      initialSort={stored?.sort ?? defaultSort ?? null}
      showListChrome={showListChrome}
    />
  );
}
