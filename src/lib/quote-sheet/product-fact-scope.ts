import type { QuoteSheetFieldValue } from "@/lib/db/schema";
import { PROPERTY_CHARACTERISTIC_FIELDS } from "@/lib/deals/product-property";

/**
 * Risk, coverage, and insured-location cells belong to one product.
 * On a multi-product deal they must not be copied from the shared Deal Details
 * bag or from deals.coverageAmount (one number for the whole deal).
 * Applicant and co-applicant identity stay shared.
 */
const EXTRA_CROSS_PRODUCT_FACT_KEYS = [
  "address1",
  "city",
  "state",
  "zip",
  "county",
  "property_address",
  "mailing_unit",
  "current_carrier",
  "quote_effective_date",
  "effective_date",
  "current_policy_effective_date",
  "expiration_date",
  "lease_term",
  "tenant_name",
  "landlord_liability",
  "loss_of_rents",
  "animals",
  "primary_heat",
  "business_on_premises",
  "months_occupied",
  "resided_under_2_years",
  "new_purchase",
  "purchase_date",
  "within_city_limits",
  "sale_price",
  "screen_enclosure",
  "prior_address",
  "mobile_home",
  "tie_downs",
  "structure_type",
  "coverage_b",
  "coverage_c",
  "coverage_d",
  "coverage_e",
  "coverage_f",
  "aop_deductible",
  "hurricane_deductible",
  "wind_hail_deductible",
  "building_deductible",
  "contents_deductible",
  "ordinance_law",
  "water_backup",
  "own_rent",
  "central_alarm",
  "claims_5yr",
  "passive_restraints",
] as const;

export const CROSS_PRODUCT_FACT_KEYS: ReadonlySet<string> = new Set<string>([
  ...PROPERTY_CHARACTERISTIC_FIELDS,
  ...EXTRA_CROSS_PRODUCT_FACT_KEYS,
]);

/** Insured location. The first property product may still read its own deal/risk address. */
export const SHARED_PROPERTY_ADDRESS_KEYS: ReadonlySet<string> = new Set<string>([
  "address1",
  "city",
  "state",
  "zip",
  "county",
  "property_address",
  "mailing_unit",
]);

export function isCrossProductFactKey(key: string): boolean {
  return CROSS_PRODUCT_FACT_KEYS.has(key);
}

export function isSharedPropertyAddressKey(key: string): boolean {
  return SHARED_PROPERTY_ADDRESS_KEYS.has(key);
}

export function isDealDetailsSourceLabel(label: string | null | undefined): boolean {
  return (label ?? "").trim().toLowerCase() === "deal details";
}

/** A sibling product's coverage/risk stamped by Deal fill — safe for this product's dec to replace. */
export function isDealDetailsProductFact(
  key: string,
  field?: QuoteSheetFieldValue | null,
  options?: { includeAddress?: boolean },
): boolean {
  if (!field || !isCrossProductFactKey(key)) return false;
  if (!options?.includeAddress && isSharedPropertyAddressKey(key)) return false;
  if (!field.value.trim() || field.status === "missing") return false;
  return isDealDetailsSourceLabel(field.sourceLabel);
}

export function clearCrossProductDealFacts(
  values: Record<string, QuoteSheetFieldValue>,
  options?: { includeAddress?: boolean },
): { values: Record<string, QuoteSheetFieldValue>; clearedKeys: string[] } {
  const next: Record<string, QuoteSheetFieldValue> = { ...values };
  const clearedKeys: string[] = [];
  for (const key of Object.keys(next)) {
    if (!isDealDetailsProductFact(key, next[key], options)) continue;
    next[key] = { value: "", status: "missing", source: "blank" };
    clearedKeys.push(key);
  }
  return { values: next, clearedKeys };
}

/**
 * Opening a product must not show another product's Coverage A / risk facts
 * that Deal fill copied from the shared deal record. Does not persist.
 * Address stamps are hidden only on a later product (includeAddress).
 */
export function hideCrossProductDealFacts(
  values: Record<string, QuoteSheetFieldValue>,
  multiProduct: boolean,
  options?: { includeAddress?: boolean },
): Record<string, QuoteSheetFieldValue> {
  if (!multiProduct) return values;
  const cleared = clearCrossProductDealFacts(values, options);
  return cleared.clearedKeys.length ? cleared.values : values;
}
