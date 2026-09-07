import { dealsColumnsFromFields } from "@/lib/deals/deal-columns";
import { normalizeDealsVisibleColumns, TABLE_COLUMNS, type ColumnDef } from "@/lib/desk/columns";
import type { CustomFieldDef } from "@/lib/custom-fields/types";
import { CORE_FIELDS } from "@/lib/custom-fields/defaults";
import { PIPELINE_FIELDS } from "@/lib/wire/pipeline";

export type ListColumn = {
  id: string;
  label: string;
  /** Always shown — typically the name / primary link. */
  locked?: boolean;
  /** When false, hidden until the user turns it on. Default true. */
  defaultOn?: boolean;
  /** Platform starting width. Per-user drag-resize overrides and persists. */
  defaultWidth?: number;
  /** Live typeahead instead of the ASC/DESC funnel. Deal name on the deals list. */
  liveSearch?: boolean;
};

export type ListSortDir = "asc" | "desc";
export type ListSort = { key: string; dir: ListSortDir };

export type ListColumnLayout = {
  columns: string[];
  widths: Record<string, number>;
  sort: ListSort | null;
};

export const COLUMN_STORAGE_PREFIX = "ff-list-columns:v1";
export const MIN_COLUMN_WIDTH = 56;
export const MAX_COLUMN_WIDTH = 720;
export const DEFAULT_COLUMN_WIDTH = 148;

export function columnStorageKey(moduleId: string): string {
  return `${COLUMN_STORAGE_PREFIX}:${moduleId}`;
}

export function allColumnIds(columns: ListColumn[]): string[] {
  return columns.map((column) => column.id);
}

function isDealsListColumns(columns: ListColumn[]): boolean {
  return (
    columns.some((column) => column.id === "title" && column.label === "Deal") &&
    columns.some((column) => column.id === "stage")
  );
}

export function defaultVisibleIds(columns: ListColumn[]): string[] {
  const ids = columns
    .filter((column) => column.locked || column.defaultOn !== false)
    .map((column) => column.id);
  return isDealsListColumns(columns) ? normalizeDealsVisibleColumns(ids) : ids;
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
  const allowed = new Set(allColumnIds(columns));
  if (!Array.isArray(stored)) return defaults;
  const visible = stored.filter(
    (id): id is string => typeof id === "string" && allowed.has(id),
  );
  const missingLocked = locked.filter((id) => !visible.includes(id));
  const next = missingLocked.length ? [...missingLocked, ...visible] : visible;
  const result = next.length ? next : defaults;
  return isDealsListColumns(columns) ? normalizeDealsVisibleColumns(result) : result;
}

export function clampColumnWidth(px: number): number {
  if (!Number.isFinite(px)) return DEFAULT_COLUMN_WIDTH;
  return Math.min(MAX_COLUMN_WIDTH, Math.max(MIN_COLUMN_WIDTH, Math.round(px)));
}

export function defaultColumnWidth(column: ListColumn): number {
  if (column.defaultWidth != null) return clampColumnWidth(column.defaultWidth);
  if (column.id === "pick" || !column.label.trim()) return 44;
  if (isLiveSearchColumn(column)) return 260;
  const fromLabel = column.label.trim().length * 9 + 56;
  return clampColumnWidth(Math.max(112, Math.min(220, fromLabel)));
}

export function listSortForColumn(key: string, dir: ListSortDir | null): ListSort | null {
  if (!key || !dir) return null;
  return { key, dir };
}

/** Name (and the Deals list Deal column) is live contains-search — never ASC/DESC. */
export function isLiveSearchColumn(column: Pick<ListColumn, "id" | "label" | "liveSearch">): boolean {
  if (column.liveSearch) return true;
  const label = column.label.trim().toLowerCase();
  if (!label) return false;
  return column.id === "name" || label === "name";
}

export function isListColumnSortable(column: Pick<ListColumn, "id" | "label">): boolean {
  return Boolean(column.label.trim()) && !isLiveSearchColumn(column);
}

/** Pick-list columns (Source) filter from the funnel popover — never print the value in the header. */
export function isValueFilterColumn(column: Pick<ListColumn, "id" | "label">): boolean {
  const label = column.label.trim().toLowerCase();
  if (!label) return false;
  return column.id === "source" || label === "source";
}

export function listColumnHeaderText(column: Pick<ListColumn, "label">): string {
  return column.label.trim();
}

export function mergeColumnWidths(
  columns: ListColumn[],
  stored: unknown,
): Record<string, number> {
  const allowed = new Set(allColumnIds(columns));
  const next: Record<string, number> = {};
  if (!stored || typeof stored !== "object" || Array.isArray(stored)) return next;
  for (const [id, value] of Object.entries(stored as Record<string, unknown>)) {
    if (!allowed.has(id)) continue;
    const n = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(n)) continue;
    next[id] = clampColumnWidth(n);
  }
  return next;
}

