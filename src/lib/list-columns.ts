export type ListColumn = {
  id: string;
  label: string;
  /** Always shown — typically the name / primary link. */
  locked?: boolean;
};

export const COLUMN_STORAGE_PREFIX = "ff-list-columns:v1";

export function columnStorageKey(moduleId: string): string {
  return `${COLUMN_STORAGE_PREFIX}:${moduleId}`;
}

export function defaultVisibleIds(columns: ListColumn[]): string[] {
  return columns.map((column) => column.id);
}

export function mergeVisibleColumns(
  columns: ListColumn[],
  stored: unknown,
): string[] {
  const defaults = defaultVisibleIds(columns);
  const locked = columns.filter((column) => column.locked).map((column) => column.id);
  const allowed = new Set(defaults);
  if (!Array.isArray(stored)) return defaults;
  const visible = stored.filter(
    (id): id is string => typeof id === "string" && allowed.has(id),
  );
  const missingLocked = locked.filter((id) => !visible.includes(id));
  const next = missingLocked.length ? [...missingLocked, ...visible] : visible;
  return next.length ? next : defaults;
}

export function loadVisibleColumns(
  moduleId: string,
  columns: ListColumn[],
): string[] {
  const defaults = defaultVisibleIds(columns);
  if (typeof window === "undefined") return defaults;
  try {
    const raw = window.localStorage.getItem(columnStorageKey(moduleId));
    if (!raw) return defaults;
    return mergeVisibleColumns(columns, JSON.parse(raw));
  } catch {
    return defaults;
  }
}

export function saveVisibleColumns(moduleId: string, ids: string[]) {
  try {
    window.localStorage.setItem(columnStorageKey(moduleId), JSON.stringify(ids));
  } catch {
    /* ignore quota / private mode */
  }
}

export function toggleColumnVisibility(
  columns: ListColumn[],
  visible: string[],
  id: string,
): string[] {
  const column = columns.find((item) => item.id === id);
  if (!column || column.locked) return visible;
  if (visible.includes(id)) {
    const next = visible.filter((value) => value !== id);
    return next.length ? next : visible;
  }
  const order = columns.map((item) => item.id);
  return order.filter((columnId) => columnId === id || visible.includes(columnId));
}

export function shownColumns(columns: ListColumn[], visible: string[]): ListColumn[] {
  return columns.filter((column) => visible.includes(column.id));
}

/** Accessible name for the manage-columns checkbox (empty labels are invalid). */
export function columnMenuLabel(column: ListColumn): string {
  return column.label.trim() || "Select";
}

export const LEADS_LIST_COLUMNS: ListColumn[] = [
  { id: "pick", label: "", locked: true },
  { id: "name", label: "Name", locked: true },
  { id: "status", label: "Status" },
  { id: "source", label: "Source" },
  { id: "shop", label: "Shop" },
];

export const CONTACTS_LIST_COLUMNS: ListColumn[] = [
  { id: "pick", label: "", locked: true },
  { id: "name", label: "Name", locked: true },
  { id: "status", label: "Status" },
  { id: "lifetime", label: "Lifetime" },
  { id: "inForce", label: "In-force" },
];
