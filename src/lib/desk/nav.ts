/** Match a left-menu href to the current path, including nested record URLs. */
export function isNavActive(href: string, pathname: string): boolean {
  const path = (href.split("?")[0] || "/").replace(/\/$/, "") || "/";
  const current = pathname.replace(/\/$/, "") || "/";
  if (path === "/") return current === "/";
  return current === path || current.startsWith(`${path}/`);
}
