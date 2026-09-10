/** Master-sheet section header emphasis (Roof / Wind / 4-point / Dwelling). */

export function isEmphasizedSheetGroup(title: string | null | undefined): boolean {
  const key = String(title ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_/·]+/g, " ");
  if (!key) return false;
  return (
    /\broof\b/.test(key) ||
    /\bwind\b/.test(key) ||
    /\b4[- ]?point\b/.test(key) ||
    /\bfour[- ]?point\b/.test(key) ||
    /\bdwelling\b/.test(key)
  );
}

export function sheetGroupHeaderClass(title: string | null | undefined): string {
  return isEmphasizedSheetGroup(title)
    ? "ff-sheet-group-header ff-sheet-group-header--emphasis"
    : "ff-sheet-group-header";
}
