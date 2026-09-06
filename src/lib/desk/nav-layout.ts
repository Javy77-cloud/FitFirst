import {
  getNavLink,
  isAdminOnlyNavId,
  isPersonalSettingsPath,
  NAV_LINK_CATALOG,
  navLinkIsActive,
  type NavLinkDef,
} from "@/lib/desk/nav-catalog";
import { remapNavIds, remapNavSubmenus } from "@/lib/desk/nav-aliases";

/** Bump when the signed default rail changes so stale per-user prefs reset. */
export const NAV_LAYOUT_VERSION = 3 as const;
export const DIVIDER_ID = "divider";

/** Default rail, top → bottom. Divider splits CRM from utility. */
export const DEFAULT_PRIMARY_ORDER = [
  "home",
  "leads",
  "deals",
  "contacts",
  "policies",
  "business",
  "carriers",
  DIVIDER_ID,
  "tasks",
  "calendar",
  "templates",
  "reports",
  "settings",
  "admin",
] as const;

export const DEFAULT_COLLAPSED_IDS = ["business", "carriers"] as const;

export const UTILITY_PRIMARY_IDS = ["tasks", "calendar", "templates", "reports", "settings", "admin"] as const;

export const DEFAULT_SUBMENUS: Record<string, readonly string[]> = {
  home: [],
  leads: [],
  deals: ["quotes"],
  contacts: [],
  policies: [
    "book-health",
    "renewals",
    "certificates",
    "service-requests",
    "suspense",
    "notices",
    "endorsements",
    "service-timeline",
    "inspections",
    "installments",
    "claims",
    "decline-log",
  ],
  business: [],
  carriers: [],
  tasks: ["work-queue"],
  calendar: ["phone"],
  templates: ["email-signatures", "email-templates", "document-templates"],
  reports: ["scorecards", "glance", "commissions"],
  settings: [],
  admin: [
    "agents",
    "billing",
    "compliance",
    "integrations",
    "automations",
    "triggers",
    "commission-rates",
    "lines",
    "offices",
    "agency",
  ],
};

export type PersonalDeskPrefs = {
  timezone?: string;
  emailSignature?: string;
  notifyInApp?: boolean;
};

export type StoredNavLayout = {
  version: number;
  primaryOrder: string[];
  hiddenPrimaryIds: string[];
  submenus: Record<string, string[]>;
  personal?: PersonalDeskPrefs;
};

export type ResolvedNavItem = {
  kind: "item";
  id: string;
  hidden: boolean;
  hidable: boolean;
  defaultCollapsed: boolean;
  adminOnly: boolean;
  link: NavLinkDef;
  submenu: NavLinkDef[];
  isFolder: boolean;
};

export type ResolvedDivider = {
  kind: "divider";
  id: typeof DIVIDER_ID;
};

export type ResolvedNavRow = ResolvedNavItem | ResolvedDivider;

/** @deprecated Settings is no longer pinned. Kept so older imports compile. */
export const PINNED_PRIMARY_IDS: readonly string[] = [];

function parsePersonal(raw: unknown): PersonalDeskPrefs | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const value = raw as Record<string, unknown>;
  const personal: PersonalDeskPrefs = {};
  if (typeof value.timezone === "string") personal.timezone = value.timezone;
  if (typeof value.emailSignature === "string") personal.emailSignature = value.emailSignature;
  if (typeof value.notifyInApp === "boolean") personal.notifyInApp = value.notifyInApp;
  return Object.keys(personal).length ? personal : undefined;
}

export function defaultStoredNavLayout(): StoredNavLayout {
  return {
    version: NAV_LAYOUT_VERSION,
    primaryOrder: [...DEFAULT_PRIMARY_ORDER],
    hiddenPrimaryIds: [],
    submenus: Object.fromEntries(
      Object.entries(DEFAULT_SUBMENUS).map(([id, items]) => [id, [...items]]),
    ),
  };
}

export function isDividerId(id: string): boolean {
  return id === DIVIDER_ID;
}

export function isCatalogId(id: string): boolean {
  return Boolean(getNavLink(id));
}

export function isNavItemId(id: string): boolean {
  return isCatalogId(id) || isDividerId(id);
}

