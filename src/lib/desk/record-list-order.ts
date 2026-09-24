/** Persist the filtered/sorted list order so detail pages can prev/next in that order. */

export type RecordListModule = "contacts" | "accounts";

const PREFIX = "ff:list-order:";

export function listOrderStorageKey(module: RecordListModule): string {
  return `${PREFIX}${module}`;
}

export type StoredListOrder = {
  ids: string[];
  /** ISO timestamp — unused for now, handy for debugging. */
  savedAt: string;
};

export function readListOrder(module: RecordListModule): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(listOrderStorageKey(module));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredListOrder | string[];
    if (Array.isArray(parsed)) {
      return parsed.filter((id): id is string => typeof id === "string" && id.length > 0);
    }
    if (parsed && Array.isArray(parsed.ids)) {
      return parsed.ids.filter((id): id is string => typeof id === "string" && id.length > 0);
    }
  } catch {
    /* ignore corrupt storage */
  }
  return [];
}

export function writeListOrder(module: RecordListModule, ids: readonly string[]): void {
  if (typeof window === "undefined") return;
  const clean = [...new Set(ids.filter((id) => typeof id === "string" && id.length > 0))];
  const payload: StoredListOrder = { ids: clean, savedAt: new Date().toISOString() };
  try {
    sessionStorage.setItem(listOrderStorageKey(module), JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}

export function listPosition(
  ids: readonly string[],
  currentId: string,
): { index: number; total: number } | null {
  const index = ids.indexOf(currentId);
  if (index < 0 || ids.length === 0) return null;
  return { index, total: ids.length };
}

export function detailHref(
  module: RecordListModule,
  id: string,
  tab: string | null | undefined,
): string {
  const base = module === "contacts" ? `/contacts/${id}` : `/accounts/${id}`;
  if (tab && tab.trim()) return `${base}?tab=${encodeURIComponent(tab.trim())}`;
  return base;
}
