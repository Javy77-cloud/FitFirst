import {
  AUTO_ANNUAL_MILES_OPTIONS,
  AUTO_HOUSEHOLD_EXCLUDE_REASON_OPTIONS,
  AUTO_HOUSEHOLD_RELATIONSHIP_OPTIONS,
  AUTO_HOUSEHOLD_SEPARATE_POLICY_STATUS_OPTIONS,
  AUTO_HOUSEHOLD_STATUS_OPTIONS,
  AUTO_DRIVER_RELATIONSHIP_OPTIONS,
  AUTO_VEHICLE_USAGE_OPTIONS,
  LICENSE_STATUS_OPTIONS,
  VEHICLE_OWNERSHIP_OPTIONS,
  VEHICLE_OWNERSHIP_LENGTH_OPTIONS,
  COMMUTE_DAYS_WEEK_OPTIONS,
  VEHICLE_LIENHOLDER_OPTIONS,
  PASSIVE_RESTRAINT_OPTIONS,
  GENDER_OPTIONS,
  EDUCATION_LEVEL_OPTIONS,
  YES_NO_OPTIONS,
} from "@/lib/quote-sheet/sheet-defaults";
import { INDUSTRY_OPTIONS } from "@/lib/custom-fields/industry-occupation";
import { MARITAL_STATUS_OPTIONS } from "@/lib/quote-sheet/applicant-core";
import type { QuoteSheetFieldValue } from "@/lib/db/schema";
import type { SheetProduct } from "@/lib/quote-sheet/products";

export const PERSONAL_VEHICLE_CAP = 4;
/**
 * Personal Auto allows up to 4 drivers. That cap is not a target:
 * driver count stays independent of how many vehicles are on the sheet.
 */
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
  {
    suffix: "passive_restraints",
    label: "Passive restraints (airbags)?",
    input: "select",
    options: PASSIVE_RESTRAINT_OPTIONS,
  },
  {
    suffix: "garaging_at_residence",
    label: "Garaged at residence?",
    input: "select",
    options: YES_NO_OPTIONS,
  },
  { suffix: "garaging_address", label: "Address" },
  { suffix: "garaging_zip", label: "Garaging ZIP" },
];

