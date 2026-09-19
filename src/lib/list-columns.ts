import { dealsColumnsFromFields, layoutKeysForColumns } from "@/lib/deals/deal-columns";
import { normalizeDealsVisibleColumns, TABLE_COLUMNS, type ColumnDef } from "@/lib/desk/columns";
import { CORE_FIELDS } from "@/lib/custom-fields/defaults";
import { defaultFieldsForModule, defaultLayoutForModule } from "@/lib/custom-fields/modules";
import {
  allLayoutFieldKeys,
  type CustomFieldDef,
  type FieldLayout,
} from "@/lib/custom-fields/types";
import { PIPELINE_FIELDS, type PipelineFieldDef } from "@/lib/wire/pipeline";

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

export const COLUMN_STORAGE_PREFIX = "ff-list-columns:v3";
export const MIN_COLUMN_WIDTH = 56;
/** Checkbox column can sit narrower than labeled columns. */
export const MIN_PICK_COLUMN_WIDTH = 32;
export const MAX_COLUMN_WIDTH = 720;
/** Deal Notes may stretch as far as the agent drags — no 720 cap. */
export const NOTES_MAX_COLUMN_WIDTH = 4800;
export const DEFAULT_COLUMN_WIDTH = 148;
export const DEFAULT_PICK_COLUMN_WIDTH = 32;
/** Compact starting width — drag the Notes header to widen or narrow. */
export const DEAL_NOTES_COLUMN_WIDTH = 160;

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
  const normalized = isDealsListColumns(columns) ? normalizeDealsVisibleColumns(ids) : ids;
  return pinPickColumnFirst(normalized);
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
  return opts?.pick
    ? [{ id: "pick", label: "", locked: true, defaultWidth: DEFAULT_PICK_COLUMN_WIDTH }, ...cols]
    : cols;
}


/** Checkbox column always leads — saved layouts must not bury pick mid-row. */
export function pinPickColumnFirst(ids: string[]): string[] {
  if (!ids.includes("pick")) return ids;
  return ["pick", ...ids.filter((id) => id !== "pick")];
}

/** Raw user-saved column ids — keep unknowns so layout/catalog growth can restore them later. */
export function sanitizeStoredColumnIds(stored: unknown): string[] | null {
  if (!Array.isArray(stored)) return null;
  const ids = stored.filter(
    (id): id is string => typeof id === "string" && id.trim().length > 0,
  );
  return ids.length ? pinPickColumnFirst(ids) : null;
}

/**
 * Insert missing locked ids without scrambling the user's existing order.
 * Places each locked id before the first already-visible catalog neighbor that
 * comes after it in catalog order (fallback: append).
 */
function insertMissingLockedInCatalogOrder(
  visible: string[],
  locked: string[],
  catalogOrder: string[],
): string[] {
  const next = [...visible];
  for (const id of locked) {
    if (next.includes(id)) continue;
    const catIdx = catalogOrder.indexOf(id);
    let insertAt = next.length;
    if (catIdx >= 0) {
      for (let i = 0; i < next.length; i++) {
        const neighborIdx = catalogOrder.indexOf(next[i]!);
        if (neighborIdx > catIdx) {
          insertAt = i;
          break;
        }
      }
    }
    next.splice(insertAt, 0, id);
  }
  return next;
}

export function mergeVisibleColumns(
  columns: ListColumn[],
  stored: unknown,
): string[] {
  const defaults = defaultVisibleIds(columns);
  const locked = columns.filter((column) => column.locked).map((column) => column.id);
  const catalogOrder = allColumnIds(columns);
  const allowed = new Set(catalogOrder);
  if (!Array.isArray(stored)) return defaults;
  const visible = stored.filter(
    (id): id is string => typeof id === "string" && allowed.has(id),
  );
  // Never replace the whole blob with sitewide defaults when custom keys were
  // filtered out (that wiped Priority / Pipeline / Selling Agency prefs).
  // Empty / all-unknown prefs → locked shell only.
  const base = insertMissingLockedInCatalogOrder(visible, locked, catalogOrder);
  // Saved prefs are authoritative. Do not re-add defaultOn columns the agent hid —
  // that made Deals / Contacts / Policies / Carriers toggles snap back on.
  // Locked (pick / select) still insert. Empty / all-unknown → locked shell, else defaults.
  const seeded = base.length ? base : defaults;
  const normalized = isDealsListColumns(columns)
    ? normalizeDealsVisibleColumns(seeded)
    : seeded;
  return pinPickColumnFirst(normalized);
}

