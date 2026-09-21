import type { QuoteSheetFieldValue } from "@/lib/db/schema";
import {
  PERSONAL_VEHICLE_CAP,
  repeatableFieldKey,
  unitHasValue,
  vehicleCap,
} from "@/lib/quote-sheet/repeatable-units";
import { isDecodableVin, normalizeVin } from "./normalize";
import type { VinSheetKeyBag } from "./types";

export type SheetVehicleVin = {
  index: number;
  vin: string;
  vinKey: string;
  keys: VinSheetKeyBag;
};

/** Collect decodable VINs from Auto sheet vehicle units (personal + soft commercial cap). */
export function collectSheetVehicleVins(
  values: Record<string, QuoteSheetFieldValue | undefined>,
  product?: string | null,
): SheetVehicleVin[] {
  const cap = Math.max(vehicleCap(product), PERSONAL_VEHICLE_CAP);
  const found: SheetVehicleVin[] = [];
  for (let index = 1; index <= cap; index += 1) {
    const vinKey = repeatableFieldKey("vehicle", index, "vin");
    const raw = values[vinKey]?.value;
    if (!isDecodableVin(raw)) {
      if (index > 1 && !unitHasValue(values, "vehicle", index)) break;
      continue;
    }
    // Fuel / body / engine use catalog keys when present on unit 1 / vehicle_N_*.
    // Usage / ownership / lienholder / OCN / annual miles are not vPIC data — omitted.
    // Safety sheet home is left for a follow-up tip (mapper still accepts keys.safety).
    const keys: VinSheetKeyBag = {
      year: repeatableFieldKey("vehicle", index, "year"),
      make: repeatableFieldKey("vehicle", index, "make"),
      model: repeatableFieldKey("vehicle", index, "model"),
      fuel: repeatableFieldKey("vehicle", index, "fuel_type"),
      bodyClass: repeatableFieldKey("vehicle", index, "body_class"),
      engine: repeatableFieldKey("vehicle", index, "engine"),
    };
    found.push({
      index,
      vin: normalizeVin(raw),
      vinKey,
      keys,
    });
  }
  return found;
}

/** Sheet keys that hold a vehicle VIN (unit 1 is `vin`, later units `vehicle_N_vin`). */
export function isVehicleVinSheetKey(key: string): boolean {
  return key === "vin" || /^vehicle_\d+_vin$/.test(key);
}

const VIN_CORE_SUFFIXES = ["year", "make", "model", "body_class", "fuel_type", "engine"] as const;

/**
 * Blank year / make / model / body / fuel / engine cells on units that already
 * have a decodable VIN. A later save must decode again — the VIN itself may
 * be unchanged after a failed or wiped fill.
 */
export function blankVinCoreFacts(
  values: Record<string, QuoteSheetFieldValue | undefined>,
  product?: string | null,
): string[] {
  const blank: string[] = [];
  for (const vehicle of collectSheetVehicleVins(values, product)) {
    for (const suffix of VIN_CORE_SUFFIXES) {
      const key = repeatableFieldKey("vehicle", vehicle.index, suffix);
      if (!String(values[key]?.value ?? "").trim()) blank.push(key);
    }
  }
  return blank;
}

/** Decode when a VIN was set/changed, or core vehicle facts are still blank. */
export function shouldRunVinDecode(
  before: Record<string, { value?: string | null } | undefined>,
  after: Record<string, QuoteSheetFieldValue | undefined>,
  product?: string | null,
): boolean {
  return (
    decodableVinsChanged(before, after, product).length > 0 ||
    blankVinCoreFacts(after, product).length > 0
  );
}

/**
 * Copy decodable VINs from the open Risk Profile into the sheet snapshot.
 * Used when Decode VIN runs before Save. Does not touch other cells.
 */
export function overlayFormVins(
  values: Record<string, QuoteSheetFieldValue>,
  formVins: Record<string, string> | undefined,
): { values: Record<string, QuoteSheetFieldValue>; changed: boolean } {
  if (!formVins) return { values, changed: false };
  const next: Record<string, QuoteSheetFieldValue> = { ...values };
  let changed = false;
  for (const [key, raw] of Object.entries(formVins)) {
    if (!isVehicleVinSheetKey(key) || !isDecodableVin(raw)) continue;
    const vin = normalizeVin(raw);
    if (normalizeVin(next[key]?.value) === vin) continue;
    next[key] = { value: vin, status: "confirmed", source: "agent" };
    changed = true;
  }
  return { values: next, changed };
}

/**
 * Decodable VINs that were set or changed between two sheet snapshots.
 * Same normalized VIN is not a change. Clearing a VIN is not a decode trigger.
 */
export function decodableVinsChanged(
  before: Record<string, { value?: string | null } | undefined>,
  after: Record<string, { value?: string | null } | undefined>,
  product?: string | null,
): string[] {
  const cap = Math.max(vehicleCap(product), PERSONAL_VEHICLE_CAP);
  const changed: string[] = [];
  for (let index = 1; index <= cap; index += 1) {
    const vinKey = repeatableFieldKey("vehicle", index, "vin");
    const prev = normalizeVin(before[vinKey]?.value);
    const next = normalizeVin(after[vinKey]?.value);
    if (isDecodableVin(next) && next !== prev) changed.push(vinKey);
  }
  return changed;
}