export const DRIVER_BLOCK_FIELDS: RepeatableField[] = [
  { suffix: "name", label: "Name" },
  { suffix: "dob", label: "DOB" },
  { suffix: "gender", label: "Gender", input: "select", options: GENDER_OPTIONS },
  { suffix: "industry", label: "Industry", input: "select", options: INDUSTRY_OPTIONS },
  { suffix: "occupation", label: "Occupation", input: "select" },
  { suffix: "education_level", label: "Education level", input: "select", options: EDUCATION_LEVEL_OPTIONS },
  { suffix: "marital_status", label: "Marital status", input: "select", options: MARITAL_STATUS_OPTIONS },
  {
    suffix: "relationship",
    label: "Relationship",
    input: "select",
    options: AUTO_DRIVER_RELATIONSHIP_OPTIONS,
  },
  { suffix: "license", label: "License" },
  { suffix: "status", label: "License status", input: "select", options: LICENSE_STATUS_OPTIONS },
  { suffix: "years_licensed", label: "Years licensed", input: "number" },
  {
    suffix: "household_status",
    label: "Household status",
    input: "select",
    options: AUTO_HOUSEHOLD_STATUS_OPTIONS,
  },
  {
    suffix: "exclude_reason",
    label: "Exclude reason",
    input: "select",
    options: AUTO_HOUSEHOLD_EXCLUDE_REASON_OPTIONS,
  },
  { suffix: "age_first_licensed", label: "Age first licensed" },
  {
    suffix: "suspension_5yr",
    label: "Suspension in last 5 years",
    input: "select",
    options: YES_NO_OPTIONS,
  },
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
  garaging_at_residence: "garaging_at_residence",
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

/** Auto keeps at least one vehicle and one driver (household members too). */
export function canRemoveUnit(count: number): boolean {
  return count > 1;
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
  return /^(vehicle|driver|household)_\d+_(vin|year|make|model|body_class|fuel_type|engine|usage|ownership|ownership_length|lienholder|lienholder_other|purchased_new|original_cost_new|annual_miles|commute_days_week|commute_miles_daily|rideshare|aftermarket_parts|garaging_at_residence|garaging_zip|garaging_address|name|dob|gender|industry|occupation|education_level|marital_status|license|status|years_licensed|relationship|household_status|exclude_reason|separate_auto_policy|separate_policy_status|age_first_licensed|suspension_5yr)$/.test(
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

/** Fingerprint of stored unit values. Drivers and vehicles are hashed separately. */
export function repeatableUnitSignature(
  values: Record<string, { value?: string } | undefined>,
  kind: RepeatableKind,
  product?: SheetProduct | string | null,
): string {
  const cap = unitCap(kind, product);
  const chunks: string[] = [];
  for (let index = 1; index <= cap; index += 1) {
    for (const field of fieldsForKind(kind)) {
      chunks.push(values[repeatableFieldKey(kind, index, field.suffix)]?.value?.trim() ?? "");
    }
  }
  if (kind === "driver") chunks.push(values[AUTO_DRIVER_COUNT_KEY]?.value?.trim() ?? "");
  return chunks.join("\u001f");
}

/**
 * Saved Auto driver-card count. Not a risk field and not derived from vehicles.
 * Fill / Gemini / household sync must not raise it. Add driver and Remove driver do.
 */
export const AUTO_DRIVER_COUNT_KEY = "auto_driver_count";

export function clampDriverCount(count: number): number {
  if (!Number.isFinite(count)) return 1;
  return Math.min(PERSONAL_DRIVER_CAP, Math.max(1, Math.round(count)));
}

export function readStoredDriverCount(
  values: Record<string, { value?: string } | undefined> | null | undefined,
): number | null {
  const raw = values?.[AUTO_DRIVER_COUNT_KEY]?.value?.trim() ?? "";
  if (!raw) return null;
  const count = Number(raw);
  if (!Number.isFinite(count)) return null;
  return clampDriverCount(count);
}

/** A named driver, or an explicit saved count, is the roster. Empty sheets are not. */
export function driverRosterEstablished(
  values: Record<string, { value?: string } | undefined>,
): boolean {
  if (readStoredDriverCount(values) != null) return true;
  for (let index = 1; index <= PERSONAL_DRIVER_CAP; index += 1) {
    const name = values[repeatableFieldKey("driver", index, "name")]?.value?.trim() ?? "";
    if (name) return true;
  }
  return false;
}

/**
 * Driver cards the agent already established.
 * A saved count wins over stray higher driver rows. Otherwise the filled rows.
 * Vehicle count is not an input.
 */
export function establishedDriverCount(
  values: Record<string, { value?: string } | undefined>,
): number {
  const stored = readStoredDriverCount(values);
  if (stored != null) return stored;
  return visibleUnitCount(values as Record<string, QuoteSheetFieldValue | undefined>, "driver");
}

export function stampDriverCount<T extends Record<string, QuoteSheetFieldValue>>(
  values: T,
  count: number,
): T {
  return {
    ...values,
    [AUTO_DRIVER_COUNT_KEY]: {
      value: String(clampDriverCount(count)),
      status: "confirmed",
      source: "agent",
    },
  };
}

/** Clear driver cards above the established count. Does not read vehicle keys. */
export function blankDriverUnitsAbove<T extends Record<string, QuoteSheetFieldValue>>(
  values: T,
  count: number,
): T {
  const ceiling = clampDriverCount(count);
  let next: T | null = null;
  for (let index = ceiling + 1; index <= PERSONAL_DRIVER_CAP; index += 1) {
    for (const field of DRIVER_BLOCK_FIELDS) {
      const key = repeatableFieldKey("driver", index, field.suffix);
      if (!(values[key]?.value ?? "").trim()) continue;
      if (!next) next = { ...values };
      next[key as keyof T] = { value: "", status: "missing", source: "blank" } as T[keyof T];
    }
  }
  return next ?? values;
}

/**
 * Fill / Gemini ceiling.
 * An empty roster may receive named drivers from the first extract.
 * Once a roster exists, later fills stay inside that count — they do not
 * open a card per vehicle or per extra extracted person.
 */
export function enforceEstablishedDriverCeiling<T extends Record<string, QuoteSheetFieldValue>>(
  before: T,
  after: T,
): T {
  if (!driverRosterEstablished(before)) {
    if (!driverRosterEstablished(after)) return after;
    return stampDriverCount(after, visibleUnitCount(after, "driver"));
  }
  const ceiling = establishedDriverCount(before);
  return stampDriverCount(blankDriverUnitsAbove(after, ceiling), ceiling);
}

/**
 * Cards to show for one block. Driver count never consults vehicle count.
 * A saved driver count hides leaked higher rows. A saved blank Add stays
 * after refresh. Vehicle blocks ignore the driver count key.
 */
export function initialRepeatableCount(
  values: Record<string, QuoteSheetFieldValue | undefined>,
  kind: RepeatableKind,
  product?: SheetProduct | string | null,
): number {
  if (kind === "driver") {
    const stored = readStoredDriverCount(values);
    if (stored != null) return stored;
  }
  return visibleUnitCount(values, kind, product);
}

/**
 * Server side of shownRepeatableCount for a single block.
 * Pass only this block's values count — never Math.max it with the other block.
 */
export function repeatableBlockServerCount(
  values: Record<string, QuoteSheetFieldValue | undefined>,
  kind: RepeatableKind,
  product: SheetProduct | string | null | undefined,
  serverChanged: boolean,
): number {
  const visible = visibleUnitCount(values, kind, product);
  if (kind !== "driver") return visible;
  const stored = readStoredDriverCount(values);
  if (stored == null) return visible;
  if (serverChanged) return stored;
  return Math.min(visible, stored);
}

/**
 * After save, fill, or refresh, the server count wins so a removed driver stays gone.
 * A local Add can still hold a blank card while the server snapshot is unchanged.
 * `localCount` and `serverCount` are the same block (both drivers, or both vehicles).
 * Do not pass a vehicle count into a driver call or the reverse.
 */
export function shownRepeatableCount(
  localCount: number,
  serverCount: number,
  serverChanged: boolean,
): number {
  if (serverChanged) return Math.max(1, serverCount);
  return Math.max(localCount, serverCount, 1);
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
  return fieldsForKind(kind)
    .filter((field) => !(kind === "driver" && field.suffix === "relationship" && index === 1))
    .map((field) => ({
      ...field,
      key: repeatableFieldKey(kind, index, field.suffix),
    }));
}

/**
 * Sheet writes for removing one card.
 * Later cards shift down so an empty middle slot cannot reopen on save.
 * The last card is blanked. Returns null when the last remaining card cannot be removed.
 * `snapshots` is 1-based: `snapshots[index][suffix]` is the current field text.
 */
export function repeatableRemovalWrites(
  kind: RepeatableKind,
  count: number,
  removeIndex: number,
  snapshots: Array<Record<string, string> | undefined>,
): Record<string, string> | null {
  if (!canRemoveUnit(count) || removeIndex < 1 || removeIndex > count) return null;
  const writes: Record<string, string> = {};
  for (let index = removeIndex; index <= count; index += 1) {
    const source = snapshots[index + 1];
    for (const field of fieldsForUnit(kind, index)) {
      writes[field.key] = source?.[field.suffix] ?? "";
    }
  }
  return writes;
}
