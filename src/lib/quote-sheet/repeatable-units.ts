import {
  AUTO_ANNUAL_MILES_OPTIONS,
  AUTO_HOUSEHOLD_EXCLUDE_REASON_OPTIONS,
  AUTO_HOUSEHOLD_RELATIONSHIP_OPTIONS,
  AUTO_HOUSEHOLD_SEPARATE_POLICY_STATUS_OPTIONS,
  AUTO_HOUSEHOLD_STATUS_OPTIONS,
  AUTO_VEHICLE_USAGE_OPTIONS,
  VEHICLE_OWNERSHIP_OPTIONS,
  VEHICLE_OWNERSHIP_LENGTH_OPTIONS,
  COMMUTE_DAYS_WEEK_OPTIONS,
  VEHICLE_LIENHOLDER_OPTIONS,
  GENDER_OPTIONS,
  OCCUPATION_OPTIONS,
  EDUCATION_LEVEL_OPTIONS,
  EMPLOYMENT_STATUS_OPTIONS,
  YES_NO_OPTIONS,
} from "@/lib/quote-sheet/sheet-defaults";
import type { QuoteSheetFieldValue } from "@/lib/db/schema";
import type { SheetProduct } from "@/lib/quote-sheet/products";

export const PERSONAL_VEHICLE_CAP = 4;
/** Personal Auto drivers share the same 4-unit cap as vehicles. */
export const PERSONAL_DRIVER_CAP = PERSONAL_VEHICLE_CAP;
/** Household / related persons / excluded / listed non-drivers (FL Auto portals). */
export const PERSONAL_HOUSEHOLD_CAP = 8;
export const COMMERCIAL_VEHICLE_SOFT_CAP = 40;

export type RepeatableKind = "vehicle" | "driver" | "household";

export type RepeatableField = {
  suffix: string;
  label: string;
  input?: "text" | "number" | "select";
  options?: readonly string[];
};

export const VEHICLE_BLOCK_FIELDS: RepeatableField[] = [
  { suffix: "vin", label: "VIN" },
  { suffix: "year", label: "Year", input: "number" },
  { suffix: "make", label: "Make" },
  { suffix: "model", label: "Model" },
  { suffix: "body_class", label: "Body class" },
  { suffix: "fuel_type", label: "Fuel type" },
  { suffix: "engine", label: "Engine" },
  { suffix: "usage", label: "Usage", input: "select", options: AUTO_VEHICLE_USAGE_OPTIONS },
  {
    suffix: "ownership",
    label: "Ownership",
    input: "select",
    options: VEHICLE_OWNERSHIP_OPTIONS,
  },
  {
    suffix: "ownership_length",
    label: "Length of ownership",
    input: "select",
    options: VEHICLE_OWNERSHIP_LENGTH_OPTIONS,
  },
  {
    suffix: "lienholder",
    label: "Lienholder",
    input: "select",
    options: VEHICLE_LIENHOLDER_OPTIONS,
  },
  {
    suffix: "lienholder_other",
    label: "Lienholder (other / custom)",
  },
  {
    suffix: "purchased_new",
    label: "Purchased new?",
    input: "select",
    options: YES_NO_OPTIONS,
  },
  {
    suffix: "original_cost_new",
    label: "Original cost new (OCN)",
    input: "number",
  },
  {
    suffix: "annual_miles",
    label: "Annual miles",
    input: "select",
    options: AUTO_ANNUAL_MILES_OPTIONS,
  },
  {
    suffix: "commute_days_week",
    label: "Commute days / week",
    input: "select",
    options: COMMUTE_DAYS_WEEK_OPTIONS,
  },
  {
    suffix: "commute_miles_daily",
    label: "Miles driven daily",
    input: "number",
  },
  {
    suffix: "rideshare",
    label: "Used for rideshare (Uber / Lyft)?",
    input: "select",
    options: YES_NO_OPTIONS,
  },
  {
    suffix: "aftermarket_parts",
    label: "Any non-factory / aftermarket parts?",
    input: "select",
    options: YES_NO_OPTIONS,
  },
  { suffix: "garaging_zip", label: "Garaging ZIP" },
  { suffix: "garaging_address", label: "Address" },
];

export const DRIVER_BLOCK_FIELDS: RepeatableField[] = [
  { suffix: "name", label: "Name" },
  { suffix: "dob", label: "DOB" },
  { suffix: "gender", label: "Gender", input: "select", options: GENDER_OPTIONS },
  { suffix: "occupation", label: "Occupation / job category", input: "select", options: OCCUPATION_OPTIONS },
  { suffix: "employment", label: "Employment", input: "select", options: EMPLOYMENT_STATUS_OPTIONS },
  { suffix: "education_level", label: "Education level", input: "select", options: EDUCATION_LEVEL_OPTIONS },
  { suffix: "license", label: "License" },
  { suffix: "status", label: "Status" },
  { suffix: "years_licensed", label: "Years licensed", input: "number" },
];