/** Any catalog row can sit at top level or inside a folder. */
export function isPrimaryId(id: string): boolean {
  return isCatalogId(id);
}

export function isPinnedPrimaryId(_id: string): boolean {
  return false;
}

export function isHidablePrimaryId(id: string): boolean {
  return isCatalogId(id);
}

export function isDefaultCollapsedId(id: string): boolean {
  return (DEFAULT_COLLAPSED_IDS as readonly string[]).includes(id);
}

function uniqueKnown(ids: string[], extraSkip?: Set<string>): string[] {
  const seen = extraSkip ? new Set(extraSkip) : new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    if (!isNavItemId(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

function allUsedIds(primaryOrder: string[], submenus: Record<string, string[]>): Set<string> {
  const used = new Set(primaryOrder);
  for (const children of Object.values(submenus)) {
    for (const id of children) used.add(id);
  }
  return used;
}

function insertMissingDefaults(primaryOrder: string[], used: Set<string>): string[] {
  const next = [...primaryOrder];
  for (const id of DEFAULT_PRIMARY_ORDER) {
    if (used.has(id)) continue;
    const defaultIndex = DEFAULT_PRIMARY_ORDER.indexOf(id);
    let insertAt = next.length;
    for (let i = defaultIndex - 1; i >= 0; i--) {
      const neighbor = DEFAULT_PRIMARY_ORDER[i];
      const pos = next.indexOf(neighbor);
      if (pos >= 0) {
        insertAt = pos + 1;
        break;
      }
    }
    next.splice(insertAt, 0, id);
    used.add(id);
  }
  return next;
}

/** Merge a saved JSON blob with today's catalog so new modules still appear. */
export function normalizeNavLayout(raw: unknown): StoredNavLayout {
  const fallback = defaultStoredNavLayout();
  if (!raw || typeof raw !== "object") return fallback;
  const parsed = raw as Partial<StoredNavLayout> & { version?: number };
  const personal = parsePersonal((parsed as { personal?: unknown }).personal);
  const savedVersion = typeof parsed.version === "number" ? parsed.version : 0;
  if (savedVersion < NAV_LAYOUT_VERSION) {
    return personal ? { ...fallback, personal } : fallback;
  }
  const savedOrder = Array.isArray(parsed.primaryOrder)
    ? remapNavIds(parsed.primaryOrder.filter((id): id is string => typeof id === "string"))
    : [];
  const knownSaved = uniqueKnown(savedOrder);

  const savedSubs =
    parsed.submenus && typeof parsed.submenus === "object" && !Array.isArray(parsed.submenus)
      ? remapNavSubmenus(
          Object.fromEntries(
            Object.entries(parsed.submenus).filter((entry): entry is [string, string[]] =>
              Array.isArray(entry[1]),
            ),
          ),
        )
      : {};

  const used = new Set(knownSaved);
  const submenus: Record<string, string[]> = {};
  for (const [parent, children] of Object.entries(savedSubs)) {
    if (!isCatalogId(parent) && !knownSaved.includes(parent)) continue;
    const cleaned = uniqueKnown(
      (children ?? []).filter((item) => item !== parent && !isDividerId(item)),
      used,
    );
    for (const id of cleaned) used.add(id);
    submenus[parent] = cleaned;
  }

  let primaryOrder = insertMissingDefaults(knownSaved.filter((id) => !isDividerId(id) || true), used);
  primaryOrder = uniqueKnown(primaryOrder);

  if (!primaryOrder.includes(DIVIDER_ID)) {
    const carriersAt = primaryOrder.indexOf("carriers");
    const tasksAt = primaryOrder.indexOf("tasks");
    const insertAt = carriersAt >= 0 ? carriersAt + 1 : tasksAt >= 0 ? tasksAt : primaryOrder.length;
    primaryOrder.splice(insertAt, 0, DIVIDER_ID);
  }

  for (const id of primaryOrder) {
    if (isDividerId(id)) continue;
    if (!submenus[id]) {
      const defaults = DEFAULT_SUBMENUS[id] ?? [];
      submenus[id] = uniqueKnown(
        defaults.filter((item) => item !== id && !used.has(item)),
        used,
      );
      for (const child of submenus[id]) used.add(child);
    }
  }

  const savedHidden = Array.isArray(parsed.hiddenPrimaryIds)
    ? parsed.hiddenPrimaryIds.filter((id): id is string => typeof id === "string")
    : [];
  const hiddenPrimaryIds = uniqueKnown(savedHidden.filter((id) => isHidablePrimaryId(id)));

  return { version: NAV_LAYOUT_VERSION, primaryOrder, hiddenPrimaryIds, submenus, personal };
}

export function parseStoredNavLayout(raw: string | null | undefined): StoredNavLayout {
  if (!raw) return defaultStoredNavLayout();
  try {
    return normalizeNavLayout(JSON.parse(raw) as unknown);
  } catch {
    return defaultStoredNavLayout();
  }
}

export function resolveNavLayout(
  stored: StoredNavLayout | null | undefined,
  options: { isAdmin?: boolean } = {},
): ResolvedNavRow[] {
  const layout = normalizeNavLayout(stored);
  const isAdmin = options.isAdmin !== false;
  return layout.primaryOrder
    .map((id): ResolvedNavRow | null => {
      if (isDividerId(id)) return { kind: "divider", id: DIVIDER_ID };
      const link = getNavLink(id);
      if (!link) return null;
      if (!isAdmin && link.adminOnly) return null;
      const submenu = (layout.submenus[id] ?? [])
        .map((itemId) => getNavLink(itemId))
        .filter((item): item is NavLinkDef => {
          if (!item) return false;
          return isAdmin || !item.adminOnly;
        });
      return {
        kind: "item",
        id,
        hidden: layout.hiddenPrimaryIds.includes(id),
        hidable: isHidablePrimaryId(id),
        defaultCollapsed: isDefaultCollapsedId(id),
        adminOnly: Boolean(link.adminOnly),
        link,
        submenu,
        isFolder: submenu.length > 0,
      };
    })
    .filter((row): row is ResolvedNavRow => Boolean(row));
}

export function visibleNavItems(rows: ResolvedNavRow[], customizing: boolean): ResolvedNavItem[] {
  return rows.filter((row): row is ResolvedNavItem => row.kind === "item" && (customizing || !row.hidden));
}

export function splitNavSections(rows: ResolvedNavRow[]): {
  main: ResolvedNavRow[];
  utility: ResolvedNavRow[];
} {
  const dividerAt = rows.findIndex((row) => row.kind === "divider");
  if (dividerAt < 0) {
    return { main: rows, utility: [] };
  }
  return {
    main: rows.slice(0, dividerAt),
    utility: rows.slice(dividerAt + 1),
  };
}

export function findParentId(layout: StoredNavLayout, id: string): string | null {
  const current = normalizeNavLayout(layout);
  for (const [parent, children] of Object.entries(current.submenus)) {
    if (children.includes(id)) return parent;
  }
  return null;
}

export function takeItem(
  layout: StoredNavLayout,
  id: string,
): { layout: StoredNavLayout; children: string[] } {
  const current = normalizeNavLayout(layout);
  const children = [...(current.submenus[id] ?? [])];
  const primaryOrder = current.primaryOrder.filter((item) => item !== id);
  const submenus: Record<string, string[]> = {};
  for (const [parent, items] of Object.entries(current.submenus)) {
    if (parent === id) continue;
    submenus[parent] = items.filter((item) => item !== id);
  }
  return {
    layout: { ...current, primaryOrder, submenus },
    children,
  };
}

function insertAt<T>(list: T[], index: number, value: T): T[] {
  const next = [...list];
  const clamped = Math.max(0, Math.min(next.length, index));
  next.splice(clamped, 0, value);
  return next;
}

export type NavDropTarget =
  | { type: "before"; id: string }
  | { type: "after"; id: string }
  | { type: "into"; id: string }
  | { type: "end-primary" }
  | { type: "end-folder"; parentId: string };

export function parseDropKey(key: string | null | undefined): NavDropTarget | null {
  if (!key) return null;
  if (key === "end-primary") return { type: "end-primary" };
  if (key.startsWith("end-folder:")) return { type: "end-folder", parentId: key.slice("end-folder:".length) };
  if (key.startsWith("before:")) return { type: "before", id: key.slice("before:".length) };
  if (key.startsWith("after:")) return { type: "after", id: key.slice("after:".length) };
  if (key.startsWith("into:")) return { type: "into", id: key.slice("into:".length) };
  return null;
}

export function dropKey(target: NavDropTarget): string {
  if (target.type === "end-primary") return "end-primary";
  if (target.type === "end-folder") return `end-folder:${target.parentId}`;
  return `${target.type}:${target.id}`;
}

/** Free rearrange: top-level ↔ folder, any item can become a folder. Nothing locked. */
export function applyNavDrop(layout: StoredNavLayout, draggedId: string, target: NavDropTarget | null): StoredNavLayout {
  const current = normalizeNavLayout(layout);
  if (!target || !isNavItemId(draggedId)) return current;
  if (target.type === "before" || target.type === "after" || target.type === "into") {
    if (target.id === draggedId) return current;
  }
  if (target.type === "into" && (isDividerId(target.id) || target.id === draggedId)) return current;
  if (target.type === "end-folder" && target.parentId === draggedId) return current;

  const removed = takeItem(current, draggedId);
  let next = removed.layout;
  const orphanChildren = removed.children.filter((id) => id !== draggedId);

  const placeOnPrimary = (index: number) => {
    next = {
      ...next,
      primaryOrder: insertAt(next.primaryOrder, index, draggedId),
      submenus: { ...next.submenus, [draggedId]: orphanChildren },
    };
  };

  const placeInFolder = (parentId: string, index: number) => {
    if (!isCatalogId(parentId) || isDividerId(parentId)) return;
    const folder = [...(next.submenus[parentId] ?? [])];
    const withItem = insertAt(folder, index, draggedId);
    const merged = uniqueKnown([...withItem, ...orphanChildren.filter((id) => id !== parentId)]);
    next = {
      ...next,
      primaryOrder: next.primaryOrder.filter((id) => id !== draggedId),
      submenus: { ...next.submenus, [parentId]: merged, [draggedId]: [] },
    };
  };

  if (target.type === "end-primary") {
    placeOnPrimary(next.primaryOrder.length);
    return next;
  }
  if (target.type === "end-folder") {
    placeInFolder(target.parentId, (next.submenus[target.parentId] ?? []).length);
    return next;
  }

  const targetParent = findParentId(next, target.id);
  const targetIsPrimary = next.primaryOrder.includes(target.id) || isDividerId(target.id);

  if (target.type === "into") {
    placeInFolder(target.id, (next.submenus[target.id] ?? []).length);
    return next;
  }

  if (targetIsPrimary && !targetParent) {
    const at = next.primaryOrder.indexOf(target.id);
    if (at < 0) return current;
    placeOnPrimary(target.type === "before" ? at : at + 1);
    return next;
  }

  if (targetParent) {
    const folder = next.submenus[targetParent] ?? [];
    const at = folder.indexOf(target.id);
    if (at < 0) return current;
    placeInFolder(targetParent, target.type === "before" ? at : at + 1);
    return next;
  }

  return current;
}

export function moveId(order: string[], fromId: string, toId: string): string[] {
  if (fromId === toId) return [...order];
  const from = order.indexOf(fromId);
  const to = order.indexOf(toId);
  if (from < 0 || to < 0) return [...order];
  const next = [...order];
  const [row] = next.splice(from, 1);
  next.splice(to, 0, row);
  return next;
}

export function moveByDelta(order: string[], id: string, delta: number): string[] {
  const from = order.indexOf(id);
  if (from < 0 || delta === 0) return [...order];
  const to = Math.max(0, Math.min(order.length - 1, from + delta));
  return moveId(order, id, order[to]);
}

export function nudgePrimary(layout: StoredNavLayout, id: string, delta: number): StoredNavLayout {
  const current = normalizeNavLayout(layout);
  return { ...current, primaryOrder: moveByDelta(current.primaryOrder, id, delta) };
}

export function nudgeSubmenu(
  layout: StoredNavLayout,
  primaryId: string,
  id: string,
  delta: number,
): StoredNavLayout {
  const current = normalizeNavLayout(layout);
  const submenu = current.submenus[primaryId] ?? [];
  return {
    ...current,
    submenus: { ...current.submenus, [primaryId]: moveByDelta(submenu, id, delta) },
  };
}

export function reorderPrimaries(layout: StoredNavLayout, fromId: string, toId: string): StoredNavLayout {
  const current = normalizeNavLayout(layout);
  return { ...current, primaryOrder: moveId(current.primaryOrder, fromId, toId) };
}

export function reorderSubmenu(
  layout: StoredNavLayout,
  primaryId: string,
  fromId: string,
  toId: string,
): StoredNavLayout {
  const current = normalizeNavLayout(layout);
  const submenu = current.submenus[primaryId] ?? [];
  return {
    ...current,
    submenus: { ...current.submenus, [primaryId]: moveId(submenu, fromId, toId) },
  };
}

export function hidePrimary(layout: StoredNavLayout, id: string): StoredNavLayout {
  const current = normalizeNavLayout(layout);
  if (!isHidablePrimaryId(id) || current.hiddenPrimaryIds.includes(id)) return current;
  return { ...current, hiddenPrimaryIds: [...current.hiddenPrimaryIds, id] };
}

export function showPrimary(layout: StoredNavLayout, id: string): StoredNavLayout {
  const current = normalizeNavLayout(layout);
  if (!current.hiddenPrimaryIds.includes(id)) return current;
  return { ...current, hiddenPrimaryIds: current.hiddenPrimaryIds.filter((item) => item !== id) };
}

export function togglePrimaryHidden(layout: StoredNavLayout, id: string): StoredNavLayout {
  const current = normalizeNavLayout(layout);
  if (!isHidablePrimaryId(id)) return current;
  return current.hiddenPrimaryIds.includes(id) ? showPrimary(current, id) : hidePrimary(current, id);
}

export function addSubmenuLink(
  layout: StoredNavLayout,
  primaryId: string,
  linkId: string,
): StoredNavLayout {
  return applyNavDrop(layout, linkId, { type: "into", id: primaryId });
}

export function removeSubmenuLink(
  layout: StoredNavLayout,
  primaryId: string,
  linkId: string,
): StoredNavLayout {
  const current = normalizeNavLayout(layout);
  const submenu = current.submenus[primaryId] ?? [];
  if (!submenu.includes(linkId)) return current;
  return applyNavDrop(current, linkId, { type: "end-primary" });
}

export function availableSubmenuLinks(
  layout: StoredNavLayout,
  primaryId: string,
  options: { isAdmin?: boolean } = {},
): NavLinkDef[] {
  const current = normalizeNavLayout(layout);
  const taken = allUsedIds(current.primaryOrder, current.submenus);
  taken.add(primaryId);
  const isAdmin = options.isAdmin !== false;
  return NAV_LINK_CATALOG.filter((link) => {
    if (taken.has(link.id)) return false;
    if (!isAdmin && link.adminOnly) return false;
    return true;
  });
}

export function flattenResolvedNav(rows: ResolvedNavRow[]): NavLinkDef[] {
  const seen = new Set<string>();
  const out: NavLinkDef[] = [];
  for (const row of rows) {
    if (row.kind !== "item" || row.hidden) continue;
    const pack = [row.link, ...row.submenu];
    for (const link of pack) {
      const key = `${link.href}::${link.label}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(link);
    }
  }
  return out;
}

/** Primary that owns this path (submenu first). Home exact-match and personal settings return "". */
export function primaryIdForPath(pathname: string, layout?: StoredNavLayout | null, isAdmin = true): string {
  if (isPersonalSettingsPath(pathname)) return "";
  const rows = resolveNavLayout(layout, { isAdmin }).filter((row): row is ResolvedNavItem => row.kind === "item");
  const home = rows.find((row) => row.id === "home");
  if (home && navLinkIsActive(pathname, home.link)) return "";
  for (const row of rows) {
    if (row.submenu.some((item) => navLinkIsActive(pathname, item))) return row.id;
  }
  for (const row of rows) {
    if (navLinkIsActive(pathname, row.link)) return row.id;
  }
  return "";
}

export function navActorKey(userId: string): string {
  return `user:${userId}`;
}

export function visibleForRole<T extends { adminOnly?: boolean; id?: string }>(
  items: T[],
  isAdmin: boolean,
): T[] {
  if (isAdmin) return items;
  return items.filter((item) => !item.adminOnly && !isAdminOnlyNavId(item.id ?? ""));
}
