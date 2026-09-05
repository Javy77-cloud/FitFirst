import { loadListColumnPrefs } from "@/lib/desk/column-prefs";
import { mergeVisibleColumns, type ListColumn } from "@/lib/list-columns";
import { ColumnTable, type ColumnRow } from "@/components/lists/column-table";
import type { ReactNode } from "react";

export async function DeskColumnTable({
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
  const stored = await loadListColumnPrefs(moduleId);
  const initialVisible = stored ? mergeVisibleColumns(columns, stored) : undefined;
  return (
    <ColumnTable
      moduleId={moduleId}
      columns={columns}
      rows={rows}
      empty={empty}
      initialVisible={initialVisible}
    />
  );
}