export function parseListSort(raw: unknown): ListSort | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const key = "key" in raw && typeof raw.key === "string" ? raw.key.trim() : "";
  const dir = "dir" in raw && (raw.dir === "asc" || raw.dir === "desc") ? raw.dir : null;
  if (!key || !dir) return null;
  return { key, dir };
}

export function cycleListSort(current: ListSort | null, key: string): ListSort | null {
  if (!key) return current;
  if (!current || current.key !== key) return { key, dir: "asc" };
  if (current.dir === "asc") return { key, dir: "desc" };
  return null;
}

export function parseStoredColumnLayout(raw: unknown): {
  columns: unknown;
  widths: unknown;
  sort: unknown;
} {
  if (Array.isArray(raw)) return { columns: raw, widths: {}, sort: null };
  if (!raw || typeof raw !== "object") return { columns: null, widths: {}, sort: null };
  const record = raw as Record<string, unknown>;
  return {
    columns: record.columns ?? record.visible ?? null,
    widths: record.widths ?? {},
    sort: record.sort ?? null,
  };
}

export function loadColumnLayout(moduleId: string, columns: ListColumn[]): ListColumnLayout {
  const defaults = defaultVisibleIds(columns);
  if (typeof window === "undefined") {
    return { columns: defaults, widths: {}, sort: null };
  }
  try {
    const raw = window.localStorage.getItem(columnStorageKey(moduleId));
    if (!raw) return { columns: defaults, widths: {}, sort: null };
    const parsed = parseStoredColumnLayout(JSON.parse(raw));
    return {
      columns: mergeVisibleColumns(columns, parsed.columns),
      widths: mergeColumnWidths(columns, parsed.widths),
      sort: parseListSort(parsed.sort),
    };
  } catch {
    return { columns: defaults, widths: {}, sort: null };
  }
}

export function loadVisibleColumns(
  moduleId: string,
  columns: ListColumn[],
): string[] {
  return loadColumnLayout(moduleId, columns).columns;
}

export function saveColumnLayout(moduleId: string, layout: ListColumnLayout) {
  try {
    window.localStorage.setItem(
      columnStorageKey(moduleId),
      JSON.stringify({
        columns: layout.columns,
        widths: layout.widths,
        sort: layout.sort,
      }),
    );
  } catch {
    /* ignore quota / private mode */
  }
}

export function saveVisibleColumns(moduleId: string, ids: string[]) {
  if (typeof window === "undefined") return;
  const current = loadColumnLayout(moduleId, ids.map((id) => ({ id, label: id })));
  saveColumnLayout(moduleId, { ...current, columns: ids });
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
  return [...visible, id];
}

