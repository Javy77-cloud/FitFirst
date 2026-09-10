import { FIRST_WAVE_FLOOD, FLOOD_NAME_ALIASES } from "./first-wave";

/** Javy's curated Flood shop list (2026-09-10). Template until appetite predicts Flood markets. */
export const JAVY_FLOOD_SHOP_KEYS = FIRST_WAVE_FLOOD;

export const JAVY_FLOOD_SHOP_LABEL = "Load my Flood list";

export const JAVY_FLOOD_SHOP_NAMES = [
  "Beyond Floods",
  "Neptune",
  "Selective",
  "Wright",
  "Flow Flood",
] as const;

/** Resolve desk carrier rows to first-wave Flood order (name aliases). Skips missing. */
export function matchFloodShopCarriers<T extends { id: string; name: string }>(
  rows: T[],
): T[] {
  const out: T[] = [];
  const used = new Set<string>();
  for (const key of FIRST_WAVE_FLOOD) {
    const labels = FLOOD_NAME_ALIASES[key];
    const hit = rows.find((row) => {
      if (used.has(row.id)) return false;
      const name = row.name.toLowerCase();
      return labels.some((label) => name.includes(label));
    });
    if (hit) {
      used.add(hit.id);
      out.push(hit);
    }
  }
  return out;
}
