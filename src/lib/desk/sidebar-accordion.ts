import { groupIdForPath, NAV_GROUPS } from "@/components/desk-nav-groups";

export const SIDEBAR_PREFS_KEY = "ff-sidebar-accordion:v1";

export type SidebarRail = "expanded" | "narrow";

export type SidebarPrefs = {
  openId: string;
  rail: SidebarRail;
};

const EMPTY_PREFS: SidebarPrefs = { openId: "", rail: "expanded" };

export function isNavGroupId(id: string): boolean {
  return NAV_GROUPS.some((group) => group.id === id);
}

/** Accordion: open the clicked section, or close it if it is already open. */
export function toggleAccordionId(current: string, clicked: string): string {
  if (!isNavGroupId(clicked)) return current;
  return current === clicked ? "" : clicked;
}

/** Active route wins so the current page stays visible; otherwise last-open. */
export function resolveOpenSection(pathname: string, remembered: string): string {
  const routeGroup = groupIdForPath(pathname);
  if (routeGroup && isNavGroupId(routeGroup)) return routeGroup;
  if (remembered && isNavGroupId(remembered)) return remembered;
  return "";
}

export function parseSidebarPrefs(raw: string | null | undefined): SidebarPrefs {
  if (!raw) return { ...EMPTY_PREFS };
  try {
    const parsed = JSON.parse(raw) as Partial<SidebarPrefs>;
    const openId = typeof parsed.openId === "string" && isNavGroupId(parsed.openId) ? parsed.openId : "";
    const rail: SidebarRail = parsed.rail === "narrow" ? "narrow" : "expanded";
    return { openId, rail };
  } catch {
    return { ...EMPTY_PREFS };
  }
}

export function readSidebarPrefs(): SidebarPrefs {
  if (typeof window === "undefined") return { ...EMPTY_PREFS };
  try {
    return parseSidebarPrefs(window.localStorage.getItem(SIDEBAR_PREFS_KEY));
  } catch {
    return { ...EMPTY_PREFS };
  }
}

export function writeSidebarPrefs(prefs: SidebarPrefs): void {
  if (typeof window === "undefined") return;
  try {
    const openId = isNavGroupId(prefs.openId) ? prefs.openId : "";
    const rail: SidebarRail = prefs.rail === "narrow" ? "narrow" : "expanded";
    window.localStorage.setItem(SIDEBAR_PREFS_KEY, JSON.stringify({ openId, rail }));
  } catch {
    /* private mode / quota */
  }
}
