import { loadListColumnLayout } from "@/lib/desk/column-prefs";
import { mergeColumnWidths, mergeVisibleColumns, type ListColumn } from "@/lib/list-columns";
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
}: {
  moduleId: string;
  searchModuleId?: string;
  initialQuery?: string;
  columns: ListColumn[];
  rows: ColumnRow[];
  empty?: ReactNode;
  defaultSort?: { key: string; dir: "asc" | "desc" } | null;
}) {
  const stored = await loadListColumnLayout(moduleId);
  const initialVisible = stored?.columns ? mergeVisibleColumns(columns, stored.columns) : undefined;
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
    />
  );
}
