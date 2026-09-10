/** Master-sheet section headers: black letters on white (all groups). */

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

/** Every master-sheet section bar is black on white. */
export function sheetGroupHeaderClass(_title?: string | null): string {
  return "ff-sheet-group-header";
}
