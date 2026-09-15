export type NavigationOrigin = {
  pathname: string;
  search: string;
  origin: string;
};

export function hrefFromClickTarget(target: EventTarget | null): string | null {
  if (!(target instanceof Element)) return null;
  const anchor = target.closest("a");
  if (!anchor) return null;
  if (anchor.getAttribute("download") != null) return null;
  if (anchor.target && anchor.target !== "" && anchor.target !== "_self") return null;
  return anchor.getAttribute("href");
}

export function isInternalDeskNavigation(href: string, current: NavigationOrigin): boolean {
  const trimmed = href.trim();
  if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("mailto:") || trimmed.startsWith("tel:")) {
    return false;
  }
  try {
    const url = new URL(trimmed, current.origin);
    if (url.origin !== current.origin) return false;
    const nextSearch = url.search;
    if (url.pathname === current.pathname && nextSearch === current.search) return false;
    return true;
  } catch {
    return false;
  }
}
