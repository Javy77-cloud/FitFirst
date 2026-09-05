/** Retired left-nav destinations that still appear in accordion / customize prefs. */

export const RETIRED_NAV_IDS: Record<string, string> = {
  pipeline: "deals",
};

export const RETIRED_NAV_PATHS: Record<string, string> = {
  "/pipeline": "/deals",
};

export function remapNavId(id: string): string {
  return RETIRED_NAV_IDS[id] ?? id;
}

export function remapNavIds(ids: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    const next = remapNavId(id);
    if (seen.has(next)) continue;
    seen.add(next);
    out.push(next);
  }
  return out;
}

/** Merge submenu rows after a retired primary lands on its live module. */
export function remapNavSubmenus(submenus: Record<string, readonly string[]>): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const [key, items] of Object.entries(submenus)) {
    const dest = remapNavId(key);
    const remapped = remapNavIds(items).filter((id) => id !== dest);
    const existing = out[dest] ?? [];
    const seen = new Set(existing);
    const merged = [...existing];
    for (const id of remapped) {
      if (seen.has(id)) continue;
      seen.add(id);
      merged.push(id);
    }
    out[dest] = merged;
  }
  return out;
}

export function remapNavPath(pathname: string): string {
  const path = (pathname.split("?")[0] || "/").replace(/\/$/, "") || "/";
  if (path === "/pipeline" || path.startsWith("/pipeline/")) {
    return path.replace(/^\/pipeline/, "/deals");
  }
  return path;
}

export function isRetiredPipelinePath(pathname: string): boolean {
  const path = (pathname.split("?")[0] || "/").replace(/\/$/, "") || "/";
  return path === "/pipeline" || path.startsWith("/pipeline/");
}
