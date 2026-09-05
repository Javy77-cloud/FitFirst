import { TABLE_COLUMNS, type ColumnDef } from "@/lib/desk/columns";
import { PIPELINE_FIELDS } from "@/lib/wire/pipeline";

export type ListColumn = {
  id: string;
  label: string;
  /** Always shown — typically the name / primary link. */
  locked?: boolean;
  /** When false, hidden until the user turns it on. Default true. */
  defaultOn?: boolean;
};

export const COLUMN_STORAGE_PREFIX = "ff-list-columns:v1";

export function columnStorageKey(moduleId: string): string {
  return `${COLUMN_STORAGE_PREFIX}:${moduleId}`;
}

export function allColumnIds(columns: ListColumn[]): string[] {
  return columns.map((column) => column.id);
}

export function defaultVisibleIds(columns: ListColumn[]): string[] {
  return columns
    .filter((column) => column.locked || column.defaultOn !== false)
    .map((column) => column.id);
}

export function fromDeskColumns(
  defs: ColumnDef[],
  opts?: { pick?: boolean; lock?: string[] },
): ListColumn[] {
  const lock = new Set(opts?.lock ?? []);
  const cols = defs.map((def) => ({
    id: def.key,
    label: def.label,
    locked: lock.has(def.key),
    defaultOn: def.defaultOn,
  }));
  return opts?.pick ? [{ id: "pick", label: "", locked: true }, ...cols] : cols;
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
  { id: "source", label: "Source" },
  { id: "lifetime", label: "Lifetime" },
  { id: "inForce", label: "In-force" },
];

export const DEALS_LIST_COLUMNS: ListColumn[] = fromDeskColumns(TABLE_COLUMNS.deals ?? [], {
  pick: true,
  lock: ["title", "esign"],
});

export const ACCOUNTS_LIST_COLUMNS: ListColumn[] = [
  { id: "pick", label: "", locked: true },
  { id: "business", label: "Business", locked: true },
  { id: "status", label: "Status" },
  { id: "lifetime", label: "Lifetime" },
  { id: "inForce", label: "In-force" },
];

export const POLICIES_LIST_COLUMNS: ListColumn[] = [
  { id: "pick", label: "", locked: true },
  { id: "policy", label: "Policy", locked: true },
  { id: "status", label: "Status" },
  { id: "party", label: "Party" },
  { id: "carrier", label: "Carrier" },
  { id: "premium", label: "Premium" },
  { id: "expires", label: "Expires" },
  { id: "esign", label: "E-sign", locked: true },
];

export const CARRIERS_LIST_COLUMNS: ListColumn[] = [
  { id: "pick", label: "", locked: true },
  { id: "carrier", label: "Carrier", locked: true },
  { id: "portal", label: "Portal" },
  { id: "covA", label: "Cov A" },
  { id: "rules", label: "Roof / coast / mobile" },
  { id: "dontWrite", label: "Don't write" },
];

export const TASKS_LIST_COLUMNS: ListColumn[] = [
  { id: "pick", label: "", locked: true },
  { id: "task", label: "Task", locked: true },
  { id: "due", label: "Due" },
  { id: "status", label: "Status" },
];

export const QUOTES_LIST_COLUMNS: ListColumn[] = [
  { id: "rank", label: "Rank" },
  { id: "carrier", label: "Carrier", locked: true },
  { id: "line", label: "Line" },
  { id: "status", label: "Status" },
  { id: "premium", label: "Premium" },
  { id: "quoteNumber", label: "Quote #" },
  { id: "date", label: "Date" },
  { id: "links", label: "Links" },
];

export const CLAIMS_LIST_COLUMNS: ListColumn[] = [
  { id: "reported", label: "Reported", locked: true },
  { id: "policy", label: "Policy" },
  { id: "why", label: "Why" },
  { id: "how", label: "How" },
  { id: "carrier", label: "Carrier #" },
  { id: "status", label: "Status" },
];

export const PIPELINE_LIST_COLUMNS: ListColumn[] = [
  ...PIPELINE_FIELDS.map((field) => ({
    id: field.id,
    label: field.label,
    locked: Boolean(field.required),
    defaultOn: field.defaultOn,
  })),
  { id: "actions", label: "Call / SMS / Task / Meeting", locked: true },
];

export const GLANCE_LIST_COLUMNS: ListColumn[] = fromDeskColumns(TABLE_COLUMNS.glance ?? [], {
  lock: ["record"],
});

export const MERGE_LIST_COLUMNS: ListColumn[] = fromDeskColumns(TABLE_COLUMNS.merge ?? [], {
  lock: ["pair", "action"],
});

export const REVIEWS_EXPIRING_COLUMNS: ListColumn[] = [
  { id: "policy", label: "Policy", locked: true },
  { id: "client", label: "Insured / contact name" },
  { id: "expires", label: "Expires" },
];

export const COMMISSIONS_LIST_COLUMNS: ListColumn[] = [
  { id: "policy", label: "Policy", locked: true },
  { id: "type", label: "Type" },
  { id: "subtype", label: "Subtype" },
  { id: "producer", label: "Producer" },
  { id: "status", label: "Status" },
  { id: "amount", label: "Amount" },
  { id: "date", label: "Date" },
];

export const WORK_QUEUE_FLAGS_COLUMNS: ListColumn[] = [
  { id: "policy", label: "Policy", locked: true },
  { id: "assignee", label: "Assignee" },
  { id: "status", label: "Work status" },
  { id: "flags", label: "Flags" },
  { id: "note", label: "Latest note" },
  { id: "ping", label: "In-app ping" },
];

export const WORK_QUEUE_ATTENTION_COLUMNS: ListColumn[] = [
  { id: "kind", label: "Kind" },
  { id: "item", label: "Item", locked: true },
  { id: "detail", label: "Detail" },
];

export const WORK_QUEUE_POLICIES_COLUMNS: ListColumn[] = [
  { id: "policy", label: "Policy", locked: true },
  { id: "status", label: "Status" },
  { id: "party", label: "Party" },
  { id: "expires", label: "Expires" },
];
