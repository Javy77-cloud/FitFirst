import {
  mergeHomeLayout,
  type NamedHomeLayout,
  type WidgetPlacement,
} from "@/lib/home/layout";

const MAX_NAME = 48;
const MAX_LAYOUTS = 24;

export function normalizeLayoutName(raw: string | null | undefined): string {
  return (raw ?? "").trim().replace(/\s+/g, " ").slice(0, MAX_NAME);
}

export function parseNamedHomeLayouts(raw: unknown): NamedHomeLayout[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const next: NamedHomeLayout[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const id = (row as { id?: unknown }).id;
    const name = normalizeLayoutName(String((row as { name?: unknown }).name ?? ""));
    if (typeof id !== "string" || !id.trim() || !name) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    const hidden = (row as { hiddenWidgets?: unknown }).hiddenWidgets;
    next.push({
      id,
      name,
      placements: mergeHomeLayout((row as { placements?: unknown }).placements),
      hiddenWidgets: Array.isArray(hidden) ? hidden.filter((item): item is string => typeof item === "string") : [],
    });
    if (next.length >= MAX_LAYOUTS) break;
  }
  return next;
}

export function upsertNamedHomeLayout(
  list: NamedHomeLayout[],
  layout: NamedHomeLayout,
): NamedHomeLayout[] {
  const name = normalizeLayoutName(layout.name);
  if (!name) return list;
  const row: NamedHomeLayout = {
    id: layout.id,
    name,
    placements: mergeHomeLayout(layout.placements),
    hiddenWidgets: layout.hiddenWidgets.filter((item) => typeof item === "string"),
  };
  const index = list.findIndex((item) => item.id === row.id);
  if (index >= 0) {
    const next = list.slice();
    next[index] = row;
    return next;
  }
  if (list.length >= MAX_LAYOUTS) return list;
  return [...list, row];
}

export function renameNamedHomeLayout(
  list: NamedHomeLayout[],
  id: string,
  name: string,
): NamedHomeLayout[] {
  const nextName = normalizeLayoutName(name);
  if (!id || !nextName) return list;
  return list.map((item) => (item.id === id ? { ...item, name: nextName } : item));
}

export function findNamedHomeLayout(
  list: NamedHomeLayout[],
  id: string | null | undefined,
): NamedHomeLayout | null {
  if (!id) return null;
  return list.find((item) => item.id === id) ?? null;
}

export function placementsForLayout(
  list: NamedHomeLayout[],
  id: string | null | undefined,
): WidgetPlacement[] | null {
  return findNamedHomeLayout(list, id)?.placements ?? null;
}
