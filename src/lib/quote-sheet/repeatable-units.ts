import {
  AUTO_ANNUAL_MILES_OPTIONS,
  AUTO_HOUSEHOLD_RELATIONSHIP_OPTIONS,
  AUTO_HOUSEHOLD_STATUS_OPTIONS,
  AUTO_VEHICLE_USAGE_OPTIONS,
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
  { suffix: "usage", label: "Usage", input: "select", options: AUTO_VEHICLE_USAGE_OPTIONS },
  {
    suffix: "annual_miles",
    label: "Annual miles",
    input: "select",
    options: AUTO_ANNUAL_MILES_OPTIONS,
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
];

const VEHICLE_1_KEYS: Record<string, string> = {
  vin: "vin",
  year: "vehicle_year",
  make: "vehicle_make",
  model: "vehicle_model",
  usage: "vehicle_usage",
  annual_miles: "annual_miles",
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
  return /^(vehicle|driver|household)_\d+_(vin|year|make|model|usage|annual_miles|rideshare|aftermarket_parts|garaging_zip|garaging_address|name|dob|license|status|years_licensed|relationship)$/.test(
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
