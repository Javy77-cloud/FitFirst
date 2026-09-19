import {
  getNavLink,
  isAdminOnlyNavId,
  isDeveloperOnlyNavId,
  isPersonalSettingsPath,
  NAV_LINK_CATALOG,
  navLinkIsActive,
  type NavLinkDef,
} from "@/lib/desk/nav-catalog";
import { remapNavIds, remapNavSubmenus } from "@/lib/desk/nav-aliases";

/** Bump when the signed default rail changes so stale per-user prefs reset. */
export const NAV_LAYOUT_VERSION = 13 as const;
export const DIVIDER_ID = "divider";

/** Admin-only Operations folder. Default rail places it top-level; Customize can nest or promote it. */
export const OPERATIONS_NAV_IDS = [
  "billing",
  "claims",
  "endorsements",
  "compliance",
  "carrier-download",
  "book-health",
  "book-of-life",
  "marketplace",
] as const;

/** Flat Policies kids. Parent click = My Book (/policies); no My Book folder. */
export const POLICIES_DEFAULT_KIDS = ["renewals", "certificates"] as const;

/** Catalog extras that used to nest in the default rail — Customize can still add them. */
export const CATALOG_ONLY_DEFAULT_EXTRAS = [
  "quotes",
  "work-queue",
  "phone",
  "scorecards",
  "glance",
  "commissions",
] as const;

/**
 * Shared initial left rail for admin + agents (Rivera prefs / full CRM strip).
 * Divider splits main CRM from utility. Agents still filter adminOnly at resolve time.
 */
export const DEFAULT_PRIMARY_ORDER = [
  "home",
  "leads",
  "deals",
  "contacts",
  "business",
  "policies",
  "carriers",
  "calendar",
  "templates",
  DIVIDER_ID,
  "reports",
  "settings",
  "admin",
  "operations",
] as const;

/** Same initial rail as admin; adminOnly links filtered for agents at resolve time. */
export const AGENT_PRIMARY_ORDER = DEFAULT_PRIMARY_ORDER;

export const DEFAULT_COLLAPSED_IDS = ["business", "carriers"] as const;

/** Items typically after the divider (utility strip). */
export const UTILITY_PRIMARY_IDS = [
  "reports",
  "settings",
  "admin",
  "operations",
] as const;

export const DEFAULT_SUBMENUS: Record<string, readonly string[]> = {
  home: [],
  leads: [],
  deals: [],
  contacts: [],
  policies: POLICIES_DEFAULT_KIDS,
  renewals: [],
  business: [],
  carriers: [],
  calendar: [],
  templates: ["email-signatures", "email-templates", "document-templates"],
  reports: [],
  settings: [],
  admin: [
    "agents",
    "integrations",
    "automations",
    "triggers",
    "commission-rates",
    "lines",
    "offices",
    "agency",
  ],
  operations: OPERATIONS_NAV_IDS,
};

export type PersonalDeskPrefs = {
  timezone?: string;
  emailSignature?: string;
  notifyInApp?: boolean;
  /** Desk date display: mdy (default) | ymd | dmy */
  dateFormat?: string;
};

export type StoredNavLayout = {
  version: number;
  primaryOrder: string[];
  hiddenPrimaryIds: string[];
  submenus: Record<string, string[]>;
  personal?: PersonalDeskPrefs;
};

export type ResolvedSubmenuItem = NavLinkDef & {
  children: NavLinkDef[];
};

export type ResolvedNavItem = {
  kind: "item";
  id: string;
  hidden: boolean;
  hidable: boolean;
  defaultCollapsed: boolean;
  adminOnly: boolean;
  developerOnly: boolean;
  link: NavLinkDef;
  submenu: ResolvedSubmenuItem[];
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
  if (typeof value.dateFormat === "string") personal.dateFormat = value.dateFormat;
  return Object.keys(personal).length ? personal : undefined;
}

