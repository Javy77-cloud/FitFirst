export const SEARCH_DEBOUNCE_MS = 200;

type LiveQueryEntry = {
  q: string;
  hydrated: boolean;
  listeners: Set<() => void>;
};

const modules = new Map<string, LiveQueryEntry>();

function entry(moduleId: string): LiveQueryEntry {
  let current = modules.get(moduleId);
  if (!current) {
    current = { q: "", hydrated: false, listeners: new Set() };
    modules.set(moduleId, current);
  }
  return current;
}

export function getLiveQuery(moduleId: string): string {
  return entry(moduleId).q;
}

export function isLiveQueryHydrated(moduleId: string): boolean {
  return entry(moduleId).hydrated;
}

export function setLiveQuery(moduleId: string, q: string) {
  const current = entry(moduleId);
  current.hydrated = true;
  if (current.q === q) return;
  current.q = q;
  for (const listener of current.listeners) listener();
}

export function subscribeLiveQuery(moduleId: string, listener: () => void): () => void {
  const current = entry(moduleId);
  current.listeners.add(listener);
  return () => {
    current.listeners.delete(listener);
  };
}

export function hydrateLiveQuery(moduleId: string, initialQuery = "") {
  const current = entry(moduleId);
  if (current.hydrated) return;
  current.hydrated = true;
  current.q = initialQuery;
}

export function matchesContains(query: string, ...parts: Array<string | null | undefined | number>) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return parts
    .filter((part) => part != null && part !== "")
    .join(" ")
    .toLowerCase()
    .includes(q);
}

export function haystack(parts: Array<string | null | undefined | number>): string {
  return parts
    .filter((part) => part != null && part !== "")
    .join(" ")
    .trim();
}

export function replaceQueryParam(param: string, value: string) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  const next = value.trim();
  if (next) url.searchParams.set(param, next);
  else url.searchParams.delete(param);
  const nextHref = `${url.pathname}${url.search}${url.hash}`;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (nextHref === current) return;
  window.history.replaceState(window.history.state, "", nextHref);
}

export function kindLabel(kind: string): string {
  switch (kind) {
    case "lead":
      return "Lead";
    case "deal":
      return "Deal";
    case "contact":
      return "Contact";
    case "business":
      return "Business";
    case "policy":
      return "Policy";
    case "carrier":
      return "Carrier";
    default:
      return kind;
  }
}
