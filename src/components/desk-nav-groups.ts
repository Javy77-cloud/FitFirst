import type { LucideIcon } from "lucide-react";
import { Home } from "lucide-react";
import { getNavLink, navLinkIsActive, type NavLinkDef } from "@/lib/desk/nav-catalog";
import {
  flattenResolvedNav,
  PINNED_PRIMARY_IDS,
  primaryIdForPath,
  resolveNavLayout,
} from "@/lib/desk/nav-layout";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  match?: string;
  exact?: boolean;
};

export type NavGroup = {
  id: string;
  label: string;
  icon: LucideIcon;
  items: NavItem[];
};

function asItem(link: NavLinkDef): NavItem {
  return {
    href: link.href,
    label: link.label,
    icon: link.icon,
    match: link.match,
    exact: link.exact,
  };
}

const homeLink = getNavLink("home")!;

/** Home is a reorderable primary now; kept for older callers. */
export const PINNED_HOME: NavItem = asItem(homeLink);

const defaultResolved = resolveNavLayout(null);

export const NAV_GROUPS: NavGroup[] = defaultResolved.map((row) => ({
  id: row.id,
  label: row.link.label,
  icon: row.link.icon,
  items: row.submenu.map(asItem),
}));

export const FLAT_NAV: NavItem[] = flattenResolvedNav(defaultResolved).map(asItem);

export function pathIsActive(pathname: string, item: NavItem): boolean {
  return navLinkIsActive(pathname, item);
}

export function groupIdForPath(pathname: string): string {
  return primaryIdForPath(pathname);
}

export const PINNED_NAV_IDS = PINNED_PRIMARY_IDS;
export { Home };