export function isPickColumn(columnId: string): boolean {
  return columnId === "pick";
}

export function isNotesListColumnId(columnId?: string): boolean {
  return columnId === "notes" || columnId === "new_field";
}

export function clampColumnWidth(px: number, columnId?: string): number {
  if (!Number.isFinite(px)) return DEFAULT_COLUMN_WIDTH;
  const min = isPickColumn(columnId ?? "") ? MIN_PICK_COLUMN_WIDTH : MIN_COLUMN_WIDTH;
  const max = isNotesListColumnId(columnId) ? NOTES_MAX_COLUMN_WIDTH : MAX_COLUMN_WIDTH;
  return Math.min(max, Math.max(min, Math.round(px)));
}

export function defaultColumnWidth(column: ListColumn): number {
  if (isPickColumn(column.id)) {
    const raw = column.defaultWidth ?? DEFAULT_PICK_COLUMN_WIDTH;
    return clampColumnWidth(raw, "pick");
  }
  // Empty-label utility cols (e.g. actions) stay compact — not the pick min path.
  if (!column.label.trim()) {
    return column.defaultWidth != null
      ? clampColumnWidth(column.defaultWidth, column.id)
      : 44;
  }
  if (column.defaultWidth != null) return clampColumnWidth(column.defaultWidth, column.id);
  // Primary name / title columns stay wide even without a header search input.
  const label = column.label.trim().toLowerCase();
  if (
    column.id === "name" ||
    column.id === "business" ||
    column.id === "policy" ||
    column.id === "title" ||
    label === "name" ||
    label === "business name" ||
    label === "policy"
  ) {
    return 260;
  }
  const fromLabel = column.label.trim().length * 9 + 56;
  return clampColumnWidth(Math.max(112, Math.min(220, fromLabel)), column.id);
}

export function listSortForColumn(key: string, dir: ListSortDir | null): ListSort | null {
  if (!key || !dir) return null;
  return { key, dir };
}

/**
 * Header live-search inputs are off sitewide — Contains search lives on the
 * filters row (PageFiltersBar / queue toolbar). Kept so column-table still
 * compiles; always false.
 */
export function isLiveSearchColumn(_column: Pick<ListColumn, "id" | "label" | "liveSearch">): boolean {
  return false;
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
    next[id] = clampColumnWidth(n, id);
  }
  return next;
}

/** Agent-local drag widths win; fill gaps from server/desk prefs. */
export function preferColumnWidths(
  columns: ListColumn[],
  preferred: unknown,
  fallback: unknown = {},
): Record<string, number> {
  return {
    ...mergeColumnWidths(columns, fallback),
    ...mergeColumnWidths(columns, preferred),
  };
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

/** Prefer current key; fall back to older ff-list-columns versions so bumps do not orphan prefs. */
function readLocalColumnLayoutRaw(moduleId: string): string | null {
  if (typeof window === "undefined") return null;
  const keys = [
    columnStorageKey(moduleId),
    `ff-list-columns:v2:${moduleId}`,
    `ff-list-columns:v1:${moduleId}`,
  ];
  const seen = new Set<string>();
  for (const key of keys) {
    if (seen.has(key)) continue;
    seen.add(key);
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) return raw;
    } catch {
      /* private mode */
    }
  }
  return null;
}

