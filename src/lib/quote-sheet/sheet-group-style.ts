/** Master-sheet section headers: soft navy + white text (quieter than flag #002868). */

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

/** Soft navy (#2a5688) — a couple shades off flag blue so headers aren’t eye-catchy. */
export const SHEET_GROUP_HEADER_STYLE = {
  backgroundColor: "#2a5688",
  color: "#ffffff",
} as const;

export function sheetGroupHeaderClass(_title?: string | null): string {
  return "ff-sheet-group-header";
}
