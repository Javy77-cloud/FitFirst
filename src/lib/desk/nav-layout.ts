import { getNavLink, NAV_LINK_CATALOG, navLinkIsActive, type NavLinkDef } from "@/lib/desk/nav-catalog";

export const NAV_LAYOUT_VERSION = 1 as const;

/** Configurable primaries — drag these. Settings stays pinned at the bottom. */
export const DEFAULT_PRIMARY_ORDER = [
  "home",
  "leads",
  "deals",
  "pipeline",
  "contacts",
  "business",
  "policies",
  "carriers",
  "tasks",
  "calendar",
] as const;

export const PINNED_PRIMARY_IDS = ["settings"] as const;

export const DEFAULT_SUBMENUS: Record<string, readonly string[]> = {
  home: ["get-started", "social", "scorecards", "glance", "support"],
  leads: [],
  deals: ["quotes"],
  pipeline: [],
  contacts: ["merge"],
  business: [],
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
    "documents",
    "claims",
    "commissions",
    "decline-log",
  ],
  carriers: [],
  tasks: ["work-queue", "automations"],
  calendar: ["phone", "inbox", "alerts"],
  settings: [],
};

export type StoredNavLayout = {
  version: typeof NAV_LAYOUT_VERSION;
  primaryOrder: string[];
  /** Hidable primaries the user tucked away. Settings is never stored here. */
  hiddenPrimaryIds: string[];
  submenus: Record<string, string[]>;
};

export type ResolvedPrimary = {
  id: string;
  pinned: boolean;
  hidden: boolean;
  hidable: boolean;
  link: NavLinkDef;
  submenu: NavLinkDef[];
};

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

export function isPrimaryId(id: string): boolean {
  return (DEFAULT_PRIMARY_ORDER as readonly string[]).includes(id) || isPinnedPrimaryId(id);
}

export function isPinnedPrimaryId(id: string): boolean {
  return (PINNED_PRIMARY_IDS as readonly string[]).includes(id);
}

/** Settings stays on the rail so login / My desk / sign-out stay reachable. */
export function isHidablePrimaryId(id: string): boolean {
  return isPrimaryId(id) && !isPinnedPrimaryId(id);
}

export function isCatalogId(id: string): boolean {
  return Boolean(getNavLink(id));
}

