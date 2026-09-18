/** Pathname of an href, next-url, or Referer. Query and hash are ignored. */
export function hrefPathname(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const withoutHash = trimmed.split("#")[0] ?? trimmed;
  if (withoutHash.startsWith("/")) {
    const path = withoutHash.split("?")[0] ?? "";
    return path || null;
  }
  try {
    const path = new URL(withoutHash).pathname;
    return path || null;
  } catch {
    return null;
  }
}

/** Current page from Next.js server-action headers (`next-url`, then Referer). */
export function requestPathname(headerList: { get(name: string): string | null }): string | null {
  return hrefPathname(headerList.get("next-url")) ?? hrefPathname(headerList.get("referer"));
}

/** True when a flash/redirect href would reload the page the user is already on. */
export function isSamePageHref(currentPath: string | null | undefined, href: string): boolean {
  const dest = hrefPathname(href);
  if (!currentPath || !dest) return false;
  return currentPath === dest;
}