export function loadColumnLayout(moduleId: string, columns: ListColumn[]): ListColumnLayout {
  const defaults = defaultVisibleIds(columns);
  if (typeof window === "undefined") {
    return { columns: defaults, widths: {}, sort: null };
  }
  try {
    const raw = readLocalColumnLayoutRaw(moduleId);
    if (!raw) return { columns: defaults, widths: {}, sort: null };
    const parsed = parseStoredColumnLayout(JSON.parse(raw));
    const layout = {
      columns: mergeVisibleColumns(columns, parsed.columns),
      widths: mergeColumnWidths(columns, parsed.widths),
      sort: parseListSort(parsed.sort),
    };
    // Migrate legacy v1/v2 blobs onto the current key without changing order.
    saveColumnLayout(moduleId, {
      columns: sanitizeStoredColumnIds(parsed.columns) ?? layout.columns,
      widths: layout.widths,
      sort: layout.sort,
    });
    return layout;
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
  if (fromId === "pick" || toId === "pick") return pinPickColumnFirst(visible);
  const from = visible.indexOf(fromId);
  const to = visible.indexOf(toId);
  if (from < 0 || to < 0 || from === to) return visible;
  const next = [...visible];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return pinPickColumnFirst(next);
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
  pick: DEFAULT_PICK_COLUMN_WIDTH,
  name: 340,
  cadence: 150,
  status: 150,
  source: 160,
  timer: 150,
  heat: 210,
  followUp: 200,
  shop: 140,
  tags: 160,
} as const;

/**
 * Locked / queue system columns for Leads.
 * name=title, status=stage, timer=activity, tags=tags. heat/followUp/shop stay for the queue.
 */
export const LOCKED_LEADS_LIST_COLUMN_IDS = [
  "pick",
  "name",
  "cadence",
  "status",
  "timer",
  "tags",
] as const;

const LEADS_SYSTEM_COLUMNS: ListColumn[] = [
  { id: "pick", label: "", locked: true, defaultWidth: LEADS_DEFAULT_WIDTHS.pick },
  { id: "name", label: "Name", locked: true, defaultWidth: LEADS_DEFAULT_WIDTHS.name },
  { id: "cadence", label: "Cadence", locked: true, defaultWidth: LEADS_DEFAULT_WIDTHS.cadence },
  { id: "status", label: "Status", locked: true, defaultWidth: LEADS_DEFAULT_WIDTHS.status },
  { id: "timer", label: "Response", locked: true, defaultWidth: LEADS_DEFAULT_WIDTHS.timer },
  { id: "heat", label: "Temp", defaultWidth: LEADS_DEFAULT_WIDTHS.heat },
  { id: "followUp", label: "Follow-up", defaultWidth: LEADS_DEFAULT_WIDTHS.followUp },
  { id: "shop", label: "Convert", defaultWidth: LEADS_DEFAULT_WIDTHS.shop },
  { id: "tags", label: "Tags", locked: true, defaultWidth: LEADS_DEFAULT_WIDTHS.tags },
];

/** Layout keys already covered by the Name / Cadence / Status / queue system columns. */
const LEADS_LAYOUT_COVERED = new Set([
  "first_name",
  "last_name",
  "middle_name",
  "status",
  "cadence",
  "stage",
]);

const LEADS_LAYOUT_WIDTHS: Record<string, number> = {
  source: LEADS_DEFAULT_WIDTHS.source,
  email: 180,
  phone: 140,
  notes: 200,
  mailing_address: 200,
  city: 120,
  state: 80,
  zip: 90,
};

export function leadsListColumnsFromLayout(
  layout?: FieldLayout | null,
  fields: readonly CustomFieldDef[] = defaultFieldsForModule("leads"),
): ListColumn[] {
  const layoutKeys = new Set(allLayoutFieldKeys(layout ?? defaultLayoutForModule("leads")));
  const byKey = new Map(fields.map((field) => [field.key, field]));
  const extras: ListColumn[] = [];
  const seen = new Set(LEADS_SYSTEM_COLUMNS.map((column) => column.id));

  // Source sits after Cadence/Status when the layout includes it (default lead layout does).
  if (layoutKeys.has("source") && !seen.has("source")) {
    extras.push({
      id: "source",
      label: byKey.get("source")?.label ?? "Source",
      defaultWidth: LEADS_LAYOUT_WIDTHS.source,
    });
    seen.add("source");
  }

  for (const key of layoutKeys) {
    if (seen.has(key) || LEADS_LAYOUT_COVERED.has(key)) continue;
    // Never invent junk / LOB phantoms that are not on this module layout.
    const field = byKey.get(key);
    extras.push({
      id: key,
      label:
        field?.label ??
        key
          .split("_")
          .filter(Boolean)
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" "),
      defaultOn: false,
      defaultWidth: LEADS_LAYOUT_WIDTHS[key],
    });
    seen.add(key);
  }

  const sourceCol = extras.find((column) => column.id === "source");
  const otherExtras = extras.filter((column) => column.id !== "source");
  const [pick, name, cadence, status, ...restSystem] = LEADS_SYSTEM_COLUMNS;
  return [
    pick,
    name,
    cadence,
    status,
    ...(sourceCol ? [sourceCol] : []),
    ...restSystem,
    ...otherExtras,
  ];
}

export const LEADS_LIST_COLUMNS: ListColumn[] = leadsListColumnsFromLayout();

