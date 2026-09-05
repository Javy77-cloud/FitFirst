/** Prefixes that should light the same left-nav row. */
const PREFIX_ALIASES: Record<string, string[]> = {
  "/accounts": ["/businesses"],
  "/documents": ["/forms"],
  "/deals": ["/pipeline"],
};

export function navHrefPath(href: string): string {
  const q = href.indexOf("?");
  return q === -1 ? href : href.slice(0, q);
}

/** True when this sidebar href owns the current pathname. Home is exact-only. */
export function navItemIsActive(pathname: string, href: string): boolean {
  const path = navHrefPath(href);
  const prefixes = [path, ...(PREFIX_ALIASES[path] ?? [])];
  return prefixes.some((prefix) => {
    if (prefix === "/") return pathname === "/";
    return pathname === prefix || pathname.startsWith(`${prefix}/`);
  });
}
