type SheetCell = { value: string; status: string; source?: string };

export function shopSectionOpen(
  shop: { quotedCount: number; declinedCount: number; boundCount: number },
  focusedDeal = false,
): boolean {
  if (focusedDeal) return true;
  return shop.quotedCount > 0 || shop.declinedCount > 0 || shop.boundCount > 0;
}

export function sheetGroupNeedsAttention(
  fields: Array<{ key: string }>,
  values: Record<string, SheetCell | undefined> | null,
): boolean {
  const sheet = values ?? {};
  return fields.some((field) => {
    const cell = sheet[field.key];
    if (!cell) return true;
    if (cell.status === "missing" || cell.status === "check") return true;
    return cell.value.trim() === "";
  });
}

export function sheetGroupSummary(
  fields: Array<{ key: string }>,
  values: Record<string, SheetCell | undefined> | null,
): string {
  const sheet = values ?? {};
  let missing = 0;
  let check = 0;
  let confirmed = 0;
  for (const field of fields) {
    const cell = sheet[field.key];
    if (!cell || cell.status === "missing" || cell.value.trim() === "") missing += 1;
    else if (cell.status === "check") check += 1;
    else confirmed += 1;
  }
  return `${missing} missing · ${check} CHECK · ${confirmed} confirmed`;
}