export function reorderVisibleColumns(visible: string[], fromId: string, toId: string): string[] {
  const from = visible.indexOf(fromId);
  const to = visible.indexOf(toId);
  if (from < 0 || to < 0 || from === to) return visible;
  const next = [...visible];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

export function shownColumns(columns: ListColumn[], visible: string[]): ListColumn[] {
  const byId = new Map(columns.map((column) => [column.id, column]));
  return visible
    .map((id) => byId.get(id))
    .filter((column): column is ListColumn => Boolean(column));
}

/** Accessible name for the manage-columns checkbox (empty labels are invalid). */
export function columnMenuLabel(column: ListColumn): string {
  return column.label.trim() || "Select";
}

/** Roomy Leads starting layout — name + Call/SMS/E-mail, temp chips, follow-up, clock. */
export const LEADS_DEFAULT_WIDTHS = {
  pick: 48,
  name: 340,
  status: 170,
  source: 160,
  timer: 150,
  heat: 210,
  followUp: 200,
  shop: 140,
  tags: 160,
} as const;

export const LEADS_LIST_COLUMNS: ListColumn[] = [
  { id: "pick", label: "", locked: true, defaultWidth: LEADS_DEFAULT_WIDTHS.pick },
  { id: "name", label: "Name", locked: true, defaultWidth: LEADS_DEFAULT_WIDTHS.name },
  { id: "status", label: "Status", defaultWidth: LEADS_DEFAULT_WIDTHS.status },
  { id: "source", label: "Source", defaultWidth: LEADS_DEFAULT_WIDTHS.source },
  { id: "timer", label: "Response", locked: true, defaultWidth: LEADS_DEFAULT_WIDTHS.timer },
  { id: "heat", label: "Temp", defaultWidth: LEADS_DEFAULT_WIDTHS.heat },
  { id: "followUp", label: "Follow-up", defaultWidth: LEADS_DEFAULT_WIDTHS.followUp },
  { id: "shop", label: "Convert", defaultWidth: LEADS_DEFAULT_WIDTHS.shop },
  { id: "tags", label: "Tags", defaultWidth: LEADS_DEFAULT_WIDTHS.tags },
];

export const CONTACTS_LIST_COLUMNS: ListColumn[] = [
  { id: "pick", label: "", locked: true },
  { id: "name", label: "Name", locked: true },
  { id: "status", label: "Status" },
  { id: "source", label: "Source" },
  { id: "lifetime", label: "Lifetime" },
  { id: "inForce", label: "In-force" },
  { id: "tags", label: "Tags" },
];

export function dealsListColumnsFromFields(fields: readonly CustomFieldDef[]): ListColumn[] {
  return fromDeskColumns(dealsColumnsFromFields(fields), {
    pick: true,
    lock: ["title"],
  }).map((column) => (column.id === "title" ? { ...column, liveSearch: true } : column));
}

export const DEALS_LIST_COLUMNS: ListColumn[] = dealsListColumnsFromFields(CORE_FIELDS);

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
  { id: "tags", label: "Tags" },
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

export function labeledColumns(
  items: Array<[id: string, label: string, locked?: boolean]>,
): ListColumn[] {
  return items.map(([id, label, locked]) => ({ id, label, locked: Boolean(locked) }));
}

export const INSPECTIONS_LIST_COLUMNS = labeledColumns([
  ["policy", "Policy", true],
  ["kind", "Kind"],
  ["status", "Status"],
  ["next", "Next step"],
  ["party", "Party"],
  ["when", "When"],
  ["actions", ""],
]);

export const ENDORSEMENTS_LIST_COLUMNS = labeledColumns([
  ["policy", "Policy", true],
  ["form", "Form"],
  ["status", "Status"],
  ["next", "Next step"],
  ["party", "Party"],
  ["effective", "Effective"],
  ["actions", ""],
]);

export const SERVICE_REQUESTS_LIST_COLUMNS = labeledColumns([
  ["policy", "Policy", true],
  ["kind", "Kind"],
  ["status", "Status"],
  ["next", "Next step"],
  ["desk", "Desk"],
  ["party", "Party"],
  ["effective", "Effective"],
  ["actions", ""],
]);

export const NOTICES_LIST_COLUMNS = labeledColumns([
  ["policy", "Policy", true],
  ["kind", "Kind"],
  ["status", "Status"],
  ["next", "Next step"],
  ["party", "Party"],
  ["effective", "Effective"],
  ["actions", ""],
]);

export const SUSPENSE_LIST_COLUMNS = labeledColumns([
  ["policy", "Policy", true],
  ["party", "Party"],
  ["missing", "Missing"],
  ["age", "Age"],
  ["due", "Due"],
  ["actions", ""],
]);

export const INSTALLMENTS_LIST_COLUMNS = labeledColumns([
  ["policy", "Policy", true],
  ["amount", "Amount"],
  ["bill", "Bill"],
  ["status", "Status"],
  ["next", "Next step"],
  ["party", "Party"],
  ["due", "Due"],
  ["actions", ""],
]);

export const CAMPAIGNS_LIST_COLUMNS = labeledColumns([
  ["pick", "", true],
  ["campaign", "Campaign", true],
  ["audience", "Audience"],
  ["status", "Status"],
]);

export const CERTIFICATE_HOLDERS_COLUMNS = labeledColumns([
  ["holder", "Holder", true],
  ["kind", "Kind"],
  ["business", "Business"],
  ["policies", "Policies"],
  ["counts", "Open / issued"],
  ["flags", "Stub flags"],
]);

export const LOGS_LIST_COLUMNS = labeledColumns([
  ["date", "Date", true],
  ["carrier", "Carrier"],
  ["deal", "Deal"],
  ["result", "Result"],
  ["bindable", "Bindable"],
  ["premium", "Premium"],
  ["covA", "Cov A tried"],
  ["why", "Why"],
  ["snapshot", "Snapshot"],
]);

export const CLAIMS_DIARY_COLUMNS = labeledColumns([
  ["claim", "Claim / Policy", true],
  ["kind", "Kind"],
  ["status", "Status"],
  ["party", "Party"],
  ["due", "Due"],
  ["actions", ""],
]);

export const SERVICE_TIMELINE_COLUMNS = labeledColumns([
  ["when", "When", true],
  ["event", "Event"],
  ["policy", "Policy"],
  ["party", "Party"],
  ["log", "Log"],
]);

export const CERTIFICATES_LIST_COLUMNS = labeledColumns([
  ["number", "Number", true],
  ["holder", "Holder"],
  ["business", "Business"],
  ["issued", "Issued"],
  ["flags", "Flags"],
]);

export const ESIGN_LIST_COLUMNS = labeledColumns([
  ["packet", "Packet", true],
  ["record", "Record"],
  ["status", "Status"],
  ["actions", ""],
]);

export const HOLDER_CONTACTS_COLUMNS = labeledColumns([
  ["name", "Name", true],
  ["status", "Status"],
  ["address", "Address"],
  ["flags", "Flags"],
  ["actions", ""],
]);