function uniqueKnown(ids: string[], extraSkip?: Set<string>): string[] {
  const seen = extraSkip ? new Set(extraSkip) : new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    if (!isCatalogId(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

/** Merge a saved JSON blob with today's catalog so new modules still appear. */
export function normalizeNavLayout(raw: unknown): StoredNavLayout {
  const fallback = defaultStoredNavLayout();
  if (!raw || typeof raw !== "object") return fallback;
  const parsed = raw as Partial<StoredNavLayout>;
  const savedOrder = Array.isArray(parsed.primaryOrder)
    ? parsed.primaryOrder.filter((id): id is string => typeof id === "string")
    : [];
  const knownSaved = uniqueKnown(
    savedOrder.filter((id) => (DEFAULT_PRIMARY_ORDER as readonly string[]).includes(id)),
  );
  const missing = DEFAULT_PRIMARY_ORDER.filter((id) => !knownSaved.includes(id));
  const primaryOrder = [...knownSaved, ...missing];

  const savedSubs =
    parsed.submenus && typeof parsed.submenus === "object" && !Array.isArray(parsed.submenus)
      ? parsed.submenus
      : {};
  const submenus: Record<string, string[]> = {};
  for (const id of [...primaryOrder, ...PINNED_PRIMARY_IDS]) {
    const stored = Array.isArray(savedSubs[id]) ? savedSubs[id] : undefined;
    const source = stored ?? [...(DEFAULT_SUBMENUS[id] ?? [])];
    submenus[id] = uniqueKnown(source.filter((item) => item !== id));
  }

  const savedHidden = Array.isArray(parsed.hiddenPrimaryIds)
    ? parsed.hiddenPrimaryIds.filter((id): id is string => typeof id === "string")
    : [];
  const hiddenPrimaryIds = uniqueKnown(savedHidden.filter((id) => isHidablePrimaryId(id)));

  return { version: NAV_LAYOUT_VERSION, primaryOrder, hiddenPrimaryIds, submenus };
}

export function parseStoredNavLayout(raw: string | null | undefined): StoredNavLayout {
  if (!raw) return defaultStoredNavLayout();
  try {
    return normalizeNavLayout(JSON.parse(raw) as unknown);
  } catch {
    return defaultStoredNavLayout();
  }
}

export function resolveNavLayout(stored: StoredNavLayout | null | undefined): ResolvedPrimary[] {
  const layout = normalizeNavLayout(stored);
  const ids = [...layout.primaryOrder, ...PINNED_PRIMARY_IDS];
  return ids
    .map((id) => {
      const link = getNavLink(id);
      if (!link) return null;
      const submenu = (layout.submenus[id] ?? [])
        .map((itemId) => getNavLink(itemId))
        .filter((item): item is NavLinkDef => Boolean(item));
      return {
        id,
        pinned: isPinnedPrimaryId(id),
        hidden: layout.hiddenPrimaryIds.includes(id),
        hidable: isHidablePrimaryId(id),
        link,
        submenu,
      } satisfies ResolvedPrimary;
    })
    .filter((row): row is ResolvedPrimary => Boolean(row));
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
  if (isPinnedPrimaryId(id)) return current;
  return { ...current, primaryOrder: moveByDelta(current.primaryOrder, id, delta) };
}

export function nudgeSubmenu(
  layout: StoredNavLayout,
  primaryId: string,
  id: string,
  delta: number,
): StoredNavLayout {
  const current = normalizeNavLayout(layout);
  if (!isPrimaryId(primaryId)) return current;
  const submenu = current.submenus[primaryId] ?? [];
  return {
    ...current,
    submenus: { ...current.submenus, [primaryId]: moveByDelta(submenu, id, delta) },
  };
}

export function reorderPrimaries(layout: StoredNavLayout, fromId: string, toId: string): StoredNavLayout {
  const current = normalizeNavLayout(layout);
  if (isPinnedPrimaryId(fromId) || isPinnedPrimaryId(toId)) return current;
  return { ...current, primaryOrder: moveId(current.primaryOrder, fromId, toId) };
}

export function reorderSubmenu(
  layout: StoredNavLayout,
  primaryId: string,
  fromId: string,
  toId: string,
): StoredNavLayout {
  const current = normalizeNavLayout(layout);
  if (!isPrimaryId(primaryId)) return current;
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
  const current = normalizeNavLayout(layout);
  if (!isPrimaryId(primaryId) || !isCatalogId(linkId) || linkId === primaryId) return current;
  const submenu = current.submenus[primaryId] ?? [];
  if (submenu.includes(linkId)) return current;
  return {
    ...current,
    submenus: { ...current.submenus, [primaryId]: [...submenu, linkId] },
  };
}

export function removeSubmenuLink(
  layout: StoredNavLayout,
  primaryId: string,
  linkId: string,
): StoredNavLayout {
  const current = normalizeNavLayout(layout);
  if (!isPrimaryId(primaryId)) return current;
  const submenu = current.submenus[primaryId] ?? [];
  return {
    ...current,
    submenus: { ...current.submenus, [primaryId]: submenu.filter((id) => id !== linkId) },
  };
}

export function availableSubmenuLinks(layout: StoredNavLayout, primaryId: string): NavLinkDef[] {
  const current = normalizeNavLayout(layout);
  const taken = new Set(current.submenus[primaryId] ?? []);
  taken.add(primaryId);
  return NAV_LINK_CATALOG.filter((link) => !taken.has(link.id));
}

export function flattenResolvedNav(rows: ResolvedPrimary[]): NavLinkDef[] {
  const seen = new Set<string>();
  const out: NavLinkDef[] = [];
  for (const row of rows) {
    if (row.hidden) continue;
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

/** Primary that owns this path (submenu first). Home exact-match returns "". */
export function primaryIdForPath(pathname: string, layout?: StoredNavLayout | null): string {
  const rows = resolveNavLayout(layout);
  const home = rows.find((row) => row.id === "home");
  if (home && navLinkIsActive(pathname, home.link)) return "";
  if (pathname === "/settings" || pathname.startsWith("/settings/")) return "settings";
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
