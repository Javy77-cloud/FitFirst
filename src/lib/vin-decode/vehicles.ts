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
