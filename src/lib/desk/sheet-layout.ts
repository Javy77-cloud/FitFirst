export type SortDir = "asc" | "desc";

export type SheetSort = {
  key: string;
  dir: SortDir;
};

export type SheetLayout = {
  sort: SheetSort | null;
  pinned: string[];
};

export const EMPTY_SHEET_LAYOUT: SheetLayout = Object.freeze({
  sort: null,
  pinned: [],
});

const ISO_DATE = /^\d{4}-\d{2}-\d{2}(?:[T\s].*)?$/;
const US_DATE = /^(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2}, \d{4}/i;

export function emptySheetLayout(): SheetLayout {
  return EMPTY_SHEET_LAYOUT;
}

export function parseSheetLayout(raw: string | null | undefined): SheetLayout {
  if (!raw?.trim()) return EMPTY_SHEET_LAYOUT;
  try {
    if (raw.trim().startsWith("{")) {
      const parsed = JSON.parse(raw) as Partial<SheetLayout>;
      return normalizeLayout(parsed);
    }
    const params = new URLSearchParams(raw);
    const sortRaw = params.get("sort");
    let sort: SheetSort | null = null;
    if (sortRaw) {
      const [key, dir] = sortRaw.split(":");
      if (key && (dir === "asc" || dir === "desc")) sort = { key, dir };
    }
    const pinned = (params.get("pin") ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    if (!sort && pinned.length === 0) return EMPTY_SHEET_LAYOUT;
    return { sort, pinned };
  } catch {
    return EMPTY_SHEET_LAYOUT;
  }
}

export function serializeSheetLayout(layout: SheetLayout): string {
  const params = new URLSearchParams();
  if (layout.sort) params.set("sort", `${layout.sort.key}:${layout.sort.dir}`);
  if (layout.pinned.length) params.set("pin", layout.pinned.join(","));
  return params.toString();
}

export function normalizeLayout(input: Partial<SheetLayout> | null | undefined): SheetLayout {
  const sort =
    input?.sort &&
    typeof input.sort.key === "string" &&
    input.sort.key &&
    (input.sort.dir === "asc" || input.sort.dir === "desc")
      ? { key: input.sort.key, dir: input.sort.dir }
      : null;
  const pinned = Array.isArray(input?.pinned)
    ? input.pinned.filter((key): key is string => typeof key === "string" && key.length > 0)
    : [];
  if (!sort && pinned.length === 0) return EMPTY_SHEET_LAYOUT;
  return { sort, pinned };
}

export function cycleSheetSort(current: SheetSort | null, key: string): SheetSort | null {
  if (!current || current.key !== key) return { key, dir: "asc" };
  if (current.dir === "asc") return { key, dir: "desc" };
  return null;
}

export function togglePinnedColumns(pinned: string[], key: string): string[] {
  return pinned.includes(key) ? pinned.filter((item) => item !== key) : [...pinned, key];
}

export function normalizeSheetCell(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .replace(/^—$|^–$|^-$|^n\/a$/i, "")
    .trim();
}

export function compareSheetValues(a: string, b: string): number {
  const left = normalizeSheetCell(a);
  const right = normalizeSheetCell(b);
  if (left === "" && right === "") return 0;
  if (left === "") return 1;
  if (right === "") return -1;

  const leftNum = parseSheetNumber(left);
  const rightNum = parseSheetNumber(right);
  if (leftNum != null && rightNum != null) {
    if (leftNum < rightNum) return -1;
    if (leftNum > rightNum) return 1;
    return 0;
  }

  const leftDate = parseSheetDate(left);
  const rightDate = parseSheetDate(right);
  if (leftDate != null && rightDate != null) {
    if (leftDate < rightDate) return -1;
    if (leftDate > rightDate) return 1;
    return 0;
  }

  return left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" });
}

export function sortSheetRows<T>(
  rows: T[],
  getValue: (row: T, key: string) => string,
  sort: SheetSort | null,
): T[] {
  if (!sort) return rows;
  return [...rows].sort((a, b) => {
    const cmp = compareSheetValues(getValue(a, sort.key), getValue(b, sort.key));
    return sort.dir === "asc" ? cmp : -cmp;
  });
}

function parseSheetNumber(value: string): number | null {
  const cleaned = value.replace(/[$,%\s]/g, "");
  if (!/^-?\d+(?:\.\d+)?$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function parseSheetDate(value: string): number | null {
  if (!ISO_DATE.test(value) && !US_DATE.test(value)) return null;
  const t = Date.parse(value);
  return Number.isNaN(t) ? null : t;
}
