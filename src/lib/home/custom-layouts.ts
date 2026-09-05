import { isUuid } from "@/lib/ids";
import { mergeHomeLayout, type WidgetPlacement } from "./layout";
import { parseHiddenWidgets, type HomeWidgetId } from "./presets";

export const HOME_LAYOUT_NAME_MAX = 48;

export type HomeCustomLayout = {
  id: string;
  name: string;
  placements: WidgetPlacement[];
  hiddenWidgets: HomeWidgetId[];
};

export function parseHomeLayoutName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const name = raw.trim().replace(/\s+/g, " ");
  if (!name || name.length > HOME_LAYOUT_NAME_MAX) return null;
  return name;
}

export function parseHomeLayoutId(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const id = raw.trim();
  return isUuid(id) ? id : null;
}

export function parseStoredHomeLayout(row: {
  id: string;
  name: string;
  placements: unknown;
  hiddenWidgets: unknown;
}): HomeCustomLayout {
  return {
    id: row.id,
    name: row.name.trim() || "Custom layout",
    placements: mergeHomeLayout(row.placements),
    hiddenWidgets: parseHiddenWidgets(row.hiddenWidgets),
  };
}

export function suggestedHomeLayoutName(existing: readonly { name: string }[]): string {
  const used = new Set(existing.map((row) => row.name.trim().toLowerCase()));
  if (!used.has("custom layout")) return "Custom layout";
  for (let n = 2; n < 100; n += 1) {
    const name = `Custom layout ${n}`;
    if (!used.has(name.toLowerCase())) return name;
  }
  return "Custom layout";
}