export const HOUSEHOLD_BLOCK_FIELDS: RepeatableField[] = [
  { suffix: "name", label: "Name" },
  { suffix: "dob", label: "DOB" },
  {
    suffix: "relationship",
    label: "Relationship",
    input: "select",
    options: AUTO_HOUSEHOLD_RELATIONSHIP_OPTIONS,
  },
  {
    suffix: "status",
    label: "Household status",
    input: "select",
    options: AUTO_HOUSEHOLD_STATUS_OPTIONS,
  },
  {
    suffix: "exclude_reason",
    label: "Exclude reason (Non-Rated/Excluded)",
    input: "select",
    options: AUTO_HOUSEHOLD_EXCLUDE_REASON_OPTIONS,
  },
  {
    suffix: "separate_auto_policy",
    label: "Has separate auto policy?",
    input: "select",
    options: YES_NO_OPTIONS,
  },
  {
    suffix: "separate_policy_status",
    label: "Separate policy status",
    input: "select",
    options: AUTO_HOUSEHOLD_SEPARATE_POLICY_STATUS_OPTIONS,
  },
  {
    suffix: "age_first_licensed",
    label: "Age first licensed",
  },
  {
    suffix: "suspension_5yr",
    label: "Suspension in last 5 years?",
    input: "select",
    options: YES_NO_OPTIONS,
  },
];

const VEHICLE_1_KEYS: Record<string, string> = {
  vin: "vin",
  year: "vehicle_year",
  make: "vehicle_make",
  model: "vehicle_model",
  body_class: "vehicle_body_class",
  fuel_type: "vehicle_fuel_type",
  engine: "vehicle_engine",
  usage: "vehicle_usage",
  ownership: "vehicle_ownership",
  ownership_length: "vehicle_ownership_length",
  lienholder: "vehicle_lienholder",
  lienholder_other: "vehicle_lienholder_other",
  purchased_new: "purchased_new",
  original_cost_new: "original_cost_new",
  annual_miles: "annual_miles",
  commute_days_week: "commute_days_week",
  commute_miles_daily: "commute_miles_daily",
  rideshare: "rideshare",
  aftermarket_parts: "aftermarket_parts",
  garaging_zip: "garaging_zip",
  garaging_address: "garaging_address",
};

export function isCommercialAutoProduct(product?: string | null): boolean {
  return product === "commercial_auto";
}

export function vehicleCap(product?: string | null): number {
  return isCommercialAutoProduct(product) ? COMMERCIAL_VEHICLE_SOFT_CAP : PERSONAL_VEHICLE_CAP;
}

export function unitCap(kind: RepeatableKind, product?: string | null): number {
  if (kind === "household") return PERSONAL_HOUSEHOLD_CAP;
  if (kind === "driver") return PERSONAL_DRIVER_CAP;
  return vehicleCap(product);
}

export function canAddAnother(
  count: number,
  product?: string | null,
  kind: RepeatableKind = "vehicle",
): boolean {
  if (kind === "household") return count < PERSONAL_HOUSEHOLD_CAP;
  if (kind === "driver") return count < PERSONAL_DRIVER_CAP;
  if (isCommercialAutoProduct(product)) return true;
  return count < PERSONAL_VEHICLE_CAP;
}

export function fieldsForKind(kind: RepeatableKind): RepeatableField[] {
  if (kind === "vehicle") return VEHICLE_BLOCK_FIELDS;
  if (kind === "household") return HOUSEHOLD_BLOCK_FIELDS;
  return DRIVER_BLOCK_FIELDS;
}

export function repeatableFieldKey(kind: RepeatableKind, index: number, suffix: string): string {
  if (kind === "vehicle" && index === 1) {
    return VEHICLE_1_KEYS[suffix] ?? `vehicle_${suffix}`;
  }
  return `${kind}_${index}_${suffix}`;
}

export function isRepeatableSheetKey(key: string): boolean {
  if (Object.values(VEHICLE_1_KEYS).includes(key)) return true;
  return /^(vehicle|driver|household)_\d+_(vin|year|make|model|body_class|fuel_type|engine|usage|ownership|ownership_length|lienholder|lienholder_other|purchased_new|original_cost_new|annual_miles|commute_days_week|commute_miles_daily|rideshare|aftermarket_parts|garaging_zip|garaging_address|name|dob|gender|occupation|employment|education_level|license|status|years_licensed|relationship|exclude_reason|separate_auto_policy|separate_policy_status|age_first_licensed|suspension_5yr)$/.test(
    key,
  );
}

function cellFilled(cell?: QuoteSheetFieldValue): boolean {
  return Boolean(cell?.value.trim() && cell.status !== "missing");
}

export function unitHasValue(
  values: Record<string, QuoteSheetFieldValue | undefined>,
  kind: RepeatableKind,
  index: number,
): boolean {
  return fieldsForKind(kind).some((field) =>
    cellFilled(values[repeatableFieldKey(kind, index, field.suffix)]),
  );
}

/** Always start at vehicle/driver 1. Never open on vehicle 2 alone. */
export function visibleUnitCount(
  values: Record<string, QuoteSheetFieldValue | undefined>,
  kind: RepeatableKind,
  product?: SheetProduct | string | null,
): number {
  const cap = unitCap(kind, product);
  let highest = 1;
  for (let index = 1; index <= cap; index += 1) {
    if (unitHasValue(values, kind, index)) highest = index;
  }
  return highest;
}

export function fieldsForUnit(kind: RepeatableKind, index: number): Array<RepeatableField & { key: string }> {
  return fieldsForKind(kind).map((field) => ({
    ...field,
    key: repeatableFieldKey(kind, index, field.suffix),
  }));
}
