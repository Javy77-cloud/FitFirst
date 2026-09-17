import { SOUTHERN_OAK_HO_APPETITE, TRIDENT_HO_APPETITE } from "@/lib/appetite/published-appetite";
import { SOUTHERN_OAK_CARRIER_ID, TRIDENT_CARRIER_ID } from "@/lib/fixtures/ids";

/**
 * Javy's curated Home shop list (from Rosa Markets 2026-09-08).
 * IDs are live Neon `carriers.id` values (same mix as the rest of this list:
 * imported UUIDs plus 3333… seed IDs that exist on the desk after migrate).
 *
 * Trident: `TRIDENT_CARRIER_ID` is the UUID `drizzle/0123_trident_reciprocal_ho.sql`
 * and `seedTridentReciprocal()` write to Neon. If a Trident / Trident Reciprocal
 * row already exists under another id, `resolveHomeShopCarrierIds` uses that live id.
 *
 * Southern Oak: `SOUTHERN_OAK_CARRIER_ID` is the live Neon desk UUID already on
 * this list. `drizzle/0127_southern_oak_qrg.sql` and `seedSouthernOak()` enrich
 * that row — they never insert a second Southern Oak name.
 */
export const JAVY_HOME_SHOP_CARRIER_IDS = [
  "33333333-3333-4333-8333-333333333309", // American Integrity
  "e66c7eef-e6a2-44e5-8255-9fe15b11803d", // American Traditions
  "cbe2e171-1cac-4c49-8204-04787dfcbae3", // Amwins
  "893d2a8a-fb17-44f6-8f50-7559cfd67947", // Edison
  "6a0f669f-1489-4501-83cf-197b0c90db93", // Florida Peninsula
  "33333333-3333-4333-8333-333333333304", // Homeowners Choice
  "30d799b5-6f40-45f9-8c6d-51b0adf9b19e", // Monarch
  "e0165738-a0b3-4a9a-844c-3d3445691003", // Ovation
  "a68cfc6e-2660-4aa5-88c9-86ffbc4e38dc", // Patriot Select
  "67d52980-9167-4d94-8017-23509ded489a", // People's Trust
  SOUTHERN_OAK_CARRIER_ID, // Southern Oak (live Neon desk id — enrich in place)
  "a11e04a4-7fa6-43fe-8db5-f2d1afae4c85", // Tower Hill
  TRIDENT_CARRIER_ID, // Trident Reciprocal Exchange
  "0c3ec003-aa2d-44b0-89d2-8d85021d942e", // TypTap
  "76ccf3a7-68c2-436b-8642-554cf96391c2", // Universal P&C
  "33333333-3333-4333-8333-333333333310", // VAVE / Lloyd's
  "33333333-3333-4333-8333-333333333305", // VYRD
] as const;

export const JAVY_HOME_SHOP_LABEL = "Load my Home list";

export const JAVY_HOME_SHOP_NAMES = [
  "American Integrity",
  "American Traditions",
  "Amwins",
  "Edison",
  "Florida Peninsula",
  "Homeowners Choice",
  "Monarch",
  "Ovation",
  "Patriot Select",
  "People's Trust",
  "Southern Oak",
  "Tower Hill",
  "Trident Reciprocal Exchange",
  "TypTap",
  "Universal P&C",
  "VAVE / Lloyd's",
  "VYRD",
] as const;

/** Name fallback when a shop-list UUID is missing (existing Trident under an alias, etc.). */
export const HOME_SHOP_NAME_ALIASES: Partial<Record<string, string[]>> = {
  [TRIDENT_CARRIER_ID]: TRIDENT_HO_APPETITE.aliases,
  [SOUTHERN_OAK_CARRIER_ID]: SOUTHERN_OAK_HO_APPETITE.aliases,
};

/** Resolve desk carrier rows to the Home shop list. Prefers seeded UUIDs; falls back to aliases. Skips missing. */
export function resolveHomeShopCarrierIds<T extends { id: string; name: string }>(
  rows: T[],
): string[] {
  const used = new Set<string>();
  const out: string[] = [];
  for (const id of JAVY_HOME_SHOP_CARRIER_IDS) {
    if (rows.some((row) => row.id === id) && !used.has(id)) {
      used.add(id);
      out.push(id);
      continue;
    }
    const aliases = HOME_SHOP_NAME_ALIASES[id];
    if (!aliases) continue;
    const hit = rows.find((row) => {
      if (used.has(row.id)) return false;
      const name = row.name.toLowerCase();
      return aliases.some((label) => name.includes(label));
    });
    if (hit) {
      used.add(hit.id);
      out.push(hit.id);
    }
  }
  return out;
}
