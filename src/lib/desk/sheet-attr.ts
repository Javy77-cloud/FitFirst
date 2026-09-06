/** Stable string attrs for list/sheet cells. Never null — empty string when missing. */
export function sheetAttr(value: string | number | boolean | null | undefined): string {
  if (value == null) return "";
  return String(value);
}

export function sheetCellProps(
  moduleId: string,
  sortValue: string | number | null | undefined,
): Record<string, string> {
  if (moduleId !== "deals" && moduleId !== "pipeline") return {};
  const sort = sheetAttr(sortValue);
  return {
    "data-sheet-cell": sort,
    "data-sheet-table-tax": "",
  };
}
