import type { QuoteSheetFieldValue } from "@/lib/db/schema";
import type { SheetProduct } from "@/lib/quote-sheet/products";

export const PERSONAL_VEHICLE_CAP = 5;
export const COMMERCIAL_VEHICLE_SOFT_CAP = 40;

export type RepeatableKind = "vehicle" | "driver";

export type RepeatableField = {
  suffix: string;
  label: string;
  input?: "text" | "number";
};

export const VEHICLE_BLOCK_FIELDS: RepeatableField[] = [
  { suffix: "vin", label: "VIN" },
  { suffix: "year", label: "Year", input: "number" },
  { suffix: "make", label: "Make" },
  { suffix: "model", label: "Model" },
  { suffix: "usage", label: "Usage" },
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

const VEHICLE_1_KEYS: Record<string, string> = {
  vin: "vin",
  year: "vehicle_year",
  make: "vehicle_make",
  model: "vehicle_model",
  usage: "vehicle_usage",
  garaging_zip: "garaging_zip",
  garaging_address: "garaging_address",
};

export function isCommercialAutoProduct(product?: string | null): boolean {
  return product === "commercial_auto";
}

export function vehicleCap(product?: string | null): number {
  return isCommercialAutoProduct(product) ? COMMERCIAL_VEHICLE_SOFT_CAP : PERSONAL_VEHICLE_CAP;
}

export function canAddAnother(count: number, product?: string | null): boolean {
  if (isCommercialAutoProduct(product)) return true;
  return count < PERSONAL_VEHICLE_CAP;
}

export function repeatableFieldKey(kind: RepeatableKind, index: number, suffix: string): string {
  if (kind === "vehicle" && index === 1) {
    return VEHICLE_1_KEYS[suffix] ?? `vehicle_${suffix}`;
  }
  return `${kind}_${index}_${suffix}`;
}

export function isRepeatableSheetKey(key: string): boolean {
  if (Object.values(VEHICLE_1_KEYS).includes(key)) return true;
  return /^(vehicle|driver)_\d+_(vin|year|make|model|usage|garaging_zip|garaging_address|name|dob|license|status|years_licensed)$/.test(
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
  const fields = kind === "vehicle" ? VEHICLE_BLOCK_FIELDS : DRIVER_BLOCK_FIELDS;
  return fields.some((field) => cellFilled(values[repeatableFieldKey(kind, index, field.suffix)]));
}

/** Always start at vehicle/driver 1. Never open on vehicle 2 alone. */
export function visibleUnitCount(
  values: Record<string, QuoteSheetFieldValue | undefined>,
  kind: RepeatableKind,
  product?: SheetProduct | string | null,
): number {
  const cap = vehicleCap(product);
  let highest = 1;
  for (let index = 1; index <= cap; index += 1) {
    if (unitHasValue(values, kind, index)) highest = index;
  }
  return highest;
}

export function fieldsForUnit(kind: RepeatableKind, index: number): Array<RepeatableField & { key: string }> {
  const fields = kind === "vehicle" ? VEHICLE_BLOCK_FIELDS : DRIVER_BLOCK_FIELDS;
  return fields.map((field) => ({
    ...field,
    key: repeatableFieldKey(kind, index, field.suffix),
  }));
}
