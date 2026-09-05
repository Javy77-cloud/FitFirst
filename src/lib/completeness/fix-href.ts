/** Jump from a missing/CHECK gauge into the Quote Sheet cell that needs a value. */
export function sheetBlankHref(dealId: string, fieldKey: string): string {
  const key = encodeURIComponent(fieldKey);
  return `/deals/${dealId}?tab=quote-sheet&field=${key}#sheet-field-${fieldKey}`;
}

export function sheetFieldDomId(fieldKey: string): string {
  return `sheet-field-${fieldKey}`;
}

export function parseSheetFieldParam(value: string | string[] | undefined): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (Array.isArray(value) && value[0]) return value[0].trim();
  return null;
}