const CONTACTS_SYSTEM_COLUMNS: ListColumn[] = [
  { id: "pick", label: "", locked: true, defaultWidth: DEFAULT_PICK_COLUMN_WIDTH },
  { id: "name", label: "Name" },
  { id: "phone", label: "Phone" },
  { id: "email", label: "Email" },
  { id: "status", label: "Client Status" },
  { id: "lifetime", label: "Lifetime Deals" },
  { id: "inForce", label: "In-Force" },
  { id: "tags", label: "Tags" },
  { id: "lastActivity", label: "Last Activity" },
];

/** Layout keys already covered by Contacts system columns (name / status / phone / email). */
const CONTACTS_LAYOUT_COVERED = new Set([
  "first_name",
  "last_name",
  "middle_name",
  "name",
  "client_status",
  "status",
  "phone",
  "email",
]);

const CONTACTS_LAYOUT_WIDTHS: Record<string, number> = {
  source: 160,
  mailing_address: 200,
  city: 120,
  state: 80,
  zip: 90,
  date_of_birth: 120,
};

function humanizeFieldKey(key: string): string {
  return key
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/** Standing Contacts list fields — keep even when Edit Layout omits them (Javy prefs). */
const STANDING_CONTACTS_LIST_FIELD_KEYS = new Set([
  "picklist", // Preferred Language — still on Rivera column prefs
  "date_of_birth",
]);

export function contactsListColumnsFromLayout(
  layout?: FieldLayout | null,
  fields: readonly CustomFieldDef[] = defaultFieldsForModule("contacts"),
): ListColumn[] {
  const layoutKeys = new Set(allLayoutFieldKeys(layout ?? defaultLayoutForModule("contacts")));
  const byKey = new Map(fields.map((field) => [field.key, field]));
  const extras: ListColumn[] = [];
  const seen = new Set(CONTACTS_SYSTEM_COLUMNS.map((column) => column.id));

  // Source is common on contact layouts — surface it after email when present.
  if (layoutKeys.has("source") && !seen.has("source")) {
    extras.push({
      id: "source",
      label: byKey.get("source")?.label ?? "Source",
      defaultWidth: CONTACTS_LAYOUT_WIDTHS.source,
    });
    seen.add("source");
  }

  const candidateKeys = new Set([...layoutKeys, ...STANDING_CONTACTS_LIST_FIELD_KEYS]);
  for (const key of candidateKeys) {
    if (seen.has(key) || CONTACTS_LAYOUT_COVERED.has(key)) continue;
    const field = byKey.get(key);
    if (!field && !layoutKeys.has(key)) continue; // standing key only when field exists
    extras.push({
      id: key,
      label: field?.label ?? humanizeFieldKey(key),
      defaultOn: false,
      defaultWidth: CONTACTS_LAYOUT_WIDTHS[key],
    });
    seen.add(key);
  }

  const sourceCol = extras.find((column) => column.id === "source");
  const otherExtras = extras.filter((column) => column.id !== "source");
  const [pick, name, phone, email, ...restSystem] = CONTACTS_SYSTEM_COLUMNS;
  return [
    pick,
    name,
    phone,
    email,
    ...(sourceCol ? [sourceCol] : []),
    ...restSystem,
    ...otherExtras,
  ];
}

export const CONTACTS_LIST_COLUMNS: ListColumn[] = contactsListColumnsFromLayout();

function isDealsNotesListColumn(column: ListColumn): boolean {
  if (column.id === "notes" || column.id === "new_field") return true;
  return /notes/i.test(column.label);
}

export function dealsListColumnsFromFields(
  fields: readonly CustomFieldDef[],
  layout?: FieldLayout | null,
): ListColumn[] {
  return fromDeskColumns(dealsColumnsFromFields(fields, layout), {
    pick: true,
    // Only the checkbox column is locked — agents must be able to hide Deal / Stage / Tags.
  }).map((column) =>
    isDealsNotesListColumn(column)
      ? { ...column, defaultWidth: column.defaultWidth ?? DEAL_NOTES_COLUMN_WIDTH }
      : column,
  );
}

export const DEALS_LIST_COLUMNS: ListColumn[] = dealsListColumnsFromFields(
  CORE_FIELDS,
  defaultLayoutForModule("deals"),
);

const ACCOUNTS_SYSTEM_COLUMNS: ListColumn[] = [
  { id: "pick", label: "", locked: true, defaultWidth: DEFAULT_PICK_COLUMN_WIDTH },
  { id: "business", label: "Account Name" },
  { id: "status", label: "Status" },
  { id: "industry", label: "Industry" },
  { id: "source", label: "Source" },
  { id: "linkedContacts", label: "Linked Contacts" },
  { id: "policies", label: "Policies" },
  { id: "lastActivity", label: "Last Activity" },
];

/** Layout keys already covered by Accounts system columns. */
const ACCOUNTS_LAYOUT_COVERED = new Set([
  "name",
  "business_name",
  "legal_name",
  "dba",
  "client_status",
  "status",
  "industry",
  "source",
]);

const ACCOUNTS_LAYOUT_WIDTHS: Record<string, number> = {
  phone: 140,
  email: 180,
  mailing_address: 200,
  city: 120,
  state: 80,
  zip: 90,
  ein: 120,
};

export function accountsListColumnsFromLayout(
  layout?: FieldLayout | null,
  fields: readonly CustomFieldDef[] = defaultFieldsForModule("businesses"),
): ListColumn[] {
  const layoutKeys = new Set(allLayoutFieldKeys(layout ?? defaultLayoutForModule("businesses")));
  const byKey = new Map(fields.map((field) => [field.key, field]));
  const extras: ListColumn[] = [];
  const seen = new Set(ACCOUNTS_SYSTEM_COLUMNS.map((column) => column.id));

  for (const key of layoutKeys) {
    if (seen.has(key) || ACCOUNTS_LAYOUT_COVERED.has(key)) continue;
    const field = byKey.get(key);
    extras.push({
      id: key,
      label: field?.label ?? humanizeFieldKey(key),
      defaultOn: false,
      defaultWidth: ACCOUNTS_LAYOUT_WIDTHS[key],
    });
    seen.add(key);
  }

  return [...ACCOUNTS_SYSTEM_COLUMNS, ...extras];
}

export const ACCOUNTS_LIST_COLUMNS: ListColumn[] = accountsListColumnsFromLayout();

export const POLICIES_LIST_COLUMNS: ListColumn[] = [
  { id: "pick", label: "", locked: true, defaultWidth: DEFAULT_PICK_COLUMN_WIDTH },
  { id: "policy", label: "Policy" },
  { id: "status", label: "Status" },
  { id: "party", label: "Party" },
  { id: "carrier", label: "Carrier" },
  { id: "owner", label: "Assigned", defaultOn: false },
  { id: "premium", label: "Premium" },
  { id: "expires", label: "Expires" },
  { id: "esign", label: "E-sign" },
  { id: "tags", label: "Tags" },
];

export const RENEWALS_LIST_COLUMNS: ListColumn[] = [
  { id: "policy", label: "Policy", locked: true, defaultWidth: 280 },
  { id: "lob", label: "LOB" },
  { id: "subtype", label: "Subtype", defaultOn: false },
  { id: "carrier", label: "Carrier" },
  { id: "expires", label: "Expiration" },
  { id: "days", label: "Days" },
  { id: "premium", label: "Premium", defaultOn: false },
  { id: "stage", label: "Stage" },
  { id: "client", label: "Client", defaultOn: false },
];

export const CARRIERS_LIST_COLUMNS: ListColumn[] = [
  { id: "pick", label: "", locked: true, defaultWidth: DEFAULT_PICK_COLUMN_WIDTH },
  { id: "carrier", label: "Carrier Name" },
  { id: "label", label: "Label", defaultOn: false },
  { id: "status", label: "Status" },
  { id: "lines", label: "Written Lines" },
  { id: "activePolicies", label: "Active Policies" },
  { id: "premium", label: "Premium Volume" },
  { id: "commission", label: "Commission Earned", defaultOn: false },
  { id: "hitRate", label: "Hit Rate", defaultOn: false },
  { id: "avgDays", label: "Average Days To Bind", defaultOn: false },
  { id: "lastQuote", label: "Last Quote Date" },
  { id: "lastIssued", label: "Last Issued Date" },
  { id: "lastContacted", label: "Last Contacted" },
  { id: "amBest", label: "AM Best Rating", defaultOn: false },
  { id: "portal", label: "Portal Status" },
  { id: "tags", label: "Tags" },
];

const TASKS_SYSTEM_COLUMNS: ListColumn[] = [
  { id: "pick", label: "", locked: true, defaultWidth: DEFAULT_PICK_COLUMN_WIDTH },
  { id: "task", label: "Task", locked: true },
  { id: "record", label: "Linked record", locked: true },
  { id: "recordType", label: "Record type" },
  { id: "taskType", label: "Task type" },
  { id: "due", label: "Due" },
  { id: "status", label: "Status" },
  // Locked so Columns prefs / stale localStorage cannot hide them (Javy standing).
  { id: "priority", label: "Priority", locked: true, defaultOn: true },
  { id: "tags", label: "Tags", locked: true, defaultOn: true },
];

const TASKS_LAYOUT_COVERED = new Set([
  "title",
  "task_type",
  "due_date",
  "status",
  "priority",
  "tags",
  "linked_record",
  "record_type",
  "assignee",
  "notes",
]);

/** Agency Task layout fields (priority, tags, …) become optional list columns. */
export function tasksListColumnsFromLayout(
  layout?: FieldLayout | null,
  fields: readonly CustomFieldDef[] = defaultFieldsForModule("tasks"),
): ListColumn[] {
  const layoutKeys = new Set(allLayoutFieldKeys(layout ?? defaultLayoutForModule("tasks")));
  const byKey = new Map(fields.map((field) => [field.key, field]));
  const extras: ListColumn[] = [];
  const seen = new Set(TASKS_SYSTEM_COLUMNS.map((column) => column.id));
  for (const key of layoutKeys) {
    if (seen.has(key) || TASKS_LAYOUT_COVERED.has(key)) continue;
    const field = byKey.get(key);
    extras.push({
      id: key,
      label: field?.label ?? humanizeFieldKey(key),
      defaultOn: key === "priority" || key === "tags",
    });
    seen.add(key);
  }
  return [...TASKS_SYSTEM_COLUMNS, ...extras];
}

export const TASKS_LIST_COLUMNS: ListColumn[] = tasksListColumnsFromLayout();

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

const PIPELINE_LAYOUT_ALIASES: Record<string, readonly string[]> = {
  title: ["title"],
  insured: ["named_insured", "insured"],
  phone: ["phone"],
  email: ["email"],
  address: ["mailing_address", "address"],
  line: ["line", "line_of_business"],
  state: ["state"],
  city: ["city"],
  coverageA: ["coverage_a", "coverageA", "value", "premium", "coverage_value"],
  carrier: ["carrier", "current_carrier"],
  stage: ["stage"],
  updated: ["updated", "updated_at"],
  bound: ["bound", "bound_at"],
  tags: ["tags"],
};

const LOCKED_PIPELINE_COLUMN_IDS = new Set(["title", "stage", "tags", "actions"]);

export function pipelineListColumnsFromLayout(layout?: FieldLayout | null): ListColumn[] {
  const layoutKeys = layoutKeysForColumns(layout ?? defaultLayoutForModule("deals"));
  const fields: PipelineFieldDef[] = PIPELINE_FIELDS.filter((field) => {
    if (LOCKED_PIPELINE_COLUMN_IDS.has(field.id)) return true;
    if (field.id === "coverageA" || field.id === "carrier" || field.id === "updated" || field.id === "bound") {
      const aliases = PIPELINE_LAYOUT_ALIASES[field.id] ?? [field.id];
      return aliases.some((key) => layoutKeys.has(key));
    }
    const aliases = PIPELINE_LAYOUT_ALIASES[field.id] ?? [field.id];
    return aliases.some((key) => layoutKeys.has(key));
  });
  return [
    ...fields.map((field) => ({
      id: field.id,
      label: field.label,
      locked: LOCKED_PIPELINE_COLUMN_IDS.has(field.id) || Boolean(field.required),
      defaultOn: field.defaultOn,
    })),
    { id: "actions", label: "Call / SMS / Task / Meeting", locked: true },
  ];
}

export const PIPELINE_LIST_COLUMNS: ListColumn[] = pipelineListColumnsFromLayout();

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
  return items.map(([id, label, locked]) => ({
    id,
    label,
    locked: Boolean(locked),
    ...(isPickColumn(id) ? { defaultWidth: DEFAULT_PICK_COLUMN_WIDTH } : {}),
  }));
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
  ["status", "Status"],
  ["issued", "Issued"],
  ["flags", "Flags"],
]);

export const ESIGN_LIST_COLUMNS = labeledColumns([
  ["signer", "Client / signer", true],
  ["form", "Form"],
  ["status", "Status"],
  ["record", "Record"],
  ["sent", "Sent"],
  ["actions", ""],
]);

export const HOLDER_CONTACTS_COLUMNS = labeledColumns([
  ["name", "Name", true],
  ["status", "Status"],
  ["address", "Address"],
  ["flags", "Flags"],
  ["actions", ""],
]);
