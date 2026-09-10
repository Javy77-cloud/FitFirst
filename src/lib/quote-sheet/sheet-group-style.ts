/** Master-sheet section headers: Old Glory blue + white text. */

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

/** US flag blue (#002868) — matches platform theme tokens. */
export const SHEET_GROUP_HEADER_STYLE = {
  backgroundColor: "#002868",
  color: "#ffffff",
} as const;

export function sheetGroupHeaderClass(_title?: string | null): string {
  return "ff-sheet-group-header";
}