export type NavLayoutOptions = { isAdmin?: boolean; isDeveloper?: boolean };

export function navLinkVisible(
  link: Pick<NavLinkDef, "adminOnly" | "developerOnly">,
  options: NavLayoutOptions = {},
): boolean {
  const isAdmin = options.isAdmin !== false;
  const isDeveloper = options.isDeveloper === true;
  if (link.adminOnly && !isAdmin) return false;
  if (link.developerOnly && !isDeveloper) return false;
  return true;
}

export function defaultStoredNavLayout(options: NavLayoutOptions = {}): StoredNavLayout {
  const isAdmin = options.isAdmin !== false;
  return {
    version: NAV_LAYOUT_VERSION,
    primaryOrder: isAdmin ? [...DEFAULT_PRIMARY_ORDER] : [...AGENT_PRIMARY_ORDER],
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

function insertMissingDefaults(
  primaryOrder: string[],
  used: Set<string>,
  defaults: readonly string[] = DEFAULT_PRIMARY_ORDER,
): string[] {
  const next = [...primaryOrder];
  for (const id of defaults) {
    if (used.has(id)) continue;
    const defaultIndex = defaults.indexOf(id);
    let insertAt = next.length;
    for (let i = defaultIndex - 1; i >= 0; i--) {
      const neighbor = defaults[i];
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
export function normalizeNavLayout(raw: unknown, options: NavLayoutOptions = {}): StoredNavLayout {
  const isAdmin = options.isAdmin !== false;
  const fallback = defaultStoredNavLayout({ isAdmin });
  const defaultOrder = isAdmin ? DEFAULT_PRIMARY_ORDER : AGENT_PRIMARY_ORDER;
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

  let primaryOrder = insertMissingDefaults(
    knownSaved.filter((id) => !isDividerId(id) || true),
    used,
    defaultOrder,
  );
  primaryOrder = uniqueKnown(primaryOrder);

  if (!primaryOrder.includes(DIVIDER_ID)) {
    const carriersAt = primaryOrder.indexOf("carriers");
    const calendarAt = primaryOrder.indexOf("calendar");
    const insertAt = carriersAt >= 0 ? carriersAt + 1 : calendarAt >= 0 ? calendarAt : primaryOrder.length;
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

  for (const [parent, defaults] of Object.entries(DEFAULT_SUBMENUS)) {
    if (submenus[parent]) continue;
    if (!used.has(parent) && !primaryOrder.includes(parent)) continue;
    submenus[parent] = uniqueKnown(
      defaults.filter((item) => item !== parent && !used.has(item)),
      used,
    );
    for (const child of submenus[parent]) used.add(child);
  }

  const savedHidden = Array.isArray(parsed.hiddenPrimaryIds)
    ? parsed.hiddenPrimaryIds.filter((id): id is string => typeof id === "string")
    : [];
  const hiddenPrimaryIds = uniqueKnown(savedHidden.filter((id) => isHidablePrimaryId(id)));

  return {
    version: NAV_LAYOUT_VERSION,
    primaryOrder,
    hiddenPrimaryIds,
    submenus,
    personal,
  };
}

export function parseStoredNavLayout(
  raw: string | null | undefined,
  options: NavLayoutOptions = {},
): StoredNavLayout {
  if (!raw) return defaultStoredNavLayout(options);
  try {
    return normalizeNavLayout(JSON.parse(raw) as unknown, options);
  } catch {
    return defaultStoredNavLayout(options);
  }
}

export function resolveNavLayout(
  stored: StoredNavLayout | null | undefined,
  options: NavLayoutOptions = {},
): ResolvedNavRow[] {
  const isAdmin = options.isAdmin !== false;
  const isDeveloper = options.isDeveloper === true;
  // Honor saved Customize order for everyone. Agents still skip adminOnly links.
  // Default strip for agents comes from defaultStoredNavLayout({ isAdmin: false }).
  const layout = normalizeNavLayout(stored, { isAdmin, isDeveloper });
  let primaryOrder = layout.primaryOrder;
  if (
    isDeveloper &&
    !primaryOrder.includes("developer") &&
    !layout.hiddenPrimaryIds.includes("developer")
  ) {
    primaryOrder = [...primaryOrder, "developer"];
  }
  return primaryOrder
    .map((id): ResolvedNavRow | null => {
      if (isDividerId(id)) return { kind: "divider", id: DIVIDER_ID };
      const link = getNavLink(id);
      if (!link) return null;
      if (!navLinkVisible(link, { isAdmin, isDeveloper })) return null;
      const submenu = (layout.submenus[id] ?? [])
        .map((itemId): ResolvedSubmenuItem | null => {
          const item = getNavLink(itemId);
          if (!item) return null;
          if (!navLinkVisible(item, { isAdmin, isDeveloper })) return null;
          const children = (layout.submenus[itemId] ?? [])
            .map((childId) => getNavLink(childId))
            .filter((child): child is NavLinkDef => {
              if (!child) return false;
              return navLinkVisible(child, { isAdmin, isDeveloper });
            });
          return { ...item, children };
        })
        .filter((item): item is ResolvedSubmenuItem => Boolean(item));
      return {
        kind: "item",
        id,
        hidden: layout.hiddenPrimaryIds.includes(id),
        hidable: isHidablePrimaryId(id),
        defaultCollapsed: isDefaultCollapsedId(id),
        adminOnly: Boolean(link.adminOnly),
        developerOnly: Boolean(link.developerOnly),
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
    utility: rows.slice(dividerAt),
  };
}

function parentIdIn(submenus: Record<string, string[]>, id: string): string | null {
  for (const [parent, children] of Object.entries(submenus)) {
    if (children.includes(id)) return parent;
  }
  return null;
}

function folderExists(primaryOrder: string[], submenus: Record<string, string[]>, id: string): boolean {
  return primaryOrder.includes(id) || parentIdIn(submenus, id) !== null;
}

function isDescendantOf(submenus: Record<string, string[]>, ancestor: string, id: string): boolean {
  const kids = submenus[ancestor] ?? [];
  if (kids.includes(id)) return true;
  return kids.some((kid) => isDescendantOf(submenus, kid, id));
}

export function findParentId(layout: StoredNavLayout, id: string): string | null {
  const current = normalizeNavLayout(layout);
  return parentIdIn(current.submenus, id);
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

/** Resolve a drop key from a hit stack, skipping the row currently being dragged. */
export function dropKeyFromElementStack(stack: Array<Element | null | undefined>): string | null {
  for (const el of stack) {
    if (!el) continue;
    if (el.closest("[data-nav-dragging]")) continue;
    const target = el.closest("[data-nav-drop]") as HTMLElement | null;
    const key = target?.dataset.navDrop;
    if (key) return key;
  }
  return null;
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
    if (!isCatalogId(parentId) || isDividerId(parentId) || parentId === draggedId) return;
    if (!folderExists(next.primaryOrder, next.submenus, parentId)) return;
    if (isDescendantOf(next.submenus, draggedId, parentId)) return;
    const folder = [...(next.submenus[parentId] ?? [])];
    const withItem = insertAt(folder, index, draggedId);
    next = {
      ...next,
      primaryOrder: next.primaryOrder.filter((id) => id !== draggedId),
      submenus: { ...next.submenus, [parentId]: uniqueKnown(withItem), [draggedId]: orphanChildren },
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

  const targetParent = parentIdIn(next.submenus, target.id);
  const targetIsPrimary = next.primaryOrder.includes(target.id) || isDividerId(target.id);

  if (target.type === "into") {
    const nestedParent = parentIdIn(next.submenus, target.id);
    if (nestedParent) {
      const folder = next.submenus[nestedParent] ?? [];
      const at = folder.indexOf(target.id);
      placeInFolder(nestedParent, at < 0 ? folder.length : at + 1);
      return next;
    }
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

export function unusedCatalogLinks(
  layout: StoredNavLayout,
  options: NavLayoutOptions = {},
): NavLinkDef[] {
  const current = normalizeNavLayout(layout);
  const taken = allUsedIds(current.primaryOrder, current.submenus);
  const isAdmin = options.isAdmin !== false;
  const isDeveloper = options.isDeveloper === true;
  return NAV_LINK_CATALOG.filter((link) => {
    if (taken.has(link.id)) return false;
    // My Book is the Policies parent click — not a separate folder to re-add.
    if (link.id === "my-book") return false;
    if (!navLinkVisible(link, { isAdmin, isDeveloper })) return false;
    return true;
  });
}

/** Place an unused catalog row on the rail, just above the divider (end of primary). */
export function addCatalogLink(layout: StoredNavLayout, linkId: string): StoredNavLayout {
  const current = normalizeNavLayout(layout);
  if (!isCatalogId(linkId) || allUsedIds(current.primaryOrder, current.submenus).has(linkId)) {
    return current;
  }
  const dividerAt = current.primaryOrder.indexOf(DIVIDER_ID);
  if (dividerAt >= 0) {
    return applyNavDrop(current, linkId, { type: "before", id: DIVIDER_ID });
  }
  return applyNavDrop(current, linkId, { type: "end-primary" });
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
  options: NavLayoutOptions = {},
): NavLinkDef[] {
  const current = normalizeNavLayout(layout);
  const taken = allUsedIds(current.primaryOrder, current.submenus);
  taken.add(primaryId);
  const isAdmin = options.isAdmin !== false;
  const isDeveloper = options.isDeveloper === true;
  return NAV_LINK_CATALOG.filter((link) => {
    if (taken.has(link.id)) return false;
    // My Book is the Policies parent click — not a separate folder to re-add.
    if (link.id === "my-book") return false;
    if (!navLinkVisible(link, { isAdmin, isDeveloper })) return false;
    return true;
  });
}

export function flattenResolvedNav(rows: ResolvedNavRow[]): NavLinkDef[] {
  const seen = new Set<string>();
  const out: NavLinkDef[] = [];
  for (const row of rows) {
    if (row.kind !== "item" || row.hidden) continue;
    const pack = [row.link, ...row.submenu.flatMap((item) => [item, ...item.children])];
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
export function primaryIdForPath(
  pathname: string,
  layout?: StoredNavLayout | null,
  isAdmin = true,
  isDeveloper = false,
): string {
  if (isPersonalSettingsPath(pathname)) return "";
  const rows = resolveNavLayout(layout, { isAdmin, isDeveloper }).filter(
    (row): row is ResolvedNavItem => row.kind === "item",
  );
  const home = rows.find((row) => row.id === "home");
  if (home && navLinkIsActive(pathname, home.link)) return "";
  for (const row of rows) {
    if (
      row.submenu.some(
        (item) =>
          navLinkIsActive(pathname, item) ||
          item.children.some((child) => navLinkIsActive(pathname, child)),
      )
    ) {
      return row.id;
    }
  }
  for (const row of rows) {
    if (navLinkIsActive(pathname, row.link)) return row.id;
  }
  return "";
}

export function navActorKey(userId: string): string {
  return `user:${userId}`;
}

export function visibleForRole<T extends { adminOnly?: boolean; developerOnly?: boolean; id?: string }>(
  items: T[],
  isAdmin: boolean,
  isDeveloper = false,
): T[] {
  return items.filter((item) => {
    if ((item.adminOnly || isAdminOnlyNavId(item.id ?? "")) && !isAdmin) return false;
    if ((item.developerOnly || isDeveloperOnlyNavId(item.id ?? "")) && !isDeveloper) return false;
    return true;
  });
}
