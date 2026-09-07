import type { ShopLine } from "@/lib/domain";
import { fieldsForLine } from "@/lib/quote-sheet/catalog";

/** Fields a broker needs before running markets. Not a weight or score. */
export const HOME_SHOP_KEYS = [
  "address1",
  "city",
  "county",
  "state",
  "zip",
  "year_built",
  "stories",
  "construction",
  "occupancy",
  "roof_year",
  "roof_covering",
  "opening_protection",
  "miles_to_coast",
  "coverage_a",
] as const;

/** Extra fields that typically block bind / issue, not the first shop pass. */
export const HOME_BIND_KEYS = [
  "square_feet",
  "protection_class",
  "replacement_cost_estimate",
  "hurricane_deductible",
  "aop_deductible",
  "four_point_date",
  "wind_mit_form",
] as const;

export const AUTO_SHOP_KEYS = [
  "vin",
  "vehicle_year",
  "vehicle_make",
  "vehicle_model",
  "garaging_zip",
  "liability_bi",
] as const;

export const AUTO_BIND_KEYS = [
  "comp_deductible",
  "collision_deductible",
  "current_carrier",
] as const;

const FLOOD_SHOP_KEYS = ["flood_zone", "building_limit"] as const;
const GL_SHOP_KEYS = ["occupancy", "class_code", "limit"] as const;
const WC_SHOP_KEYS = ["class_code", "payroll"] as const;

const SHOP: Partial<Record<ShopLine, readonly string[]>> = {
  home: HOME_SHOP_KEYS,
  auto: AUTO_SHOP_KEYS,
  flood: FLOOD_SHOP_KEYS,
  general_liability: GL_SHOP_KEYS,
  workers_comp: WC_SHOP_KEYS,
};

const BIND: Partial<Record<ShopLine, readonly string[]>> = {
  home: HOME_BIND_KEYS,
  auto: AUTO_BIND_KEYS,
};

export function shopKeysForLine(line: ShopLine): string[] {
  if (SHOP[line]) return [...SHOP[line]!];
  return fieldsForLine(line)
    .filter((field) => field.key !== "notes")
    .map((field) => field.key);
}

export function bindKeysForLine(line: ShopLine): string[] {
  const shop = new Set(shopKeysForLine(line));
  const extra = BIND[line] ?? [];
  return [...shop, ...extra.filter((key) => !shop.has(key))];
}

export function fieldLabel(line: ShopLine, key: string): string {
  return fieldsForLine(line).find((field) => field.key === key)?.label ?? key;
}
