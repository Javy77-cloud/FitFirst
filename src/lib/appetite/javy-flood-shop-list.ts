import { FIRST_WAVE_FLOOD, FLOOD_NAME_ALIASES } from "./first-wave";

/** Javy's curated Flood shop list (2026-09-23). Template until appetite predicts Flood markets. */
export const JAVY_FLOOD_SHOP_KEYS = FIRST_WAVE_FLOOD;

export const JAVY_FLOOD_SHOP_LABEL = "Load my Flood list";

export const JAVY_FLOOD_SHOP_NAMES = [
  "Neptune",
  "Selective",
  "Tower Hill",
  "Wright",
] as const;

/** Prefer the longest alias hit so "Wright National" wins over bare "Wright". */
function bestFloodAliasMatch<T extends { id: string; name: string }>(
  rows: T[],
  labels: string[],
  used: Set<string>,
): T | undefined {
  let best: T | undefined;
  let bestLen = -1;
  for (const row of rows) {
    if (used.has(row.id)) continue;
    const name = row.name.toLowerCase();
    for (const label of labels) {
      if (name.includes(label) && label.length > bestLen) {
        best = row;
        bestLen = label.length;
      }
    }
  }
  return best;
}

/** Resolve desk carrier rows to first-wave Flood order (name aliases). Skips missing. */
export function matchFloodShopCarriers<T extends { id: string; name: string }>(
  rows: T[],
): T[] {
  const out: T[] = [];
  const used = new Set<string>();
  for (const key of FIRST_WAVE_FLOOD) {
    const labels = FLOOD_NAME_ALIASES[key];
    const hit = bestFloodAliasMatch(rows, labels, used);
    if (hit) {
      used.add(hit.id);
      out.push(hit);
    }
  }
  return out;
}
