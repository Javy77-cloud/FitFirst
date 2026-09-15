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

export function currentDeskPath(current: Pick<NavigationOrigin, "pathname" | "search">): string {
  return `${current.pathname}${current.search}`;
}

export function resolveInternalDeskPath(href: string, current: NavigationOrigin): string | null {
  const trimmed = href.trim();
  if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("mailto:") || trimmed.startsWith("tel:")) {
    return null;
  }
  try {
    const url = new URL(trimmed, `${current.origin}${currentDeskPath(current)}`);
    if (url.origin !== current.origin) return null;
    return `${url.pathname}${url.search}`;
  } catch {
    return null;
  }
}

export function isInternalDeskNavigation(href: string, current: NavigationOrigin): boolean {
  const next = resolveInternalDeskPath(href, current);
  if (!next) return false;
  return next !== currentDeskPath(current);
}
